import { describe, expect, it } from 'vitest';
import { PatchPlanBody } from '../src/api/planning.ts';
describe('manual plan mutation contract', () => {
  it('requires both project state and draft revision', () => {
    expect(PatchPlanBody.safeParse({ ops: [] }).success).toBe(false);
    expect(
      PatchPlanBody.safeParse({ ops: [], expected_state_version: 1, expected_revision: 1 }).success,
    ).toBe(true);
  });
  it('rejects unknown operation collections and authority fields', () => {
    expect(
      PatchPlanBody.safeParse({
        ops: [{ op: 'DELETE', collection: 'members', key: 'owner' }],
        expected_state_version: 1,
        expected_revision: 1,
      }).success,
    ).toBe(false);
    expect(
      PatchPlanBody.safeParse({
        ops: [],
        finalize: true,
        expected_state_version: 1,
        expected_revision: 1,
        owner: true,
      }).success,
    ).toBe(false);
  });
});
