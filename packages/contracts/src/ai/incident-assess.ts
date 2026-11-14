import { z, alias } from '../primitives.ts';
import { ActionDraftSchema } from '../recovery.ts';

export const IncidentAssessOutputSchema = z.strictObject({
  summary: z.string().max(400),
  extra_unknowns: z
    .array(
      z.strictObject({
        subject_type: z.string(),
        subject_ref: alias('TMRA').nullable(),
        key: z.string(),
        label: z.string(),
      }),
    )
    .max(2),
  proposed_options: z
    .array(
      z.strictObject({
        key: z.enum(['ai_1', 'ai_2']),
        actions: z.array(ActionDraftSchema).min(1).max(3),
      }),
    )
    .max(2),
  ranking: z.array(
    z.strictObject({
      option_key: z.string(),
      tradeoffs: z.array(z.string()),
      assumptions: z.array(z.string()),
      evidence_claim_refs: z.array(alias('C')),
    }),
  ),
  recommended_option_key: z.string().nullable(),
  probe: z
    .strictObject({
      unknown_ref: alias('U'),
      target_member_ref: alias('M'),
      question: z.string(),
      why_you: z.string(),
      quick_replies: z.array(
        z.strictObject({ label: z.string(), claim_value: z.string().nullable() }),
      ),
      allow_photo: z.boolean(),
    })
    .nullable(),
  what_changed: z.string().max(240).nullable(),
  injection_suspected: z.boolean(),
});
export type IncidentAssessOutput = z.infer<typeof IncidentAssessOutputSchema>;
