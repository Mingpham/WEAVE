import { z } from 'zod';
import { POL } from './policy.ts';

// FR-EVT-01 and §9.1: no actor, membership, status or idempotency key in body.
export const CreateProjectRequest = z
  .strictObject({
    title: z.string().min(3).max(80),
    brief: z.string().min(40).max(4000),
    venue_name: z.string().nullable().optional(),
    starts_at: z.iso.datetime(),
    ends_at: z.iso.datetime(),
    timezone: z
      .string()
      .min(1)
      .refine((zone) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: zone });
          return true;
        } catch {
          return false;
        }
      }, 'Invalid time zone'),
    expected_team_size: z.number().int().min(2).max(POL.MAX_MEMBERS),
    expected_attendees: z.number().int().min(0).nullable().optional(),
    currency: z.string().min(1).default('VND'),
  })
  .refine(
    (value) => {
      const duration = Date.parse(value.ends_at) - Date.parse(value.starts_at);
      return duration > 0 && duration <= 72 * 60 * 60 * 1000;
    },
    { path: ['ends_at'], message: 'Event duration must be positive and at most 72 hours' },
  );

export const CreateProjectResponse = z.strictObject({
  data: z.strictObject({
    project_id: z.uuid(),
    owner_member_id: z.uuid(),
    plan_draft_id: z.uuid(),
  }),
  meta: z.strictObject({ state_version: z.number().int().nonnegative() }),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequest>;
export type CreateProjectResponse = z.infer<typeof CreateProjectResponse>;
