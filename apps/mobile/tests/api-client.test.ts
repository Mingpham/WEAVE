import {describe, expect, it, vi} from 'vitest';
import {z} from 'zod';
import {ApiClient} from '../src/lib/api-client';
import {localToUtc} from '../src/lib/event-time';

describe('live API transport', () => {
  it('requires a session and never sends unauthenticated business requests', async () => {
    const transport = vi.fn();
    const api = new ApiClient('https://example.com/api', 'public-key', async () => null, transport);
    await expect(api.request('/me', z.object({}))).rejects.toMatchObject({code: 'UNAUTHENTICATED'});
    expect(transport).not.toHaveBeenCalled();
  });
  it('preserves API failures and rejects malformed success responses', async () => {
    const transport = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error: {code: 'FORBIDDEN'}}), {status: 403}))
      .mockResolvedValueOnce(new Response(JSON.stringify({data: {ok: 'wrong'}})));
    const api = new ApiClient('https://example.com/api', 'public-key', async () => 'token', transport);
    await expect(api.request('/me', z.object({ok: z.boolean()}))).rejects.toMatchObject({code: 'FORBIDDEN'});
    await expect(api.request('/me', z.object({ok: z.boolean()}))).rejects.toMatchObject({code: 'INTERNAL'});
  });
  it('forwards a stable mutation key and reports network failure without success', async () => {
    const transport = vi.fn().mockRejectedValue(new TypeError('network unavailable'));
    const api = new ApiClient('https://example.com/api', 'public-key', async () => 'token', transport);
    await expect(api.request('/projects', z.object({}), {method: 'POST', key: 'same-key', body: {}})).rejects.toMatchObject({code: 'NETWORK_ERROR'});
    expect(new Headers(transport.mock.calls[0]![1].headers).get('X-Idempotency-Key')).toBe('same-key');
  });
});
describe('event timezone conversion', () => {
  it('uses the event timezone rather than the device timezone', () => {
    expect(localToUtc('2026-12-01T08:30', 'Asia/Ho_Chi_Minh')).toBe('2026-12-01T01:30:00.000Z');
    expect(localToUtc('2026-12-01T08:30', 'America/New_York')).toBe('2026-12-01T13:30:00.000Z');
  });
  it('rejects invalid calendar input and nonexistent DST times', () => {
    expect(() => localToUtc('2026-02-30T08:00', 'UTC')).toThrow();
    expect(() => localToUtc('2026-03-08T02:30', 'America/New_York')).toThrow();
  });
});
