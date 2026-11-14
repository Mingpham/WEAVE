import type {
  EligibilityAssignment,
  EligibilityInput,
  EligibilityMember,
  EligibilityTask,
} from '../src/inputs.ts';

export const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const project = id(1);
export const member = (n = 2, patch: Partial<EligibilityMember> = {}): EligibilityMember => ({
  id: id(n),
  project_id: project,
  nickname: 'Alex',
  role: 'PARTICIPANT',
  status: 'APPROVED',
  role_tags: ['setup'],
  availability: { whole_event: true },
  presence: 'ON_SITE',
  current_area_id: id(9),
  ...patch,
});
export const task = (n = 10, patch: Partial<EligibilityTask> = {}): EligibilityTask => ({
  id: id(n),
  project_id: project,
  area_id: id(9),
  role_tag: 'setup',
  role_required: true,
  start_at: null,
  due_at: '2026-11-14T10:30:00Z',
  estimated_minutes: 30,
  critical: false,
  status: 'OPEN',
  ...patch,
});
export const assignment = (
  n = 20,
  patch: Partial<EligibilityAssignment> = {},
): EligibilityAssignment => ({
  id: id(n),
  project_id: project,
  task_id: id(11),
  member_id: id(2),
  status: 'ACCEPTED',
  ...patch,
});
export const scenario = (patch: Partial<EligibilityInput> = {}): EligibilityInput => ({
  project_id: project,
  now: '2026-11-14T09:30:00Z',
  members: [member()],
  tasks: [task()],
  assignments: [],
  presence_claims: [],
  ...patch,
});
export function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
