import { z } from '../primitives.ts';
import { POL } from '../policy.ts';

// Structural limits from §10.3 and the canonical Appendix B policy table.
export const PlanComposeOutputSchema = z.strictObject({
  reply: z.string().max(600),
  areas: z
    .array(z.strictObject({ key: z.string(), name: z.string(), notes: z.string().nullable() }))
    .max(POL.MAX_AREAS),
  role_tags: z.array(z.string()).max(12),
  tasks: z
    .array(
      z.strictObject({
        key: z.string(),
        title: z.string(),
        description: z.string(),
        area_key: z.string().nullable(),
        role_tag: z.string().nullable(),
        role_required: z.boolean(),
        start_offset_min: z.number().nullable(),
        due_offset_min: z.number(),
        hard_deadline: z.boolean(),
        estimated_minutes: z.number(),
        critical: z.boolean(),
        criteria: z
          .array(
            z.strictObject({
              description: z.string(),
              critical: z.boolean(),
              photo_expected: z.boolean(),
            }),
          )
          .min(1)
          .max(8),
        depends_on: z.array(
          z.strictObject({ task_key: z.string(), kind: z.enum(['HARD', 'SOFT']) }),
        ),
        needs: z.array(
          z.strictObject({
            resource_key: z.string().nullable(),
            category: z.string().nullable(),
            hard: z.boolean(),
          }),
        ),
      }),
    )
    .max(POL.MAX_TASKS),
  resources: z
    .array(
      z.strictObject({
        key: z.string(),
        name: z.string(),
        category: z.string(),
        kind: z.enum(['ITEM', 'SUPPLY']),
        quantity: z.number().nullable(),
        area_key: z.string().nullable(),
        reason: z.string(),
      }),
    )
    .max(POL.MAX_RESOURCES),
  questions: z
    .array(
      z.strictObject({
        text: z.string(),
        why: z.string(),
        suggested_answers: z.array(z.string()),
        about_keys: z.array(z.string()),
      }),
    )
    .max(POL.PLAN_MAX_QUESTIONS_PER_TURN),
  assumptions: z.array(z.string()).max(8),
  change_summary: z.strictObject({
    added: z.array(z.string()),
    changed: z.array(z.string()),
    removed: z.array(z.string()),
  }),
});
export type PlanComposeOutput = z.infer<typeof PlanComposeOutputSchema>;
