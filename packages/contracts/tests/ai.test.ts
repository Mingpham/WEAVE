import { expect, it } from 'vitest';
import { z } from 'zod';
import { outputSchemas, AnalysisJobSchema } from '../src/ai/index.ts';
import { cases } from '../../../tests/ai-evals/fixtures.ts';

it.each(cases)(
  'schema $module accepts its fixture and rejects self-approval fields',
  ({ module, output }) => {
    expect(outputSchemas[module].safeParse(output).success).toBe(true);
    expect(
      outputSchemas[module].safeParse({ ...output, readiness: 'READY_FOR_APPROVAL' }).success,
    ).toBe(false);
    expect(outputSchemas[module].safeParse({ ...output, validity: 'VALID' }).success).toBe(false);
  },
);
it('enforces the specified output bounds', () => {
  const byModule = Object.fromEntries(cases.map((c) => [c.module, c.output]));
  expect(
    outputSchemas.plan_compose.safeParse({ ...byModule.plan_compose, reply: 'x'.repeat(601) })
      .success,
  ).toBe(false);
  expect(
    outputSchemas.plan_compose.safeParse({ ...byModule.plan_compose, reply: 'x'.repeat(600) })
      .success,
  ).toBe(true);
  expect(
    outputSchemas.observation_analyze.safeParse({
      ...byModule.observation_analyze,
      claims: Array(9).fill({
        subject_type: 'RESOURCE',
        subject_ref: 'R1',
        key: 'resource.condition',
        value: 'OK',
        statement: 'Working',
        media_refs: [],
        contradicts_claim_refs: [],
      }),
    }).success,
  ).toBe(false);
  expect(
    outputSchemas.incident_assess.safeParse({
      ...byModule.incident_assess,
      proposed_options: Array(3).fill({
        key: 'ai_1',
        actions: [{ type: 'DEFER_TASK', task_id: 'T1' }],
      }),
    }).success,
  ).toBe(false);
  expect(
    outputSchemas.event_summarize.safeParse({
      ...byModule.event_summarize,
      lessons: [{ text: 'Unsupported conclusion', refs: [] }],
    }).success,
  ).toBe(false);
  expect(
    outputSchemas.event_summarize.safeParse({
      ...byModule.event_summarize,
      lessons: Array(6).fill({ text: 'Lesson', refs: ['I1'] }),
    }).success,
  ).toBe(false);
});
it('exports JSON schemas with closed root objects for every module', () => {
  for (const schema of Object.values(outputSchemas)) {
    const json = z.toJSONSchema(schema);
    expect(json.type).toBe('object');
    expect(json.additionalProperties).toBe(false);
    expect(json.required?.length).toBeGreaterThan(0);
  }
});
it('preserves nullable job revision and rejects negative attempts', () => {
  const job = {
    id: '00000000-0000-4000-8000-000000000001',
    project_id: '00000000-0000-4000-8000-000000000002',
    type: 'OBSERVATION_ANALYZE',
    status: 'QUEUED',
    subject_id: '00000000-0000-4000-8000-000000000003',
    basis_revision: null,
    attempts: 0,
    error_code: null,
    created_at: '2026-11-14T00:00:00Z',
    queued_at: '2026-11-14T00:00:00Z',
    started_at: null,
    finished_at: null,
  };
  expect(AnalysisJobSchema.parse(job)).toEqual(job);
  expect(AnalysisJobSchema.safeParse({ ...job, attempts: -1 }).success).toBe(false);
});
