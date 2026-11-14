import type { Hono } from 'hono';
import {
  InviteAction,
  ResolveInvite,
  Join,
  MemberDecision,
  UpdateMember,
  RemoveMember,
  LeaveProject,
  IDEMPOTENCY_HEADER,
  Uuid,
} from '../contracts.ts';
import type { Ctx, Env } from '../lib/context.ts';
import { ApiError } from '../lib/errors.ts';
import { register } from '../lib/route.ts';
import type { SupabaseConfig } from '../adapters/supabase.ts';
import { membershipOperation } from '../adapters/membership.ts';

export function registerMembershipRoutes(app: Hono<Env>, cfg: SupabaseConfig): void {
  const call = async (
    c: Ctx,
    operation: Parameters<typeof membershipOperation>[2],
    body: unknown,
    id?: string,
  ) => {
    if (id !== undefined && !Uuid.safeParse(id).success) throw new ApiError('VALIDATION_FAILED');
    return membershipOperation(
      cfg,
      c.get('user'),
      operation,
      body,
      c.req.header(IDEMPOTENCY_HEADER)!,
      id,
    );
  };
  register(app, InviteAction, async ({ c, body, params }) => {
    const r = await call(c, 'INVITE', body, params.pid);
    return { ...r, data: InviteAction.data.parse(r.data) };
  });
  // Every response is validated using the canonical endpoint schema before leaving the API.
  register(app, ResolveInvite, async ({ c, body }) => {
    const r = await call(c, 'RESOLVE', body);
    return { ...r, data: ResolveInvite.data.parse(r.data) };
  });
  register(app, Join, async ({ c, body }) => {
    const r = await call(c, 'JOIN', body);
    return { ...r, data: Join.data.parse(r.data) };
  });
  register(app, MemberDecision, async ({ c, body, params }) => {
    const r = await call(c, 'DECISION', body, params.mid);
    return { ...r, data: MemberDecision.data.parse(r.data) };
  });
  register(app, UpdateMember, async ({ c, body, params }) => {
    const r = await call(c, 'UPDATE', body, params.mid);
    return { ...r, data: UpdateMember.data.parse(r.data) };
  });
  register(app, RemoveMember, async ({ c, body, params }) => {
    const r = await call(c, 'REMOVE', body, params.mid);
    return { ...r, data: RemoveMember.data.parse(r.data) };
  });
  register(app, LeaveProject, async ({ c, body, params }) => {
    const r = await call(c, 'LEAVE', body, params.pid);
    return { ...r, data: LeaveProject.data.parse(r.data) };
  });
}
