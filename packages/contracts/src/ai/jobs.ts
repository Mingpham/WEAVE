import { z, uuid, utcDateTime } from '../primitives.ts';

export const JobTypeSchema = z.enum(['PLAN_COMPOSE', 'OBSERVATION_ANALYZE', 'INCIDENT_ASSESS', 'EVENT_SUMMARIZE']);
export const JobStatusSchema = z.enum(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DISCARDED_STALE', 'DEAD']);
export const AnalysisJobSchema = z.strictObject({
  id: uuid, project_id: uuid, type: JobTypeSchema, status: JobStatusSchema, subject_id: uuid,
  basis_revision: z.number().int().nonnegative().nullable(), attempts: z.number().int().nonnegative(), error_code: z.string().nullable(),
  created_at: utcDateTime, queued_at: utcDateTime, started_at: utcDateTime.nullable(), finished_at: utcDateTime.nullable(),
});
export type AnalysisJob = z.infer<typeof AnalysisJobSchema>;
export type JobType = z.infer<typeof JobTypeSchema>;
