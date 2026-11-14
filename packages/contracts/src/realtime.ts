/**
 * Realtime channels and payloads — spec §9.5, FR-NTF-01. Payloads are refetch signals only;
 * they never carry business content or media.
 */
import { z } from 'zod';
import { Uuid } from './common.ts';
import { EventType } from './event-types.ts';

export const projectChannel = (projectId: string) => `project:${projectId}`;
export const userChannel = (userId: string) => `user:${userId}`;

/** Broadcast event name used on both channels. */
export const REALTIME_EVENT = 'signal';

export const ProjectSignal = z.strictObject({
  project_id: Uuid,
  state_version: z.number().int().nonnegative(),
  event_type: EventType,
});
export type ProjectSignal = z.infer<typeof ProjectSignal>;

export const UserSignal = z.strictObject({
  type: z.enum(['MEMBERSHIP_CHANGED', 'INBOX']),
  project_id: Uuid,
});
export type UserSignal = z.infer<typeof UserSignal>;
