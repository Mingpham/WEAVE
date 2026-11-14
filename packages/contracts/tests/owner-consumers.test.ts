import { expect, it } from 'vitest';
import { ENUMS, POL } from '../src/index.ts';

it('WP-0 latest API enum consumers accept DB canonical values and reject unknown values', async () => {
  const { MemberStatus, JobType } = await import('../src/enum-schemas.ts');
  for (const status of ENUMS.member_status) expect(MemberStatus.parse(status)).toBe(status);
  expect(MemberStatus.safeParse('UNKNOWN').success).toBe(false);
  expect(JobType.parse('PLAN_COMPOSE')).toBe('PLAN_COMPOSE');
});

it('SEC-03 API limits remain available separately from canonical DB policy', async () => {
  const { RATE_LIMITS, LIMITS } = await import('../src/limits.ts');
  expect(RATE_LIMITS.JOIN_ATTEMPTS.max).toBe(POL.JOIN_ATTEMPTS_PER_10_MIN);
  expect(LIMITS.CRITERIA_PER_TASK).toEqual({ min: 1, max: 8 });
});
