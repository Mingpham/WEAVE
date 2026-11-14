/**
 * Shared primitives (spec §9.1: snake_case JSON, ISO-8601 UTC times, UUID ids).
 */
import { z } from 'zod';
import { LIMITS } from './limits.ts';

export const Uuid = z.uuid();
export type Uuid = z.infer<typeof Uuid>;

/** ISO-8601 timestamp. Server output is UTC (`Z`); client input may carry an offset. */
export const IsoDateTime = z.iso.datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTime>;

/** IANA time zone name, e.g. `Asia/Ho_Chi_Minh`. */
export const TimeZone = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/, 'Must be an IANA time zone name');

/** ISO-4217 currency code. Default `VND` (FR-EVT-01). */
export const CurrencyCode = z.string().regex(/^[A-Z]{3}$/, 'Must be a 3-letter currency code');

export const Nickname = z.string().trim().min(LIMITS.NICKNAME.min).max(LIMITS.NICKNAME.max);

/** A short role tag such as `check-in`, `logistics`, `av` (FR-MEM-07). */
export const RoleTag = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[a-z0-9][a-z0-9 -]*$/, 'Lowercase letters, digits, spaces and dashes only');

export const InviteCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/, 'Invite codes are 6 characters');

/** `members.availability` (spec §7.3): whole event, or one or more self-declared windows. */
export const Availability = z.union([
  z.strictObject({ whole_event: z.literal(true) }),
  z.strictObject({
    windows: z
      .array(z.strictObject({ from: IsoDateTime, to: IsoDateTime }))
      .min(1)
      .max(12)
      .refine((ws) => ws.every((w) => Date.parse(w.to) > Date.parse(w.from)), {
        message: 'Each window must end after it starts',
      }),
  }),
]);
export type Availability = z.infer<typeof Availability>;

/** Project feature flags — `projects.settings` (FR-SET-01). */
export const ProjectSettings = z.strictObject({
  ai_enabled: z.boolean(),
  ai_probe_enabled: z.boolean(),
  ai_recovery_enabled: z.boolean(),
  ai_vision_enabled: z.boolean(),
  auto_approve_members: z.boolean(),
});
export type ProjectSettings = z.infer<typeof ProjectSettings>;

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  ai_enabled: true,
  ai_probe_enabled: true,
  ai_recovery_enabled: true,
  ai_vision_enabled: true,
  auto_approve_members: false,
};

/** Screens a push / inbox item can open (spec §6.2 deep links `weave://p/{project_id}/…`). */
export const TargetScreen = z.enum([
  'MY_EVENTS',
  'WAITING',
  'COMMAND_CENTER',
  'PLAN_STUDIO',
  'TASK_DETAIL',
  'OFFER',
  'SUBMISSION_REVIEW',
  'INCIDENT',
  'ANSWER_QUESTION',
  'PEOPLE',
  'RESOURCES',
  'CLOSE_REPORT',
  'INBOX',
]);
export type TargetScreen = z.infer<typeof TargetScreen>;

/** `notifications.target` / attention-item target: `{screen, ids}` (spec §7.3). */
export const NavTarget = z.strictObject({
  screen: TargetScreen,
  ids: z.record(z.string(), Uuid),
});
export type NavTarget = z.infer<typeof NavTarget>;

/** Cursor pagination for timeline and inbox (endpoints #49, #50). */
export const PageQuery = z.strictObject({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export function page<T extends z.ZodType>(item: T) {
  return z.strictObject({ items: z.array(item), next_cursor: z.string().nullable() });
}
