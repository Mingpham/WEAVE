/**
 * Policy constants — spec Appendix B. Defined ONCE here; every lane imports from this file.
 * Values are initial defaults to tune after real events, not measured results (spec §0.2).
 */
export const POL = {
  MAX_MEMBERS: 50,
  MAX_TASKS: 100,
  MAX_RESOURCES: 100,
  MAX_AREAS: 30,
  INVITE_TTL_HOURS: 72,
  JOIN_ATTEMPTS_PER_10_MIN: 10,
  PLAN_MAX_AI_TURNS: 12,
  PLAN_MAX_QUESTIONS_PER_TURN: 4,
  DEFAULT_ESTIMATED_MINUTES: 15,
  OFFER_RESPOND_MINUTES: 30,
  RECOVERY_OFFER_RESPOND_MINUTES: 5,
  MAX_ACTIVE_ASSIGNMENTS_PER_MEMBER: 2,
  URGENT_WINDOW_MIN: 30,
  MAX_PHOTOS_PER_OBSERVATION: 3,
  MAX_IMAGE_EDGE_PX: 1600,
  MAX_IMAGE_BYTES: 2_000_000,
  SIGNED_URL_TTL_SEC: 300,
  CLAIM_TTL_VOLATILE_MIN: 30,
  CLAIM_TTL_SEMI_MIN: 180,
  PROBE_EXPIRE_MINUTES: 5,
  RESOURCE_CHECK_EXPIRE_MINUTES: 60,
  MAX_PENDING_PROBES_PER_MEMBER: 1,
  MAX_PROBES_PER_INCIDENT: 3,
  MAX_AI_CALLS_PER_INCIDENT: 8,
  MAX_AI_CALLS_PER_PROJECT_PER_DAY: 300,
  INCIDENT_REASSESS_DEBOUNCE_SEC: 5,
  JOB_MAX_ATTEMPTS: 3,
  IDEMPOTENCY_TTL_HOURS: 24,
} as const;

export type PolicyName = keyof typeof POL;

/**
 * Per-user rate limits from SEC-03 that are not in Appendix B. Kept beside POL so the
 * `api` and the mock server read the same numbers.
 */
export const RATE_LIMITS = {
  JOIN_ATTEMPTS: { max: POL.JOIN_ATTEMPTS_PER_10_MIN, windowSec: 600 },
  OBSERVATIONS_PER_HOUR: { max: 60, windowSec: 3600 },
  UPLOAD_INTENTS_PER_HOUR: { max: 120, windowSec: 3600 },
} as const;

/** Field limits stated in the functional requirements (FR-EVT-01, FR-MEM-02, FR-TASK-01, FR-EVD-01). */
export const LIMITS = {
  PROJECT_TITLE: { min: 3, max: 80 },
  PROJECT_BRIEF: { min: 40, max: 4000 },
  PROJECT_MAX_DURATION_HOURS: 72,
  TEAM_SIZE_MIN: 2,
  NICKNAME: { min: 2, max: 24 },
  TASK_TITLE: { min: 3, max: 80 },
  TASK_DESCRIPTION_MAX: 1000,
  CRITERIA_PER_TASK: { min: 1, max: 8 },
  CRITERION_MAX: 200,
  OBSERVATION_TEXT_MAX: 1000,
  INVITE_CODE_LENGTH: 6,
} as const;

/** Invite code alphabet: uppercase letters and digits without 0 O 1 I L (FR-MEM-01). */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Consent text version shown on SCR-04 (FR-MEM-03). Bump when the consent copy changes. */
export const CONSENT_VERSION = '2026-11-14.1';
