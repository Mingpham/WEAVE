import type {
  AnalysisJob,
  JobType,
  ModuleName,
  ModuleOutput,
} from '../../../packages/contracts/src/ai/index.ts';
import type { InferenceLog } from '../_shared/ai/logging.ts';
import type { AliasMap } from '../_shared/ai/aliases.ts';
import type { PlanDraft } from '../../../packages/contracts/src/plan.ts';
import type {
  ModelPort,
  ModelRequest,
  ModuleValidators,
  ValidationContext,
} from '../_shared/ai/types.ts';

export type QueueMessage = { job_id: string; message_id: string };
export type ProcessOutcome =
  'SUCCEEDED' | 'DISCARDED_STALE' | 'RETRY_SCHEDULED' | 'DEAD' | 'SKIPPED' | 'MODULE_NOT_READY';
export type JobContext = {
  state_version: number;
  basis_revision: number | null;
  snapshot: Readonly<Record<string, unknown>>;
  now: string;
};
/** Internal proposal; the DB lane must review its atomic persistence mapping before deployment. */
export type DerivedChanges =
  | { kind: 'NONE' }
  | {
      kind: 'PLAN_DRAFT';
      draft_id: string;
      expected_revision: number;
      status: 'EDITING';
      draft: PlanDraft;
      reply: string;
      change_summary: ModuleOutput<'plan_compose'>['change_summary'];
      prompt_version: string;
    };
export class ModulePreparationError extends Error {
  constructor(readonly code: 'PLAN_CONTEXT_INVALID' | 'PLAN_MODE_INVALID' | 'PLAN_TURN_LIMIT') {
    super(code);
    this.name = 'ModulePreparationError';
  }
}
export type ValidatedResult = {
  [M in ModuleName]: { module: M; output: ModuleOutput<M> };
}[ModuleName];
export type CommitInput = {
  job_id: string;
  lease: string;
  expected_state_version: number;
  basis_revision: number | null;
  validated_result: ValidatedResult;
  derived_changes: DerivedChanges;
  inference_log: InferenceLog;
};
export interface WorkerStore {
  receive(input: { limit: number; visibility_timeout_sec: number }): Promise<QueueMessage[]>;
  peekJob(input: { job_id: string }): Promise<AnalysisJob | null>;
  /** Atomically terminalize exhausted jobs with manual fallback; never grant another inference attempt. */
  claim(
    input: QueueMessage,
  ): Promise<
    | { kind: 'CLAIMED'; job: AnalysisJob; lease: string; schema_id_failures: number }
    | { kind: 'BUSY' | 'TERMINAL' }
  >;
  reserveInference(input: {
    job_id: string;
    lease: string;
    attempt: number;
  }): Promise<'ALLOWED' | 'AI_DISABLED' | 'BUDGET_EXCEEDED'>;
  loadContext(input: { job_id: string; lease: string }): Promise<JobContext>;
  appendInferenceLog(log: InferenceLog): Promise<void>;
  /** Commit/stale transition and inference log are atomic; conflicts do not append logs. */
  commitResult(
    input: CommitInput,
  ): Promise<'COMMITTED' | 'ALREADY_COMMITTED' | 'STALE' | 'VERSION_CONFLICT' | 'LEASE_LOST'>;
  scheduleRetry(input: {
    job_id: string;
    lease: string;
    error_code: string;
    delay_ms: number;
    schema_id_failures: number;
  }): Promise<void>;
  finishFailure(input: {
    job_id: string;
    lease: string;
    error_code: string;
    fallback_kind: ModuleName;
  }): Promise<void>;
  ack(input: { message_id: string }): Promise<void>;
  /** Fence old leases; attempts at the limit become DEAD with fallback, not another inference. */
  recoverExpired(input: { now: number; limit: number }): Promise<void>;
}
export interface ModuleHandler {
  module: ModuleName;
  promptVersion: string;
  prepare(
    context: JobContext,
    job: AnalysisJob,
  ): { request: ModelRequest; context: ValidationContext };
  validators: ModuleValidators;
  derive(
    value: ModuleOutput<ModuleName>,
    current: JobContext,
    originalAliases: AliasMap,
  ): DerivedChanges;
}
export type ModuleRegistry = Readonly<Partial<Record<JobType, ModuleHandler>>>;
export type WorkerDeps = {
  store: WorkerStore;
  model: ModelPort;
  modelId: string;
  registry: ModuleRegistry;
  nowMs: () => number;
};
