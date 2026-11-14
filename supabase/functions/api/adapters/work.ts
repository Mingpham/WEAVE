import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ERROR_HTTP_STATUS,
  type ErrorCode,
  TaskView,
  AssignmentView,
  WorkData,
} from '../contracts.ts';
import { ApiError } from '../lib/errors.ts';
import { userClient, type SupabaseConfig } from './supabase.ts';

function fail(error: { message: string } | null) {
  if (error)
    throw new ApiError(
      Object.hasOwn(ERROR_HTTP_STATUS, error.message) ? (error.message as ErrorCode) : 'INTERNAL',
    );
}
const iso = (value: string | null) => (value ? new Date(value).toISOString() : null);
export async function readProjectWork(db: SupabaseClient, pid: string, memberId: string) {
  const [tasks, criteria, dependencies, needs, assignments] = await Promise.all([
    db.from('tasks').select('*').eq('project_id', pid).order('due_at'),
    db
      .from('task_criteria')
      .select('id,task_id,position,description,critical,photo_expected,state')
      .eq('project_id', pid)
      .order('position'),
    db.from('task_dependencies').select('predecessor_id,successor_id,kind').eq('project_id', pid),
    db
      .from('task_resource_requirements')
      .select('task_id,resource_id,category,hard')
      .eq('project_id', pid),
    db
      .from('assignments')
      .select('id,task_id,member_id,status,respond_by,responded_at,is_recovery,version')
      .eq('project_id', pid),
  ]);
  for (const result of [tasks, criteria, dependencies, needs, assignments]) fail(result.error);
  const allAssignments = (assignments.data ?? []).map((a) =>
    AssignmentView.parse({
      ...a,
      respond_by: iso(a.respond_by),
      responded_at: iso(a.responded_at),
    }),
  );
  return {
    tasks: (tasks.data ?? []).map((t) =>
      TaskView.parse({
        id: t.id,
        title: t.title,
        description: t.description,
        area_id: t.area_id,
        role_tag: t.role_tag,
        role_required: t.role_required,
        start_at: iso(t.start_at),
        due_at: iso(t.due_at),
        hard_deadline: t.hard_deadline,
        estimated_minutes: t.estimated_minutes,
        critical: t.critical,
        stipend_amount: t.stipend_amount,
        status: t.status,
        risk: t.risk,
        risk_reasons: t.risk_reasons,
        origin: t.origin,
        version: t.version,
        criteria: (criteria.data ?? [])
          .filter((c) => c.task_id === t.id)
          .map(({ task_id: _, ...c }) => c),
        depends_on: (dependencies.data ?? [])
          .filter((d) => d.successor_id === t.id)
          .map((d) => ({ task_id: d.predecessor_id, kind: d.kind })),
        needs: (needs.data ?? [])
          .filter((n) => n.task_id === t.id)
          .map(({ task_id: _, ...n }) => n),
        assignee_member_id:
          allAssignments.find(
            (a) => a.task_id === t.id && ['OFFERED', 'ACCEPTED'].includes(a.status),
          )?.member_id ?? null,
      }),
    ),
    my_assignments: allAssignments.filter((a) => a.member_id === memberId),
  };
}
export async function readWork(cfg: SupabaseConfig, jwt: string, userId: string, pid: string) {
  const db = userClient(cfg, jwt);
  const member = await db
    .from('members')
    .select(
      'id,nickname,role,role_tags,presence,current_area_id,status,availability,consent_at,consent_version,version',
    )
    .eq('project_id', pid)
    .eq('user_id', userId)
    .eq('status', 'APPROVED')
    .maybeSingle();
  fail(member.error);
  if (!member.data) throw new ApiError('NOT_FOUND');
  const [project, members, areas, resources, work] = await Promise.all([
    db
      .from('projects')
      .select(
        'id,title,brief,status,venue_name,starts_at,ends_at,timezone,expected_team_size,expected_attendees,currency,state_version,role_tags,settings,closed_at',
      )
      .eq('id', pid)
      .is('deleted_at', null)
      .single(),
    db
      .from('members')
      .select('id,nickname,role,role_tags,presence,current_area_id')
      .eq('project_id', pid)
      .eq('status', 'APPROVED'),
    db.from('areas').select('id,name,notes').eq('project_id', pid),
    db
      .from('resources')
      .select(
        'id,name,category,kind,quantity,inventory_state,condition,area_id,custodian_member_id,notes,version',
      )
      .eq('project_id', pid),
    readProjectWork(db, pid, member.data.id),
  ]);
  for (const result of [project, members, areas, resources]) fail(result.error);
  const p = project.data!;
  return WorkData.parse({
    project: {
      ...p,
      starts_at: iso(p.starts_at),
      ends_at: iso(p.ends_at),
      closed_at: iso(p.closed_at),
      settings: member.data.role === 'OWNER' ? p.settings : null,
      owner_nickname: members.data?.find((m) => m.role === 'OWNER')?.nickname ?? '',
    },
    me: { ...member.data, consent_at: iso(member.data.consent_at) },
    members: members.data,
    areas: areas.data,
    resources: (resources.data ?? []).map((r) => ({
      ...r,
      condition_claim: null,
      location_claim: null,
    })),
    ...work,
  });
}
export async function mutateWork(
  cfg: SupabaseConfig,
  jwt: string,
  operation: string,
  target: string,
  body: unknown,
  key: string,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await userClient(cfg, jwt).rpc('mutate_work', {
      p_operation: operation,
      p_target_id: target,
      p_request: body,
      p_idempotency_key: key,
    });
    if (result.error?.message === 'VERSION_CONFLICT' && attempt < 2) continue;
    fail(result.error);
    return { data: result.data.data, stateVersion: result.data.meta.state_version };
  }
  throw new ApiError('VERSION_CONFLICT');
}
