import { describe, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('./supabase.ts', () => ({ userClient: vi.fn(() => ({ rpc })) }));
import { membershipOperation } from './membership.ts';
const cfg = { url: 'http://localhost', publishableKey: 'anon', serviceRoleKey: 'service' };
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  jwt: 'token',
  email: null,
  isAnonymous: true,
};
describe('membership RPC boundary', () => {
  it('maps disabled legacy invite response to the public null contract', async () => {
    rpc.mockResolvedValueOnce({
      data: { data: { code: null, expires_at: null, deep_link: null }, meta: { state_version: 2 } },
      error: null,
    });
    await expect(
      membershipOperation(cfg, user, 'INVITE', { action: 'DISABLE' }, 'key', 'pid'),
    ).resolves.toEqual({ data: null, stateVersion: 2 });
    expect(rpc).toHaveBeenCalledWith('manage_project_invite', {
      p_project_id: 'pid',
      p_action: 'DISABLE',
      p_idempotency_key: 'key',
    });
  });
  it('preserves recognized DB errors and hides internal messages', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'INVITE_INVALID' } });
    await expect(membershipOperation(cfg, user, 'JOIN', {}, 'key')).rejects.toMatchObject({
      code: 'INVITE_INVALID',
    });
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'secret database detail' } });
    await expect(membershipOperation(cfg, user, 'JOIN', {}, 'key')).rejects.toMatchObject({
      code: 'INTERNAL',
    });
  });
});
