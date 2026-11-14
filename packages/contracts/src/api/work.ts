/** Work mutations, §9.3 #19,21,23–26. */
import { z } from 'zod';
import { Uuid } from '../common.ts';
import {
  TaskView,
  AssignmentView,
  TaskDependencyView,
  TaskNeedView,
  ProjectView,
  MemberSelf,
  MemberPublic,
  Area,
  ResourceView,
} from '../entities.ts';
import { endpoint } from './endpoint.ts';
import { ErrorCode } from '../errors.ts';
import { IsoDateTime } from '../common.ts';

export const CreateTaskBody = TaskView.pick({
  title: true,
  description: true,
  area_id: true,
  role_tag: true,
  role_required: true,
  start_at: true,
  due_at: true,
  hard_deadline: true,
  estimated_minutes: true,
  critical: true,
  stipend_amount: true,
})
  .extend({
    title: z.string().trim().min(3).max(80),
    description: z.string().max(1000),
    criteria: z
      .array(
        z.strictObject({
          description: z.string().trim().min(1).max(200),
          critical: z.boolean(),
          photo_expected: z.boolean(),
        }),
      )
      .min(1)
      .max(8),
    depends_on: z.array(TaskDependencyView).max(100),
    needs: z.array(TaskNeedView).max(100),
  })
  .refine((v) => !v.start_at || Date.parse(v.start_at) < Date.parse(v.due_at), {
    message: 'Start must precede due time',
  });
export const WorkVersion = z.strictObject({ expected_version: z.number().int().positive() });
export const WorkResult = z.strictObject({ task_id: Uuid, assignment_id: Uuid.nullable() });
export const OffersBody = z.strictObject({
  offers: z
    .array(z.strictObject({ task_id: Uuid, member_id: Uuid, respond_by: IsoDateTime.optional() }))
    .min(1)
    .max(100),
});
export const OfferResult = WorkResult.extend({ error: ErrorCode.nullable() });
export const CreateTask = endpoint({
  no: 19,
  method: 'POST',
  path: '/projects/{pid}/tasks',
  actor: 'OWNER',
  body: CreateTaskBody,
  data: WorkResult,
  milestone: 3,
});
export const TaskStatusAction = endpoint({
  no: 21,
  method: 'POST',
  path: '/tasks/{tid}/status',
  actor: 'OWNER',
  body: WorkVersion.extend({
    action: z.enum(['CANCEL', 'DEFER', 'REOPEN', 'REVOKE']),
    reason: z.string().max(1000).optional(),
  }),
  data: WorkResult,
  versioned: true,
  milestone: 3,
});
export const SendOffers = endpoint({
  no: 23,
  method: 'POST',
  path: '/projects/{pid}/offers',
  actor: 'OWNER',
  body: OffersBody,
  data: z.array(OfferResult),
  milestone: 3,
});
export const RespondAssignment = endpoint({
  no: 24,
  method: 'POST',
  path: '/assignments/{aid}/respond',
  actor: 'INVITEE',
  body: WorkVersion.extend({
    response: z.enum(['ACCEPT', 'DECLINE']),
    reason: z.string().max(1000).optional(),
  }),
  data: WorkResult,
  versioned: true,
  milestone: 3,
});
export const ReleaseAssignment = endpoint({
  no: 25,
  method: 'POST',
  path: '/assignments/{aid}/release',
  actor: 'ASSIGNEE',
  body: WorkVersion.extend({ reason: z.string().trim().min(1).max(1000) }),
  data: WorkResult,
  versioned: true,
  milestone: 3,
});
export const StartTask = endpoint({
  no: 26,
  method: 'POST',
  path: '/tasks/{tid}/start',
  actor: 'ASSIGNEE',
  body: WorkVersion,
  data: WorkResult,
  versioned: true,
  milestone: 3,
});
/** Focused work read model, using the same canonical entity views as Snapshot. */
export const WorkData = z.strictObject({
  project: ProjectView,
  me: MemberSelf,
  members: z.array(MemberPublic),
  areas: z.array(Area),
  resources: z.array(ResourceView),
  tasks: z.array(TaskView),
  my_assignments: z.array(AssignmentView),
});
export const GetWork = endpoint({
  no: 19,
  method: 'GET',
  path: '/projects/{pid}/work',
  actor: 'MEMBER',
  data: WorkData,
  milestone: 3,
});
