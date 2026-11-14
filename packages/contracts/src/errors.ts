/**
 * Error codes and response envelopes — spec §9.1 and §9.2.
 */
import { z } from 'zod';

export const ErrorCode = z.enum([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VERSION_CONFLICT',
  'INVALID_TRANSITION',
  'PROPOSAL_STALE',
  'PROJECT_CLOSED',
  'ALREADY_ASSIGNED',
  'VALIDATION_FAILED',
  'CONSTRAINT_VIOLATION',
  'DEPENDENCY_CYCLE',
  'LIMIT_EXCEEDED',
  'INVITE_INVALID',
  'IDEMPOTENCY_KEY_REUSED',
  'RATE_LIMITED',
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

/** HTTP status for each code (spec §9.2). */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  INVALID_TRANSITION: 409,
  PROPOSAL_STALE: 409,
  PROJECT_CLOSED: 409,
  ALREADY_ASSIGNED: 409,
  VALIDATION_FAILED: 422,
  CONSTRAINT_VIOLATION: 422,
  DEPENDENCY_CYCLE: 422,
  LIMIT_EXCEEDED: 422,
  INVITE_INVALID: 422,
  IDEMPOTENCY_KEY_REUSED: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

/**
 * Default user-facing English messages (spec §9.1: `message` is displayable). Routes may
 * pass a more specific message. UI copy for the mobile app still lives in strings/en.ts.
 */
export const DEFAULT_ERROR_MESSAGE: Record<ErrorCode, string> = {
  UNAUTHENTICATED: 'Please sign in again.',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find that.",
  VERSION_CONFLICT: 'This was changed by someone else. Refresh and try again.',
  INVALID_TRANSITION: "That action isn't possible right now.",
  PROPOSAL_STALE: 'This proposal is out of date. Re-checking…',
  PROJECT_CLOSED: 'This event is closed.',
  ALREADY_ASSIGNED: 'This task already has someone assigned.',
  VALIDATION_FAILED: 'Some fields are not valid.',
  CONSTRAINT_VIOLATION: "This change breaks one of the event's rules.",
  DEPENDENCY_CYCLE: 'This dependency would create a loop.',
  LIMIT_EXCEEDED: 'This event has reached its limit.',
  INVITE_INVALID: "That invite code isn't valid.",
  IDEMPOTENCY_KEY_REUSED: 'This request was already sent with different content.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  INTERNAL: 'Something went wrong. Please try again.',
};

export const ErrorBody = z.strictObject({
  code: ErrorCode,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ErrorBody = z.infer<typeof ErrorBody>;

/** Error envelope: `{ "error": { "code", "message", "details" } }`. */
export const ErrorEnvelope = z.strictObject({ error: ErrorBody });
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export const ResponseMeta = z.strictObject({
  state_version: z.number().int().nonnegative(),
});
export type ResponseMeta = z.infer<typeof ResponseMeta>;

/** Success envelope: `{ "data": …, "meta": { "state_version" } }`. */
export function successEnvelope<T extends z.ZodType>(data: T) {
  return z.strictObject({ data, meta: ResponseMeta });
}
export type SuccessEnvelope<T> = { data: T; meta: ResponseMeta };
