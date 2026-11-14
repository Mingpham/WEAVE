import { expect, it } from 'vitest';
import { buildInferenceLog } from '../logging.ts';

it('INV-12 logs only allowlisted inference metadata, never content or credentials', () => {
  const response = { rawContent: 'api-key-sentinel jwt-sentinel signed-url-sentinel', requestedModel: 'test/model', actualModel: 'test/model', requestId: 'generation-1', usage: null, latencyMs: 42, extra: 'private' };
  const log = buildInferenceLog({ jobId: 'job-1', module: 'event_summarize', promptVersion: 'v1', attempt: 1, requestedModel: 'test/model', outcome: 'OK', response, latencyMs: 42 });
  expect(log).toMatchObject({ job_id: 'job-1', module: 'event_summarize', input_tokens: null, output_tokens: null, estimated_cost_usd: null, latency_ms: 42 });
  expect(JSON.stringify(log)).not.toMatch(/sentinel|private|rawContent/);
});
it('records failed calls without fabricating tokens or cost', () => {
  expect(buildInferenceLog({ jobId: 'job-1', module: 'event_summarize', promptVersion: 'v1', attempt: 2, requestedModel: 'test/model', outcome: 'TIMEOUT', response: null, latencyMs: 35000 })).toMatchObject({ outcome: 'TIMEOUT', attempt: 2, model: 'test/model', input_tokens: null, output_tokens: null, estimated_cost_usd: null });
});
