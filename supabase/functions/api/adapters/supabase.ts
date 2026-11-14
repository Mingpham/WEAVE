/**
 * Supabase implementations of the ports. Reads run with the caller's JWT so RLS applies
 * (spec §12.1); the service-role client is used only for tables RLS closes to everyone
 * (`idempotency_keys`, §12.2) and for the project summary of PENDING memberships (§3 lets a
 * pending member see the event name, but `projects` RLS only admits APPROVED members).
 *
 * Depends on the DB lane's schema (spec §7.3). Until those migrations land, these adapters
 * are exercised only by `deno check`; route behaviour is tested with in-memory fakes.
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MeMembership, MeResponse } from '../contracts.ts';
import type {
  AuthUser,
  AuthVerifier,
  IdempotencyRecord,
  IdempotencyStore,
  MeRepository,
} from '../ports.ts';

export interface SupabaseConfig {
  url: string;
  /** Publishable (anon) key — combined with the caller's JWT for RLS-scoped reads. */
  publishableKey: string;
  serviceRoleKey: string;
}

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false } } as const;

export function serviceClient(cfg: SupabaseConfig): SupabaseClient {
  return createClient(cfg.url, cfg.serviceRoleKey, NO_SESSION);
}

export function userClient(cfg: SupabaseConfig, jwt: string): SupabaseClient {
  return createClient(cfg.url, cfg.publishableKey, {
    ...NO_SESSION,
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

export function supabaseAuth(cfg: SupabaseConfig): AuthVerifier {
  const client = createClient(cfg.url, cfg.publishableKey, NO_SESSION);
  return {
    async verify(jwt) {
      const { data, error } = await client.auth.getUser(jwt);
      if (error || !data.user) return null;
      return {
        id: data.user.id,
        isAnonymous: data.user.is_anonymous ?? false,
        email: data.user.email ?? null,
        jwt,
      };
    },
  };
}

export function supabaseIdempotency(cfg: SupabaseConfig): IdempotencyStore {
  const db = serviceClient(cfg);
  return {
    async get(userId, key) {
      const { data, error } = await db
        .from('idempotency_keys')
        .select('request_hash, response_status, response_body')
        .eq('user_id', userId)
        .eq('key', key)
        .maybeSingle();
      if (error) throw new Error(`idempotency_get_failed: ${error.code}`);
      if (!data) return null;
      return {
        requestHash: data.request_hash as string,
        status: data.response_status as number,
        body: data.response_body,
      } satisfies IdempotencyRecord;
    },
    async put(userId, key, operation, record) {
      const { error } = await db.from('idempotency_keys').insert({
        user_id: userId,
        key,
        operation,
        request_hash: record.requestHash,
        response_status: record.status,
        response_body: record.body,
      });
      if (!error) return true;
      if (error.code === '23505') return false; // unique_violation: a concurrent retry won
      throw new Error(`idempotency_put_failed: ${error.code}`);
    },
  };
}

type MemberRow = {
  id: string;
  project_id: string;
  role: MeMembership['role'];
  status: MeMembership['status'];
  nickname: string;
};

type ProjectRow = MeMembership['project'];

export function supabaseMe(cfg: SupabaseConfig): MeRepository {
  const service = serviceClient(cfg);
  return {
    async getMe(user: AuthUser): Promise<MeResponse> {
      const members = await userClient(cfg, user.jwt)
        .from('members')
        .select('id, project_id, role, status, nickname')
        .eq('user_id', user.id)
        .in('status', ['PENDING', 'APPROVED']);
      if (members.error) throw new Error(`me_members_failed: ${members.error.code}`);
      const rows = (members.data ?? []) as MemberRow[];

      const ids = [...new Set(rows.map((m) => m.project_id))];
      const projects = ids.length
        ? await service
            .from('projects')
            .select('id, title, status, venue_name, starts_at, ends_at, timezone')
            .in('id', ids)
            .is('deleted_at', null)
        : { data: [] as ProjectRow[], error: null };
      if (projects.error) throw new Error(`me_projects_failed: ${projects.error.code}`);
      const byId = new Map(((projects.data ?? []) as ProjectRow[]).map((p) => [p.id, p]));

      const memberships: MeMembership[] = [];
      for (const m of rows) {
        const project = byId.get(m.project_id);
        if (!project) continue; // soft-deleted project
        memberships.push({
          member_id: m.id,
          role: m.role,
          status: m.status,
          nickname: m.nickname,
          project: {
            ...project,
            starts_at: new Date(project.starts_at).toISOString(),
            ends_at: new Date(project.ends_at).toISOString(),
          },
        });
      }
      return {
        user: { id: user.id, is_anonymous: user.isAnonymous, email: user.email },
        memberships,
      };
    },
  };
}
