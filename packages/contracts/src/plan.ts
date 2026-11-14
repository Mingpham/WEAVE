/**
 * Plan Studio draft — spec §9.4 `PlanDraft`, stored in `plan_drafts.draft` (FR-PLAN-01…07).
 */
import { z } from 'zod';
import { Uuid } from './common.ts';
import { DependencyKind, InventoryState, ResourceKind } from './enum-schemas.ts';
import { LIMITS } from './limits.ts';

/** Stable key of a draft item; references inside the draft use keys, not database ids. */
export const DraftKey = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Draft keys are lowercase slugs');

export const DraftMeta = z.strictObject({
  key: DraftKey,
  origin: z.enum(['AI', 'HUMAN']),
  locked: z.boolean(),
});

export const DraftArea = DraftMeta.extend({
  name: z.string().trim().min(1).max(60),
  notes: z.string().max(500).nullable(),
});

export const DraftCriterion = z.strictObject({
  description: z.string().trim().min(1).max(LIMITS.CRITERION_MAX),
  critical: z.boolean(),
  photo_expected: z.boolean(),
});

export const DraftTask = DraftMeta.extend({
  title: z.string().trim().min(LIMITS.TASK_TITLE.min).max(LIMITS.TASK_TITLE.max),
  description: z.string().max(LIMITS.TASK_DESCRIPTION_MAX),
  area_key: DraftKey.nullable(),
  role_tag: z.string().nullable(),
  role_required: z.boolean(),
  /** Minutes relative to `starts_at`; negative = before the event starts. */
  start_offset_min: z.number().int().nullable(),
  due_offset_min: z.number().int(),
  hard_deadline: z.boolean(),
  estimated_minutes: z.number().int().positive(),
  critical: z.boolean(),
  /** Set by a human only; the AI never sets it. */
  stipend_amount: z.number().int().nonnegative().nullable(),
  criteria: z
    .array(DraftCriterion)
    .min(LIMITS.CRITERIA_PER_TASK.min)
    .max(LIMITS.CRITERIA_PER_TASK.max),
  depends_on: z.array(z.strictObject({ task_key: DraftKey, kind: DependencyKind })),
  needs: z.array(
    z.strictObject({
      resource_key: DraftKey.nullable(),
      category: z.string().nullable(),
      hard: z.boolean(),
    }),
  ),
});

export const DraftResource = DraftMeta.extend({
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(32),
  kind: ResourceKind,
  quantity: z.number().int().nonnegative().nullable(),
  /** Set by a human only (FR-PLAN-04). */
  inventory_state: InventoryState,
  area_key: DraftKey.nullable(),
  custodian_member_id: Uuid.nullable(),
  reason: z.string().max(300),
});

export const DraftQuestion = z.strictObject({
  id: z.string().min(1).max(64),
  text: z.string().max(300),
  why: z.string().max(300),
  suggested_answers: z.array(z.string().max(80)).max(4),
  about_keys: z.array(DraftKey),
  status: z.enum(['OPEN', 'ANSWERED', 'SKIPPED']),
  answer: z.string().nullable(),
});

export const PlanGapKind = z.enum([
  'UNVERIFIED_RESOURCE',
  'NO_CHECKABLE_CRITERION',
  'RESOURCE_CONTENTION',
  'NO_AREA',
  'CRITICAL_WITHOUT_ROLE',
]);

/** Computed by code, never by the AI (FR-PLAN-05). */
export const PlanGap = z.strictObject({
  kind: PlanGapKind,
  keys: z.array(DraftKey),
  message: z.string(),
});

export const PlanDraft = z.strictObject({
  areas: z.array(DraftArea),
  role_tags: z.array(z.string()),
  tasks: z.array(DraftTask),
  resources: z.array(DraftResource),
  questions: z.array(DraftQuestion),
  assumptions: z.array(z.string()),
  gaps: z.array(PlanGap),
});

export const EMPTY_PLAN_DRAFT: PlanDraft = {
  areas: [],
  role_tags: [],
  tasks: [],
  resources: [],
  questions: [],
  assumptions: [],
  gaps: [],
};

export type DraftMeta = z.infer<typeof DraftMeta>;
export type DraftArea = z.infer<typeof DraftArea>;
export type DraftTask = z.infer<typeof DraftTask>;
export type DraftResource = z.infer<typeof DraftResource>;
export type DraftQuestion = z.infer<typeof DraftQuestion>;
export type PlanGap = z.infer<typeof PlanGap>;
export type PlanDraft = z.infer<typeof PlanDraft>;
