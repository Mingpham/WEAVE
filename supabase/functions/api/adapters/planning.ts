import {
  PlanData,
  type PatchPlanBody,
  type PlanOperation,
} from '../../../../packages/contracts/src/api/planning.ts';
import { validateDraft } from '../../../../packages/engine/src/draft.ts';
import { ERROR_HTTP_STATUS, type ErrorCode, type PlanDraft } from '../contracts.ts';
import { ApiError } from '../lib/errors.ts';
import { userClient, type SupabaseConfig } from './supabase.ts';
import type { AuthUser } from '../ports.ts';

export function applyPlanOperations(draft: PlanDraft, ops: PlanOperation[]): PlanDraft {
  const next = structuredClone(draft);
  for (const op of ops) {
    if (op.collection === 'role_tags') {
      if (op.op === 'UPSERT') {
        next.role_tags = next.role_tags.filter((v) => v !== op.key && v !== op.value);
        next.role_tags.push(op.value as string);
        next.tasks = next.tasks.map((t) =>
          t.role_tag === op.key ? { ...t, role_tag: op.value as string } : t,
        );
      }
      if (op.op === 'DELETE') {
        next.role_tags = next.role_tags.filter((v) => v !== op.key);
        next.tasks = next.tasks.map((t) =>
          t.role_tag === op.key ? { ...t, role_tag: null, role_required: false } : t,
        );
      }
      continue;
    }
    const rows = next[op.collection] as Array<{
      key: string;
      locked: boolean;
      origin: 'HUMAN' | 'AI';
    }>;
    const index = rows.findIndex((v) => v.key === op.key);
    if (op.op === 'UPSERT') {
      const value = {
        ...(op.value as object),
        key: op.key,
        origin: 'HUMAN' as const,
        locked: true,
      };
      if (index < 0) rows.push(value);
      else rows[index] = value;
    } else if (op.op === 'DELETE') {
      if (index >= 0) rows.splice(index, 1);
      if (op.collection === 'areas') {
        next.tasks = next.tasks.map((t) => (t.area_key === op.key ? { ...t, area_key: null } : t));
        next.resources = next.resources.map((r) =>
          r.area_key === op.key ? { ...r, area_key: null } : r,
        );
      }
      if (op.collection === 'tasks')
        next.tasks = next.tasks.map((t) => ({
          ...t,
          depends_on: t.depends_on.filter((d) => d.task_key !== op.key),
        }));
      if (op.collection === 'resources')
        next.tasks = next.tasks.map((t) => ({
          ...t,
          needs: t.needs.filter((n) => n.resource_key !== op.key),
        }));
      next.questions = next.questions.map((q) => ({
        ...q,
        about_keys: q.about_keys.filter((k) => k !== op.key),
      }));
    } else if (index >= 0) rows[index]!.locked = op.op === 'LOCK';
    if (op.op === 'UPSERT' && op.collection === 'resources') {
      const resource = next.resources.find((r) => r.key === op.key);
      const key = `acquire-${op.key}`.slice(0, 64);
      if (resource?.inventory_state === 'TO_ACQUIRE' && !next.tasks.some((t) => t.key === key))
        next.tasks.push({
          key,
          origin: 'HUMAN',
          locked: true,
          title: `Acquire ${resource.name}`.slice(0, 80),
          description: resource.reason,
          area_key: resource.area_key,
          role_tag: null,
          role_required: false,
          start_offset_min: null,
          due_offset_min: -60,
          hard_deadline: false,
          estimated_minutes: 15,
          critical: false,
          stipend_amount: null,
          criteria: [
            {
              description: `Confirm ${resource.name} is available.`.slice(0, 200),
              critical: true,
              photo_expected: false,
            },
          ],
          depends_on: [],
          needs: [],
        });
    }
  }
  return next;
}
function failure(error: { message: string }) {
  if (Object.hasOwn(ERROR_HTTP_STATUS, error.message))
    throw new ApiError(error.message as ErrorCode);
  throw new ApiError('INTERNAL');
}
export function planningRepository(cfg: SupabaseConfig, user: AuthUser) {
  const db = userClient(cfg, user.jwt);
  return {
    async get(pid: string) {
      const r = await db.rpc('get_plan', { p_project_id: pid });
      if (r.error) failure(r.error);
      return PlanData.parse(r.data);
    },
    async mutate(
      pid: string,
      body: PatchPlanBody & { finalize?: boolean },
      key: string,
      publish = false,
    ) {
      const current = await this.get(pid);
      const candidate = applyPlanOperations(current.draft, body.ops);
      const checked = validateDraft({
        draft: candidate,
        project: {
          id: pid,
          starts_at: current.starts_at,
          ends_at: current.ends_at,
          role_tags: candidate.role_tags,
        },
      });
      if (!checked.ok)
        throw new ApiError(
          checked.issues.some((i) => i.code === 'DEPENDENCY_CYCLE')
            ? 'DEPENDENCY_CYCLE'
            : 'VALIDATION_FAILED',
          undefined,
          { issues: checked.issues },
        );
      const r = await db.rpc('mutate_plan', {
        p_project_id: pid,
        p_expected_state_version: body.expected_state_version,
        p_expected_revision: body.expected_revision,
        p_request: { ops: body.ops, finalize: body.finalize ?? false, publish },
        p_draft: checked.draft,
        p_idempotency_key: key,
      });
      if (r.error) failure(r.error);
      const data = PlanData.parse(r.data);
      return { data, stateVersion: data.state_version };
    },
  };
}
