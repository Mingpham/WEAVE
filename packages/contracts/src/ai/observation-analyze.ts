import { z, alias, IncidentTypeSchema } from '../primitives.ts';

export const ObservationAnalyzeOutputSchema = z.strictObject({
  claims: z
    .array(
      z.strictObject({
        subject_type: z.enum(['RESOURCE', 'MEMBER', 'TASK', 'AREA', 'PROJECT']),
        subject_ref: alias('RMTA').nullable(),
        key: z.string(),
        value: z.string(),
        statement: z.string(),
        media_refs: z.array(alias('P')),
        contradicts_claim_refs: z.array(alias('C')),
      }),
    )
    .max(8),
  criteria: z.array(
    z.strictObject({
      criterion_ref: alias('K'),
      verdict: z.enum(['SUPPORTED', 'INSUFFICIENT', 'CONFLICTED', 'NOT_ASSESSED']),
      explanation: z.string(),
      media_refs: z.array(alias('P')),
    }),
  ),
  incident_signal: z
    .strictObject({
      action: z.enum(['NEW', 'ATTACH']),
      incident_ref: alias('I').nullable(),
      type: IncidentTypeSchema,
      title: z.string(),
      summary: z.string(),
      subject_refs: z.array(alias('TMRA')),
      safety: z.boolean(),
    })
    .nullable(),
  new_resource: z
    .strictObject({
      name: z.string(),
      category: z.string(),
      area_ref: alias('A').nullable(),
      note: z.string(),
    })
    .nullable(),
  image_quality: z.enum(['OK', 'UNUSABLE', 'NO_IMAGE']),
  injection_suspected: z.boolean(),
});
export type ObservationAnalyzeOutput = z.infer<typeof ObservationAnalyzeOutputSchema>;
