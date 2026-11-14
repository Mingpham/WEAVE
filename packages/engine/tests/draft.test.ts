import { expect, it } from 'vitest';
import { computeDraftGaps, validateDraft } from '../src/draft.ts';
import { EMPTY_PLAN_DRAFT } from '../../contracts/src/plan.ts';
import { area, draft, draftInput, draftTask, resource } from './draft-fixtures.ts';
import { freeze } from './eligibility-fixtures.ts';

it('FR-PLAN-07 accepts empty manual drafts and preserves frozen input while recomputing gaps', () => {
  expect(validateDraft(draftInput(EMPTY_PLAN_DRAFT))).toMatchObject({
    ok: true,
    draft: { tasks: [], gaps: [] },
  });
  const input = freeze(
    draftInput(draft({ gaps: [{ kind: 'NO_AREA', keys: ['setup'], message: 'untrusted gap' }] })),
  );
  expect(validateDraft(input)).toMatchObject({ ok: true, draft: { gaps: [] } });
  expect(input.draft.gaps).toHaveLength(1);
  expect(computeDraftGaps(input)).toEqual([]);
});

it.each([
  draft({ resources: [resource({ key: 'setup' })] }),
  draft({ areas: [area(), area()] }),
  draft({ tasks: [draftTask({ key: 'Bad key' })] }),
  draft({ areas: [area(), area({ key: 'other', name: ' main HALL ' })] }),
  draft({ role_tags: ['setup', 'setup'] }),
])('FR-PLAN-01 rejects ambiguous keys/names/tags', (value) => {
  expect(validateDraft(draftInput(value)).ok).toBe(false);
});
it.each([
  draft({ tasks: [draftTask({ area_key: 'missing' })] }),
  draft({ resources: [resource({ area_key: 'missing' })] }),
  draft({ tasks: [draftTask({ role_tag: 'unknown' })] }),
  draft({ tasks: [draftTask({ depends_on: [{ task_key: 'missing', kind: 'SOFT' }] })] }),
  draft({
    tasks: [draftTask({ needs: [{ resource_key: 'missing', category: null, hard: true }] })],
  }),
  draft({
    questions: [
      {
        id: 'q1',
        text: 'Where?',
        why: 'Planning',
        suggested_answers: [],
        about_keys: ['missing'],
        status: 'OPEN',
        answer: null,
      },
    ],
  }),
])('FR-PLAN-01 rejects every dangling reference class', (value) => {
  expect(validateDraft(draftInput(value))).toMatchObject({
    ok: false,
    issues: expect.arrayContaining([expect.objectContaining({ code: 'MISSING_REFERENCE' })]),
  });
});
it.each([
  { resource_key: null, category: null, hard: true },
  { resource_key: 'tables', category: 'furniture', hard: true },
  { resource_key: null, category: '', hard: true },
])('FR-RES-02 requires exactly one resource or nonempty category', (need) => {
  expect(validateDraft(draftInput(draft({ tasks: [draftTask({ needs: [need] })] }))).ok).toBe(
    false,
  );
});
it('FR-RES-02 permits an unmet category need as planning data rather than a dangling ID', () => {
  expect(
    validateDraft(
      draftInput(
        draft({
          tasks: [draftTask({ needs: [{ resource_key: null, category: 'lighting', hard: true }] })],
        }),
      ),
    ).ok,
  ).toBe(true);
});
it.each(['HARD', 'SOFT'] as const)('FR-PLAN-01 rejects %s cycles and self-dependencies', (kind) => {
  expect(
    validateDraft(
      draftInput(draft({ tasks: [draftTask({ depends_on: [{ task_key: 'setup', kind }] })] })),
    ).ok,
  ).toBe(false);
  const tasks = [
    draftTask({ depends_on: [{ task_key: 'check', kind }] }),
    draftTask({ key: 'check', depends_on: [{ task_key: 'finish', kind }] }),
    draftTask({ key: 'finish', depends_on: [{ task_key: 'setup', kind }] }),
  ];
  expect(validateDraft(draftInput(draft({ tasks })))).toMatchObject({
    ok: false,
    issues: expect.arrayContaining([expect.objectContaining({ code: 'DEPENDENCY_CYCLE' })]),
  });
  tasks[2]!.depends_on = [];
  expect(validateDraft(draftInput(draft({ tasks }))).ok).toBe(true);
});
it.each([-20160, 1560])('§10.3 accepts inclusive due offset %d', (due_offset_min) => {
  expect(validateDraft(draftInput(draft({ tasks: [draftTask({ due_offset_min })] }))).ok).toBe(
    true,
  );
});
it.each([-20161, 1561])('§10.3 rejects out-of-bounds due offset %d', (due_offset_min) => {
  expect(validateDraft(draftInput(draft({ tasks: [draftTask({ due_offset_min })] }))).ok).toBe(
    false,
  );
});
it('§10.3 enforces start before due and positive estimated duration', () => {
  for (const patch of [
    { start_offset_min: 30 },
    { start_offset_min: 31 },
    { estimated_minutes: 0 },
  ])
    expect(validateDraft(draftInput(draft({ tasks: [draftTask(patch)] }))).ok).toBe(false);
  expect(
    validateDraft({
      ...draftInput(),
      project: { ...draftInput().project, ends_at: '2026-11-14T09:00:00Z' },
    }).ok,
  ).toBe(false);
});
it('FR-EVT-07 enforces entity limits with the boundary still valid', () => {
  const tasks = Array.from({ length: 100 }, (_, i) => draftTask({ key: `task-${i}` }));
  expect(validateDraft(draftInput(draft({ tasks }))).ok).toBe(true);
  expect(validateDraft(draftInput(draft({ tasks: [...tasks, draftTask()] }))).ok).toBe(false);
  expect(
    validateDraft(
      draftInput(
        draft({
          resources: Array.from({ length: 101 }, (_, i) => resource({ key: `resource-${i}` })),
        }),
      ),
    ).ok,
  ).toBe(false);
  expect(
    validateDraft(
      draftInput(
        draft({
          areas: Array.from({ length: 31 }, (_, i) =>
            area({ key: `area-${i}`, name: `Area ${i}` }),
          ),
        }),
      ),
    ).ok,
  ).toBe(false);
});
it.each([0, 9])('FR-PLAN-01 rejects %d criteria', (count) => {
  const criteria = Array.from({ length: count }, () => ({
    description: 'Visible result',
    critical: false,
    photo_expected: false,
  }));
  expect(validateDraft(draftInput(draft({ tasks: [draftTask({ criteria })] }))).ok).toBe(false);
});
it('FR-PLAN-05 computes all five gap kinds and accepts those gaps as review warnings', () => {
  const needs = [{ resource_key: 'tables', category: null, hard: true }];
  const input = draftInput(
    draft({
      resources: [resource({ area_key: null, inventory_state: 'UNVERIFIED' })],
      tasks: [
        draftTask({
          critical: true,
          role_tag: null,
          area_key: null,
          needs,
          criteria: [{ description: 'Stable', critical: true, photo_expected: false }],
        }),
        draftTask({ key: 'check', needs }),
      ],
    }),
  );
  expect(validateDraft(input).ok).toBe(true);
  expect(computeDraftGaps(input).map((g) => [g.kind, g.keys])).toEqual([
    ['CRITICAL_WITHOUT_ROLE', ['setup']],
    ['NO_AREA', ['setup']],
    ['NO_AREA', ['tables']],
    ['NO_CHECKABLE_CRITERION', ['setup']],
    ['RESOURCE_CONTENTION', ['tables', 'check', 'setup']],
    ['UNVERIFIED_RESOURCE', ['tables']],
  ]);
});
it('FR-PLAN-05 includes matching category demand, deduplicates same-task needs and ignores touching windows', () => {
  const a = draftTask({
    needs: [
      { resource_key: 'tables', category: null, hard: true },
      { resource_key: null, category: 'furniture', hard: false },
    ],
  });
  const b = draftTask({
    key: 'check',
    needs: [{ resource_key: null, category: 'furniture', hard: true }],
  });
  expect(
    computeDraftGaps(draftInput(draft({ tasks: [a, b] }))).filter(
      (g) => g.kind === 'RESOURCE_CONTENTION',
    ),
  ).toHaveLength(1);
  b.start_offset_min = 30;
  b.due_offset_min = 60;
  expect(computeDraftGaps(draftInput(draft({ tasks: [a, b] })))).toEqual([]);
});
it('draft gaps are deterministic under item permutation and reject invalid drafts', () => {
  const tasks = [draftTask({ key: 'z', area_key: null }), draftTask({ key: 'a', area_key: null })];
  expect(computeDraftGaps(draftInput(draft({ tasks })))).toEqual(
    computeDraftGaps(draftInput(draft({ tasks: [...tasks].reverse() }))),
  );
  expect(() =>
    computeDraftGaps(draftInput(draft({ tasks: [draftTask({ area_key: 'missing' })] }))),
  ).toThrow('INVALID_DRAFT');
});

it.each([0, 3])('FR-RES-01 rejects ITEM quantity %d in manual drafts', (quantity) => {
  expect(
    validateDraft(draftInput(draft({ resources: [resource({ kind: 'ITEM', quantity })] }))),
  ).toMatchObject({
    ok: false,
    issues: [{ code: 'INVALID_RESOURCE_QUANTITY', path: 'resources.tables.quantity' }],
  });
});
it.each([null, 0, 3])('FR-RES-01 preserves valid SUPPLY quantity %s', (quantity) => {
  expect(
    validateDraft(draftInput(draft({ resources: [resource({ kind: 'SUPPLY', quantity })] }))),
  ).toMatchObject({
    ok: true,
    draft: { resources: [{ kind: 'SUPPLY', quantity }] },
  });
});
