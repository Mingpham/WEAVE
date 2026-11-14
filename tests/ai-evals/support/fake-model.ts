import type { ModelPort, ModelResponse } from '../../../supabase/functions/_shared/ai/types.ts';
export const modelResponse: ModelResponse = {
  rawContent: JSON.stringify({
    headline: 'Book exchange completed',
    went_well: [],
    went_wrong: [],
    lessons: [],
  }),
  requestedModel: 'test/model',
  actualModel: 'test/model',
  requestId: 'test-1',
  usage: { inputTokens: 10, outputTokens: 5 },
  latencyMs: 5,
};
export function fakeModel(complete: ModelPort['complete'] = async () => modelResponse): ModelPort {
  return { complete };
}
