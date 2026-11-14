import { z } from 'zod';
import { IsoDateTime, RoleTag, Uuid } from '../common.ts';
import { DraftArea, DraftKey, DraftResource, DraftTask, PlanDraft } from '../plan.ts';
import { endpoint } from './endpoint.ts';

const Version = {
  expected_state_version: z.number().int().nonnegative(),
  expected_revision: z.number().int().positive(),
};
const Collection = z.enum(['areas', 'tasks', 'resources', 'role_tags']);
const Upsert = z.union([
  z.strictObject({
    op: z.literal('UPSERT'),
    collection: z.literal('areas'),
    key: DraftKey,
    value: DraftArea,
  }),
  z.strictObject({
    op: z.literal('UPSERT'),
    collection: z.literal('tasks'),
    key: DraftKey,
    value: DraftTask,
  }),
  z.strictObject({
    op: z.literal('UPSERT'),
    collection: z.literal('resources'),
    key: DraftKey,
    value: DraftResource,
  }),
  z.strictObject({
    op: z.literal('UPSERT'),
    collection: z.literal('role_tags'),
    key: z.string(),
    value: RoleTag,
  }),
]);
export const PlanOperation = z.union([
  Upsert,
  z.strictObject({
    op: z.enum(['DELETE', 'UNLOCK', 'LOCK']),
    collection: Collection,
    key: z.string().min(1).max(64),
  }),
]);
export const PatchPlanBody = z.strictObject({ ...Version, ops: z.array(PlanOperation).max(100) });
export const PublishPlanBody = z.strictObject(Version);
export const ComposePlanBody = z.strictObject({
  ...Version,
  mode: z.enum(['DRAFT', 'REVISE', 'FINALIZE']),
  message: z.string().max(4000).optional(),
  answers: z
    .array(z.strictObject({ question_id: z.string(), text: z.string().max(1000) }))
    .optional(),
});
export const PlanData = z.strictObject({
  id: Uuid,
  project_id: Uuid,
  revision: z.number().int().positive(),
  status: z.enum(['EDITING', 'COMPOSING', 'PUBLISHED']),
  draft: PlanDraft,
  ai_turns_used: z.number().int().nonnegative(),
  last_error: z.string().nullable(),
  reviewed_revision: z.number().int().nullable(),
  state_version: z.number().int().nonnegative(),
  starts_at: IsoDateTime,
  ends_at: IsoDateTime,
  timezone: z.string(),
  ai_available: z.boolean(),
  messages: z.array(
    z.strictObject({
      id: Uuid,
      role: z.enum(['ORGANIZER', 'AI', 'SYSTEM']),
      text: z.string(),
      created_at: IsoDateTime,
      payload: z.unknown().nullable(),
    }),
  ),
});
export const GetPlan = endpoint({
  no: 15,
  method: 'GET',
  path: '/projects/{pid}/plan',
  actor: 'OWNER',
  data: PlanData,
  milestone: 2,
});
export const ComposePlan = endpoint({
  no: 16,
  method: 'POST',
  path: '/projects/{pid}/plan/compose',
  actor: 'OWNER',
  body: ComposePlanBody,
  data: PlanData,
  milestone: 2,
});
export const PatchPlan = endpoint({
  no: 17,
  method: 'PATCH',
  path: '/projects/{pid}/plan',
  actor: 'OWNER',
  body: PatchPlanBody,
  data: PlanData,
  milestone: 2,
});
export const PublishPlan = endpoint({
  no: 18,
  method: 'POST',
  path: '/projects/{pid}/plan/publish',
  actor: 'OWNER',
  body: PublishPlanBody,
  data: PlanData,
  milestone: 2,
});
export type PlanData = z.infer<typeof PlanData>;
export type PlanOperation = z.infer<typeof PlanOperation>;
export type PatchPlanBody = z.infer<typeof PatchPlanBody>;
