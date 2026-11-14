import {
  AssignmentView,
  ClaimStatus,
  IsoDateTime,
  MemberPresence,
  MemberSelf,
  POL,
  TaskView,
  Uuid,
} from '../../contracts/src/index.ts';
import { z } from '../../contracts/src/primitives.ts';
import type { ConditionResult } from '../../contracts/src/enum-schemas.ts';
import type { EligibilityInput, EligibilityMember, EligibilityTask } from './inputs.ts';
import type { OptionValidity } from './types.ts';

export type EligibilityCode =
  | 'MEMBER_APPROVED'
  | 'MEMBER_PRESENT'
  | 'ROLE_MATCH'
  | 'AVAILABLE_IN_WINDOW'
  | 'LOAD_OK'
  | 'NO_CRITICAL_CLASH'
  | 'NOT_PREVIOUSLY_DECLINED';
export type EligibilityCheck = Readonly<{
  code: EligibilityCode;
  result: ConditionResult;
  message: string;
  claim_ids: readonly string[];
}>;
export type EligibilityEvaluation = Readonly<{
  task_id: string;
  member_id: string;
  checks: readonly EligibilityCheck[];
  validity: OptionValidity;
  score: number;
}>;
export type AssignmentSuggestion = EligibilityEvaluation;

const scope = { project_id: Uuid };
const inputSchema = z.strictObject({
  project_id: Uuid,
  now: IsoDateTime,
  members: z.array(
    MemberSelf.pick({
      id: true,
      nickname: true,
      role: true,
      status: true,
      role_tags: true,
      availability: true,
      presence: true,
      current_area_id: true,
    }).extend(scope),
  ),
  tasks: z.array(
    TaskView.pick({
      id: true,
      area_id: true,
      role_tag: true,
      role_required: true,
      start_at: true,
      due_at: true,
      estimated_minutes: true,
      critical: true,
      status: true,
    }).extend(scope),
  ),
  assignments: z.array(
    AssignmentView.pick({ id: true, task_id: true, member_id: true, status: true }).extend(scope),
  ),
  presence_claims: z.array(
    z.strictObject({
      ...scope,
      id: Uuid,
      subject_type: z.literal('MEMBER'),
      subject_id: Uuid,
      key: z.literal('member.presence'),
      value: MemberPresence,
      status: ClaimStatus,
      observed_at: IsoDateTime,
      valid_until: IsoDateTime.nullable(),
    }),
  ),
});

export class EligibilityInputError extends Error {
  constructor(
    readonly code: 'INVALID_INPUT' | 'PROJECT_MISMATCH' | 'DUPLICATE_ID' | 'MISSING_REFERENCE',
  ) {
    super(code);
    this.name = 'EligibilityInputError';
  }
}
type Window = { start: number; end: number };
const windowOf = (task: EligibilityTask): Window => ({
  start:
    task.start_at === null
      ? Date.parse(task.due_at) - task.estimated_minutes * 60_000
      : Date.parse(task.start_at),
  end: Date.parse(task.due_at),
});
const overlaps = (a: Window, b: Window) => a.start < b.end && b.start < a.end;
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const terminal = new Set(['APPROVED', 'CANCELLED']);

function validate(input: EligibilityInput): void {
  if (!inputSchema.safeParse(input).success) throw new EligibilityInputError('INVALID_INPUT');
  for (const rows of [input.members, input.tasks, input.assignments, input.presence_claims]) {
    const ids = new Set<string>();
    for (const row of rows) {
      if (row.project_id !== input.project_id) throw new EligibilityInputError('PROJECT_MISMATCH');
      if (ids.has(row.id)) throw new EligibilityInputError('DUPLICATE_ID');
      ids.add(row.id);
    }
  }
  const members = new Set(input.members.map((m) => m.id));
  const tasks = new Set(input.tasks.map((t) => t.id));
  for (const a of input.assignments) {
    if (!members.has(a.member_id) || !tasks.has(a.task_id))
      throw new EligibilityInputError('MISSING_REFERENCE');
  }
  for (const claim of input.presence_claims) {
    if (!members.has(claim.subject_id)) throw new EligibilityInputError('MISSING_REFERENCE');
    if (claim.valid_until !== null && Date.parse(claim.valid_until) < Date.parse(claim.observed_at))
      throw new EligibilityInputError('INVALID_INPUT');
  }
  for (const task of input.tasks) {
    const window = windowOf(task);
    if (!Number.isFinite(window.start) || window.start >= window.end)
      throw new EligibilityInputError('INVALID_INPUT');
  }
}

function availabilityCovers(member: EligibilityMember, window: Window): boolean {
  if ('whole_event' in member.availability) return true;
  const windows = member.availability.windows
    .map((w) => ({ start: Date.parse(w.from), end: Date.parse(w.to) }))
    .sort((a, b) => a.start - b.start);
  let covered = window.start;
  for (const current of windows) {
    if (current.start > covered) return false;
    covered = Math.max(covered, current.end);
    if (covered >= window.end) return true;
  }
  return false;
}

