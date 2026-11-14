import type { AuthUser } from '../ports.ts';
import { ERROR_HTTP_STATUS } from '../contracts.ts';
import type { ErrorCode } from '../contracts.ts';
import { ApiError } from '../lib/errors.ts';
import { userClient, type SupabaseConfig } from './supabase.ts';

export type MembershipOperation =
  'INVITE' | 'RESOLVE' | 'JOIN' | 'DECISION' | 'UPDATE' | 'REMOVE' | 'LEAVE';
export async function membershipOperation(
  cfg: SupabaseConfig,
  user: AuthUser,
  operation: MembershipOperation,
  body: unknown,
  key: string,
  id?: string,
): Promise<{ data: unknown; stateVersion: number }> {
  const db = userClient(cfg, user.jwt);
  const result =
    operation === 'INVITE'
      ? await db.rpc('manage_project_invite', {
          p_project_id: id,
          p_action: (body as { action: string }).action,
          p_idempotency_key: key,
        })
      : operation === 'RESOLVE'
        ? await db.rpc('resolve_membership_invite', { p_code: (body as { code: string }).code })
        : await db.rpc('membership_operation', {
            p_operation: operation,
            p_request: body,
            p_target_id: id ?? null,
            p_idempotency_key: key,
          });
  if (result.error) {
    const code = result.error.message;
    if (Object.hasOwn(ERROR_HTTP_STATUS, code)) throw new ApiError(code as ErrorCode);
    if (result.error.code === '23505') throw new ApiError('CONSTRAINT_VIOLATION');
    throw new ApiError('INTERNAL');
  }
  const envelope = result.data;
  if (envelope?.error?.code && Object.hasOwn(ERROR_HTTP_STATUS, envelope.error.code))
    throw new ApiError(envelope.error.code as ErrorCode);
  if (!envelope || !envelope.meta || !Number.isSafeInteger(envelope.meta.state_version))
    throw new ApiError('INTERNAL');
  return {
    data: operation === 'INVITE' && !envelope.data?.code ? null : envelope.data,
    stateVersion: envelope.meta.state_version,
  };
}
