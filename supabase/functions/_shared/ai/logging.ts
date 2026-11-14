import type { DomainEnumValue } from '../../../../packages/contracts/src/enums.ts';
import type { ModuleName } from '../../../../packages/contracts/src/ai/index.ts';
import type { ModelResponse, ValidationCode } from './types.ts';

export type InferenceLogInput = {
  jobId: string;
  module: ModuleName;
  promptVersion: string;
  attempt: number;
  requestedModel: string;
  outcome: DomainEnumValue<'inference_outcome'>;
  response: ModelResponse | null;
  latencyMs: number;
  validationErrors?: readonly ValidationCode[];
  injectionSuspected?: boolean;
};
export function buildInferenceLog(input: InferenceLogInput) {
  return {
    job_id: input.jobId,
    module: input.module,
    prompt_version: input.promptVersion,
    attempt: input.attempt,
    model: input.response?.actualModel ?? input.requestedModel,
    input_tokens: input.response?.usage?.inputTokens ?? null,
    output_tokens: input.response?.usage?.outputTokens ?? null,
    latency_ms: input.latencyMs,
    outcome: input.outcome,
    validation_errors: input.validationErrors ? [...input.validationErrors] : null,
    injection_suspected: input.injectionSuspected ?? false,
    estimated_cost_usd: null,
  };
}
export type InferenceLog = ReturnType<typeof buildInferenceLog>;
