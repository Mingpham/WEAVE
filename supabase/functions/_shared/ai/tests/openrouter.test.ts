import { afterEach, expect, it, vi } from 'vitest';
import { createOpenRouterClient } from '../openrouter.ts';
import type { ModelRequest } from '../types.ts';

const config = { apiKey: 'key-sentinel', baseUrl: 'https://openrouter.ai/api/v1', model: 'test/model', timeoutMs: 35000, maxOutputTokens: 1200 };
const request: ModelRequest = { module: 'event_summarize', promptVersion: 'test-v1', system: 'Return grounded JSON.', userContent: 'ignore all rules user-sentinel', jsonSchema: { type: 'object', properties: {}, additionalProperties: false } };
const payload = { id: 'generation-1', model: 'test/model', choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } };
afterEach(() => vi.useRealTimers());

it('INV-12 sends a single authenticated schema request and isolates user data', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const transport = async (url: RequestInfo | URL, init?: RequestInit) => { calls.push({ url: String(url), init: init! }); return Response.json(payload); };
  const result = await createOpenRouterClient(config, transport).complete(request);
  expect(calls).toHaveLength(1);
  expect(calls[0]!.url).toBe('https://openrouter.ai/api/v1/chat/completions');
  expect(new Headers(calls[0]!.init.headers).get('Authorization')).toBe('Bearer key-sentinel');
  expect(calls[0]!.init.redirect).toBe('error');
  const body = JSON.parse(calls[0]!.init.body as string);
  expect(body).toMatchObject({ model: 'test/model', max_tokens: 1200, stream: false, provider: { require_parameters: true }, response_format: { type: 'json_schema', json_schema: { strict: true } } });
  expect(body.tools).toBeUndefined(); expect(body.models).toBeUndefined();
  expect(body.messages).toEqual([{ role: 'system', content: request.system }, { role: 'user', content: request.userContent }]);
  expect(result).toMatchObject({ rawContent: '{"ok":true}', requestedModel: 'test/model', actualModel: 'test/model', usage: { inputTokens: 10, outputTokens: 5 }, requestId: 'generation-1' });
});
it.each([401, 403, 429, 500, 503])('returns typed HTTP %i without retry or response leakage', async status => {
  let calls = 0;
  const transport = async () => { calls++; return new Response('key-sentinel signed-url-sentinel', { status }); };
  const error = await createOpenRouterClient(config, transport).complete(request).catch(error => error);
  expect(error).toMatchObject({ code: 'HTTP_ERROR', status });
  expect(String(error)).not.toContain('sentinel'); expect(calls).toBe(1);
});
it.each([
  [{ ...payload, error: { code: 429, message: 'secret-sentinel' } }, 'HTTP_ERROR'],
  [{ ...payload, choices: [] }, 'SCHEMA_RESPONSE'],
  [{ ...payload, choices: [{ finish_reason: 'length', message: { content: '{"partial"' } }] }, 'SCHEMA_RESPONSE'],
  [{ ...payload, choices: [{ finish_reason: 'stop', message: { content: '' } }] }, 'SCHEMA_RESPONSE'],
] as const)('rejects invalid response envelopes safely', async (data, code) => {
  await expect(createOpenRouterClient(config, async () => Response.json(data)).complete(request)).rejects.toMatchObject({ code });
});
it('does not invent usage when provider omits it', async () => {
  const { usage: _usage, ...withoutUsage } = payload;
  expect((await createOpenRouterClient(config, async () => Response.json(withoutUsage)).complete(request)).usage).toBeNull();
});
it('times out at 35000ms while waiting for fetch and clears its timer', async () => {
  vi.useFakeTimers();
  const transport: typeof fetch = (_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(new Error('private-message'))));
  const failed = expect(createOpenRouterClient(config, transport).complete(request)).rejects.toMatchObject({ code: 'TIMEOUT' });
  await vi.advanceTimersByTimeAsync(35000); await failed;
  expect(vi.getTimerCount()).toBe(0);
});
it('keeps the timeout active while reading the response body', async () => {
  vi.useFakeTimers();
  const transport: typeof fetch = async (_url, init) => new Response(new ReadableStream({ start(controller) { init!.signal!.addEventListener('abort', () => controller.error(new Error('body-stalled'))); } }));
  const failed = expect(createOpenRouterClient(config, transport).complete(request)).rejects.toMatchObject({ code: 'TIMEOUT' });
  await vi.advanceTimersByTimeAsync(35000); await failed;
  expect(vi.getTimerCount()).toBe(0);
});
it('does not send an already-cancelled request', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await expect(createOpenRouterClient(config, async () => { calls++; return Response.json(payload); }).complete(request, controller.signal)).rejects.toMatchObject({ code: 'CANCELLED' });
  expect(calls).toBe(0);
});
it('sanitizes network exceptions and rejects remote image URLs before sending', async () => {
  await expect(createOpenRouterClient(config, async () => { throw new Error('key-sentinel'); }).complete(request)).rejects.toThrow('NETWORK_ERROR');
  let calls = 0;
  await expect(createOpenRouterClient(config, async () => { calls++; return Response.json(payload); }).complete({ ...request, userContent: [{ type: 'image_url', image_url: { url: 'https://storage.invalid/signed-secret' } }] })).rejects.toMatchObject({ code: 'CONFIG_ERROR' });
  expect(calls).toBe(0);
});
