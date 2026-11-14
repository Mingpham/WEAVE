import { buildInferenceLog, type InferenceLog } from '../_shared/ai/logging.ts';
import { ModelError } from '../_shared/ai/openrouter.ts';
import { validateOutput } from '../_shared/ai/validation.ts';
import type { ModelResponse } from '../_shared/ai/types.ts';
import { nextRetry, type RetryClass } from './retry.ts';
import { POL } from '../../../packages/contracts/src/policy.ts';
import type { QueueMessage, WorkerDeps, ProcessOutcome, ValidatedResult } from './ports.ts';
import { ModulePreparationError } from './ports.ts';

export async function processJob(message: QueueMessage, deps: WorkerDeps): Promise<ProcessOutcome> {
  const { store } = deps;
  const peek = await store.peekJob({ job_id: message.job_id });
  if (!peek || ['SUCCEEDED', 'DEAD', 'DISCARDED_STALE'].includes(peek.status)) {
    await store.ack({ message_id: message.message_id });
    return 'SKIPPED';
  }
  const handler = deps.registry[peek.type];
  if (!handler || handler.module !== peek.type.toLowerCase()) return 'MODULE_NOT_READY';
  const claim = await store.claim(message);
  if (claim.kind === 'BUSY') return 'SKIPPED';
  if (claim.kind === 'TERMINAL') {
    await store.ack({ message_id: message.message_id });
    return 'SKIPPED';
  }
  if (claim.kind !== 'CLAIMED') return 'SKIPPED';
  const { job, lease } = claim;
  const identity = { job_id: job.id, lease };
  const finish = async (code: string): Promise<ProcessOutcome> => {
    await store.finishFailure({ ...identity, error_code: code, fallback_kind: handler.module });
    await store.ack({ message_id: message.message_id });
    return 'DEAD';
  };
  // Crash recovery can deliver an exhausted job without passing through nextRetry.
  // Use the claimed (fenced) attempt, never the non-atomic peek, to protect inference.
  if (job.attempts > POL.JOB_MAX_ATTEMPTS) return finish('ATTEMPTS_EXHAUSTED');
  let current = await store.loadContext(identity);
  let prepared;
  try {
    prepared = handler.prepare(current, job);
  } catch (error) {
    if (error instanceof ModulePreparationError) return finish(error.code);
    throw error;
  }
  if (prepared.request.module !== handler.module || prepared.context.module !== handler.module)
    throw new Error('INVALID_MODULE_HANDLER');
  const budget = await store.reserveInference({ ...identity, attempt: job.attempts });
  if (budget !== 'ALLOWED') return finish(budget);
  const failed = async (
    code: string,
    kind: RetryClass,
    log: InferenceLog,
  ): Promise<ProcessOutcome> => {
    await store.appendInferenceLog(log);
    const schemaFailures = claim.schema_id_failures + (kind === 'SCHEMA' || kind === 'ID' ? 1 : 0);
    const retry = nextRetry(kind, job.attempts, schemaFailures);
    if (!retry.retry) return finish(code);
    await store.scheduleRetry({
      ...identity,
      error_code: code,
      delay_ms: retry.delayMs,
      schema_id_failures: schemaFailures,
    });
    return 'RETRY_SCHEDULED';
  };
  const started = deps.nowMs();
  const logBase = {
    jobId: job.id,
    module: handler.module,
    promptVersion: handler.promptVersion,
    attempt: job.attempts,
    requestedModel: deps.modelId,
  };
  let response: ModelResponse;
  try {
    response = await deps.model.complete(prepared.request);
  } catch (cause) {
    const error = cause instanceof ModelError ? cause : new ModelError('NETWORK_ERROR');
    const kind: RetryClass =
      error.code === 'SCHEMA_RESPONSE'
        ? 'SCHEMA'
        : ['TIMEOUT', 'NETWORK_ERROR', 'CANCELLED'].includes(error.code) ||
            error.status === 429 ||
            (error.status !== null && error.status >= 500)
          ? 'TRANSIENT'
          : 'PERMANENT';
    const outcome =
      error.code === 'TIMEOUT'
        ? 'TIMEOUT'
        : error.code === 'SCHEMA_RESPONSE'
          ? 'SCHEMA_INVALID'
          : 'HTTP_ERROR';
    return failed(
      error.code,
      kind,
      buildInferenceLog({
        ...logBase,
        outcome,
        response: null,
        latencyMs: Math.max(0, deps.nowMs() - started),
      }),
    );
  }
  const base = { ...logBase, response, latencyMs: response.latencyMs };
  for (let commitAttempt = 0; commitAttempt < 3; commitAttempt++) {
    // Preserve original aliases: rebuilding them could silently map an old answer to different IDs.
    const context = { ...prepared.context, snapshot: current.snapshot, now: current.now };
    const validated = validateOutput(response.rawContent, context, handler.validators);
    if (!validated.ok) {
      const kind: RetryClass =
        validated.code === 'SCHEMA_INVALID'
          ? 'SCHEMA'
          : validated.code === 'ID_NOT_ALLOWED'
            ? 'ID'
            : handler.module === 'plan_compose' && validated.code === 'BUSINESS_REJECTED'
              ? 'TRANSIENT'
              : 'PERMANENT';
      const outcome =
        kind === 'SCHEMA' ? 'SCHEMA_INVALID' : kind === 'ID' ? 'ID_NOT_ALLOWED' : 'POLICY_REJECTED';
      return failed(
        validated.code,
        kind,
        buildInferenceLog({ ...base, outcome, validationErrors: [validated.code] }),
      );
    }
    const inference_log = buildInferenceLog({
      ...base,
      outcome: 'OK',
      injectionSuspected:
        'injection_suspected' in validated.value && validated.value.injection_suspected,
    });
    let derived;
    try {
      derived = handler.derive(validated.value, current, prepared.context.aliases);
    } catch {
      return failed('DERIVATION_FAILED', 'PERMANENT', {
        ...inference_log,
        outcome: 'POLICY_REJECTED',
      });
    }
    const result = await store.commitResult({
      ...identity,
      expected_state_version: current.state_version,
      basis_revision: job.basis_revision,
      validated_result: { module: handler.module, output: validated.value } as ValidatedResult,
      derived_changes: derived,
      inference_log,
    });
    if (result === 'LEASE_LOST') {
      await store.appendInferenceLog({ ...inference_log, outcome: 'STALE_DISCARDED' });
      return 'SKIPPED';
    }
    if (result !== 'VERSION_CONFLICT') {
      await store.ack({ message_id: message.message_id });
      return result === 'STALE'
        ? 'DISCARDED_STALE'
        : result === 'ALREADY_COMMITTED'
          ? 'SKIPPED'
          : 'SUCCEEDED';
    }
    if (commitAttempt < 2) current = await store.loadContext(identity);
  }
  // No model re-call for unrelated project version churn. Persist failure and expose manual recovery.
  return failed(
    'VERSION_CONFLICT',
    'PERMANENT',
    buildInferenceLog({ ...base, outcome: 'POLICY_REJECTED' }),
  );
}
