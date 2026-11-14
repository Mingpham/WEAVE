/**
 * API & integration limits that are not in Appendix B. `POL.*` itself lives in policy.ts
 * (the shared canonical file); this file only adds values the spec states elsewhere.
 */
import { POL } from './policy.ts';

/** Per-user rate limits from SEC-03 (join attempts reuse POL.JOIN_ATTEMPTS_PER_10_MIN). */
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