function evaluate(
  input: EligibilityInput,
  task: EligibilityTask,
  member: EligibilityMember,
  reserved: readonly EligibilityTask[] = [],
): EligibilityEvaluation {
  const active = input.assignments
    .filter((a) => a.member_id === member.id && (a.status === 'OFFERED' || a.status === 'ACCEPTED'))
    .map((a) => input.tasks.find((t) => t.id === a.task_id)!)
    .filter((t) => !terminal.has(t.status));
  const workload = [...active, ...reserved];
  const window = windowOf(task);
  const now = Date.parse(input.now);
  const fresh = input.presence_claims
    .filter(
      (c) =>
        c.subject_id === member.id &&
        ['REPORTED', 'SUPPORTED', 'CONFIRMED'].includes(c.status) &&
        Date.parse(c.observed_at) <= now &&
        (c.valid_until === null || Date.parse(c.valid_until) > now),
    )
    .sort((a, b) => compare(a.id, b.id));
  const present: ConditionResult =
    member.presence === 'UNAVAILABLE'
      ? 'FALSE'
      : member.presence === 'NOT_ARRIVED' &&
          window.start <= now + POL.URGENT_WINDOW_MIN * 60_000 &&
          fresh.length === 0
        ? 'UNKNOWN'
        : 'TRUE';
  const roleMatch = task.role_tag !== null && member.role_tags.includes(task.role_tag);
  const yes = (value: boolean): ConditionResult => (value ? 'TRUE' : 'FALSE');
  const checks: EligibilityCheck[] = [
    {
      code: 'MEMBER_APPROVED',
      result: yes(member.status === 'APPROVED' && member.role === 'PARTICIPANT'),
      message: 'Member must be an approved participant.',
      claim_ids: [],
    },
    {
      code: 'MEMBER_PRESENT',
      result: present,
      message: 'Member must be available; urgent arrival needs fresh evidence.',
      claim_ids: fresh.map((c) => c.id),
    },
    {
      code: 'ROLE_MATCH',
      result: yes(!task.role_required || roleMatch),
      message: 'Member must have the required role.',
      claim_ids: [],
    },
    {
      code: 'AVAILABLE_IN_WINDOW',
      result: yes(availabilityCovers(member, window)),
      message: 'Availability must cover the task window.',
      claim_ids: [],
    },
    {
      code: 'LOAD_OK',
      result: yes(workload.length < POL.MAX_ACTIVE_ASSIGNMENTS_PER_MEMBER),
      message: 'Member must have capacity for another assignment.',
      claim_ids: [],
    },
    {
      code: 'NO_CRITICAL_CLASH',
      result: yes(!workload.some((t) => t.critical && overlaps(window, windowOf(t)))),
      message: 'Task must not overlap assigned critical work.',
      claim_ids: [],
    },
    {
      code: 'NOT_PREVIOUSLY_DECLINED',
      result: yes(
        !input.assignments.some(
          (a) =>
            a.member_id === member.id &&
            a.task_id === task.id &&
            (a.status === 'DECLINED' || a.status === 'RELEASED'),
        ),
      ),
      message: 'Member must not have declined or released this task.',
      claim_ids: [],
    },
  ];
  return {
    task_id: task.id,
    member_id: member.id,
    checks,
    validity: checks.some((c) => c.result === 'FALSE')
      ? 'INVALID'
      : checks.some((c) => c.result === 'UNKNOWN')
        ? 'PENDING_VERIFICATION'
        : 'VALID',
    score:
      (roleMatch ? 3 : 0) +
      (task.area_id !== null && member.current_area_id === task.area_id ? 2 : 0) +
      (member.presence === 'ON_SITE' ? 2 : 0) -
      workload.length,
  };
}

export function evaluateEligibility(
  input: EligibilityInput,
  taskId: string,
  memberId: string,
): EligibilityEvaluation {
  validate(input);
  const task = input.tasks.find((t) => t.id === taskId),
    member = input.members.find((m) => m.id === memberId);
  if (!task || !member) throw new EligibilityInputError('MISSING_REFERENCE');
  return evaluate(input, task, member);
}

function rank(
  input: EligibilityInput,
  task: EligibilityTask,
  reserved: ReadonlyMap<string, readonly EligibilityTask[]>,
): EligibilityEvaluation[] {
  return input.members
    .map((member) => ({ member, result: evaluate(input, task, member, reserved.get(member.id)) }))
    .filter((c) => c.result.validity !== 'INVALID')
    .sort(
      (a, b) =>
        b.result.score - a.result.score ||
        compare(a.member.nickname, b.member.nickname) ||
        compare(a.member.id, b.member.id),
    )
    .map((c) => c.result);
}
export function rankCandidates(input: EligibilityInput, taskId: string): EligibilityEvaluation[] {
  validate(input);
  const task = input.tasks.find((t) => t.id === taskId);
  if (!task) throw new EligibilityInputError('MISSING_REFERENCE');
  return rank(input, task, new Map());
}
export function suggestAssignments(input: EligibilityInput): AssignmentSuggestion[] {
  validate(input);
  const tasks = input.tasks
    .filter((t) => t.status === 'OPEN')
    .slice()
    .sort(
      (a, b) =>
        Number(b.critical) - Number(a.critical) ||
        Date.parse(a.due_at) - Date.parse(b.due_at) ||
        compare(a.id, b.id),
    );
  const reserved = new Map<string, EligibilityTask[]>();
  const suggestions: AssignmentSuggestion[] = [];
  for (const task of tasks) {
    const chosen = rank(input, task, reserved)[0];
    if (!chosen) continue;
    suggestions.push(chosen);
    reserved.set(chosen.member_id, [...(reserved.get(chosen.member_id) ?? []), task]);
  }
  return suggestions;
}
