import { expect, it } from 'vitest';
import { classifyOptionChecks } from '../src/checks.ts';
import type { ConditionCheck } from '../../contracts/src/recovery.ts';

const check = (result: ConditionCheck['result']): ConditionCheck => ({
  action_index: null,
  code: 'ACTION_COUNT',
  result,
  message: 'Check result',
  claim_ids: [],
  unknown_id: null,
});
it.each([
  [['TRUE'], 'VALID'],
  [['TRUE', 'UNKNOWN'], 'PENDING_VERIFICATION'],
  [['UNKNOWN', 'FALSE'], 'INVALID'],
  [['FALSE', 'UNKNOWN', 'TRUE'], 'INVALID'],
] as const)('FR-REC-03 %j classifies as %s', (results, expected) => {
  const input = Object.freeze(results.map((result) => Object.freeze(check(result))));
  expect(classifyOptionChecks(input)).toBe(expected);
  expect(input.map((c) => c.result)).toEqual(results);
});
it('INV-02 does not treat a missing set of checks as permission to approve', () => {
  expect(() => classifyOptionChecks([])).toThrow('MISSING_CHECKS');
});
