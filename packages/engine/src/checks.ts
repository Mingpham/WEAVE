import type { ConditionChecksInput, OptionValidity } from './types.ts';

export function classifyOptionChecks(checks: ConditionChecksInput): OptionValidity {
  if (checks.length === 0) throw new Error('MISSING_CHECKS');
  if (checks.some((check) => check.result === 'FALSE')) return 'INVALID';
  if (checks.some((check) => check.result === 'UNKNOWN')) return 'PENDING_VERIFICATION';
  return 'VALID';
}
