import { expect, it } from 'vitest';
import { evaluateEligibility, rankCandidates, suggestAssignments } from '../src/eligibility.ts';
import type { EligibilityInput, EligibilityMember, PresenceClaim } from '../src/inputs.ts';
import { assignment, freeze, id, member, project, scenario, task } from './eligibility-fixtures.ts';

const evaluate = (input: EligibilityInput) => evaluateEligibility(input, id(10), id(2));
const check = (input: EligibilityInput, code: string) =>
  evaluate(input).checks.find((c) => c.code === code)?.result;

it('§11.3 evaluates seven conditions and literal ranking score without mutating frozen inputs', () => {
  const input = freeze(scenario());
  expect(evaluate(input)).toMatchObject({
    task_id: id(10),
    member_id: id(2),
    validity: 'VALID',
    score: 7,
  });
  expect(evaluate(input).checks).toHaveLength(7);
  expect(evaluate(input).checks.every((c) => c.result === 'TRUE')).toBe(true);
  expect(suggestAssignments(input)).toMatchObject([{ task_id: id(10), member_id: id(2) }]);
  expect(input.assignments).toEqual([]);
});

it.each<Partial<EligibilityMember>>([
  { role: 'OWNER' },
  { status: 'PENDING' },
  { status: 'REMOVED' },
  { status: 'LEFT' },
  { status: 'REJECTED' },
])('MEMBER_APPROVED excludes ineligible membership %j', (patch) => {
  const input = scenario({ members: [member(2, patch)] });
  expect(check(input, 'MEMBER_APPROVED')).toBe('FALSE');
  expect(rankCandidates(input, id(10))).toEqual([]);
});
it('MEMBER_PRESENT excludes UNAVAILABLE and retains urgent uncertainty instead of false certainty', () => {
  expect(
    check(scenario({ members: [member(2, { presence: 'UNAVAILABLE' })] }), 'MEMBER_PRESENT'),
  ).toBe('FALSE');
  const input = scenario({ members: [member(2, { presence: 'NOT_ARRIVED' })] });
  expect(evaluate(input).validity).toBe('PENDING_VERIFICATION');
  expect(rankCandidates(input, id(10))).toHaveLength(1);
  expect(check({ ...input, now: '2026-11-14T09:29:59Z' }, 'MEMBER_PRESENT')).toBe('TRUE');
  expect(check({ ...input, now: '2026-11-14T10:10:00Z' }, 'MEMBER_PRESENT')).toBe('UNKNOWN');
});
const presence = (patch: Partial<PresenceClaim> = {}): PresenceClaim => ({
  id: id(40),
  project_id: project,
  subject_type: 'MEMBER',
  subject_id: id(2),
  key: 'member.presence',
  value: 'ON_SITE',
  status: 'REPORTED',
  observed_at: '2026-11-14T09:20:00Z',
  valid_until: '2026-11-14T09:50:00Z',
  ...patch,
});
it.each(['REPORTED', 'SUPPORTED', 'CONFIRMED'] as const)(
  'MEMBER_PRESENT accepts fresh %s presence evidence',
  (status) => {
    const input = scenario({
      members: [member(2, { presence: 'NOT_ARRIVED' })],
      presence_claims: [presence({ status })],
    });
    expect(check(input, 'MEMBER_PRESENT')).toBe('TRUE');
    expect(evaluate(input).checks.find((c) => c.code === 'MEMBER_PRESENT')?.claim_ids).toEqual([
      id(40),
    ]);
  },
);
it.each<Partial<PresenceClaim>>([
  { status: 'CONFLICTED' },
  { status: 'STALE' },
  { status: 'SUPERSEDED' },
  { status: 'REJECTED' },
  { valid_until: '2026-11-14T09:30:00Z' },
  { observed_at: '2026-11-14T09:31:00Z' },
])('MEMBER_PRESENT ignores unusable presence evidence %j', (patch) => {
  expect(
    check(
      scenario({
        members: [member(2, { presence: 'NOT_ARRIVED' })],
        presence_claims: [presence(patch)],
      }),
      'MEMBER_PRESENT',
    ),
  ).toBe('UNKNOWN');
});
it('ROLE_MATCH enforces required tags but permits optional roles without granting a match score', () => {
  expect(check(scenario({ members: [member(2, { role_tags: [] })] }), 'ROLE_MATCH')).toBe('FALSE');
  const input = scenario({
    members: [member(2, { role_tags: [] })],
    tasks: [task(10, { role_required: false, area_id: null })],
  });
  expect(evaluate(input)).toMatchObject({ validity: 'VALID', score: 2 });
});
it('AVAILABLE_IN_WINDOW covers the derived interval with adjacent windows but rejects a one-second gap', () => {
  const windows = [
    { from: '2026-11-14T10:00:00Z', to: '2026-11-14T10:15:00Z' },
    { from: '2026-11-14T10:15:00Z', to: '2026-11-14T10:30:00Z' },
  ];
  expect(
    check(scenario({ members: [member(2, { availability: { windows } })] }), 'AVAILABLE_IN_WINDOW'),
  ).toBe('TRUE');
  windows[1]!.from = '2026-11-14T10:15:01Z';
  expect(
    check(scenario({ members: [member(2, { availability: { windows } })] }), 'AVAILABLE_IN_WINDOW'),
  ).toBe('FALSE');
});
it('LOAD_OK includes OFFERED and ACCEPTED on unfinished tasks and subtracts active load from score', () => {
  const input = scenario({ tasks: [task(), task(11), task(12)], assignments: [assignment()] });
  expect(evaluate(input)).toMatchObject({ validity: 'VALID', score: 6 });
  expect(
    check(
      {
        ...input,
        assignments: [assignment(), assignment(21, { task_id: id(12), status: 'OFFERED' })],
      },
      'LOAD_OK',
    ),
  ).toBe('FALSE');
});
it.each(['APPROVED', 'CANCELLED'] as const)(
  'LOAD_OK ignores active records for terminal %s tasks',
  (status) => {
    expect(
      evaluate(scenario({ tasks: [task(), task(11, { status })], assignments: [assignment()] }))
        .score,
    ).toBe(7);
  },
);
it.each(['EXPIRED', 'COMPLETED', 'DECLINED', 'RELEASED'] as const)(
  'LOAD_OK ignores inactive %s history for other tasks',
  (status) => {
    expect(
      evaluate(scenario({ tasks: [task(), task(11)], assignments: [assignment(20, { status })] }))
        .score,
    ).toBe(7);
  },
);
it('NO_CRITICAL_CLASH rejects overlapping critical work but allows touching boundaries', () => {
  const input = scenario({
    tasks: [task(), task(11, { critical: true })],
    assignments: [assignment()],
  });
  expect(check(input, 'NO_CRITICAL_CLASH')).toBe('FALSE');
  expect(
    check(
      {
        ...input,
        tasks: [
          task(),
          task(11, {
            critical: true,
            start_at: '2026-11-14T10:30:00Z',
            due_at: '2026-11-14T11:00:00Z',
          }),
        ],
      },
      'NO_CRITICAL_CLASH',
    ),
  ).toBe('TRUE');
});
it.each(['DECLINED', 'RELEASED'] as const)(
  'NOT_PREVIOUSLY_DECLINED remembers %s even with subsequent history',
  (status) => {
    expect(
      check(
        scenario({
          assignments: [
            assignment(20, { task_id: id(10), status }),
            assignment(21, { task_id: id(10), status: 'EXPIRED' }),
          ],
        }),
        'NOT_PREVIOUSLY_DECLINED',
      ),
    ).toBe('FALSE');
  },
);
it('ranks by score then nickname with stable ID tie-break independent of input order', () => {
  const input = scenario({
    members: [
      member(4, { nickname: 'Zoe' }),
      member(3, { nickname: 'Ada' }),
      member(2, { nickname: 'Ada' }),
      member(5, { role_tags: [], nickname: 'Aaron' }),
    ],
    tasks: [task(10, { role_required: false })],
  });
  expect(rankCandidates(input, id(10)).map((c) => c.member_id)).toEqual([
    id(2),
    id(3),
    id(4),
    id(5),
  ]);
});
it('suggestions prioritize critical then due and reserve load/clashes without over-assigning', () => {
  const input = freeze(
    scenario({
      tasks: [
        task(12),
        task(10, { critical: true }),
        task(11, { critical: true, due_at: '2026-11-14T10:20:00Z' }),
        task(13, { start_at: '2026-11-14T11:00:00Z', due_at: '2026-11-14T11:30:00Z' }),
        task(14, { status: 'OFFERED' }),
      ],
    }),
  );
  expect(suggestAssignments(input).map((c) => c.task_id)).toEqual([id(11), id(13)]);
  expect(input.assignments).toEqual([]);
});
it.each([
  scenario({ members: [member(2, { project_id: id(99) })] }),
  scenario({ tasks: [task(), task()] }),
  scenario({ assignments: [assignment()] }),
  scenario({ now: 'not-a-time' }),
  scenario({ tasks: [task(10, { start_at: '2026-11-14T11:00:00Z' })] }),
  scenario({ presence_claims: [presence({ subject_id: id(99) })] }),
])('INV-07 refuses invalid, incomplete or cross-project eligibility inputs', (input) => {
  expect(() => evaluate(input)).toThrow();
});
it('rejects missing requested IDs and gives no suggestions for an empty eligible set', () => {
  expect(() => evaluateEligibility(scenario(), id(99), id(2))).toThrow();
  expect(() => evaluateEligibility(scenario(), id(10), id(99))).toThrow();
  expect(suggestAssignments(scenario({ members: [] }))).toEqual([]);
});
