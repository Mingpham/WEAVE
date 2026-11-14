import type { ConditionCheck } from '../../contracts/src/recovery.ts';

/** WP-0 input; wider entity projections await canonical API/DB contracts. */
export type ConditionChecksInput = readonly Readonly<ConditionCheck>[];
export type OptionValidity = 'VALID' | 'PENDING_VERIFICATION' | 'INVALID';
