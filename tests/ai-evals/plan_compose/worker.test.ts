import { expect, it } from 'vitest';
import { planComposeHandler } from '../../../supabase/functions/_shared/ai/plan-compose.ts';
import { processJob } from '../../../supabase/functions/ai-worker/process-job.ts';
import type { CommitInput, WorkerDeps } from '../../../supabase/functions/ai-worker/ports.ts';
import { productionRegistry } from '../../../supabase/functions/ai-worker/registry.ts';
import { InMemoryStore } from '../support/in-memory-store.ts';
import { fakeModel, modelResponse } from '../support/fake-model.ts';
import { planContext, planJob, planOutput } from './business-fixtures.ts';

function setup() {
  const store = new InMemoryStore(),
    job = planJob(),
    data = planContext();
  store.add(job.id);
  store.jobs.set(job.id, job);
  store.contexts.set(job.id, {
    state_version: 1,
    basis_revision: 1,
    snapshot: data,
    now: '2026-11-14T09:00:00Z',
  });
  const commits: CommitInput[] = [];
  const commit = store.commitResult.bind(store);
  store.commitResult = async (input) => {
    const result = await commit(input);
    if (result === 'COMMITTED') commits.push(structuredClone(input));
    return result;
  };
  const deps: WorkerDeps = {
    store,
    model: fakeModel(async () => ({ ...modelResponse, rawContent: JSON.stringify(planOutput()) })),
    modelId: 'test/model',
    registry: { PLAN_COMPOSE: planComposeHandler },
    nowMs: () => store.now,
  };
  return {
    store,
    job,
    data,
    commits,
    deps,
    message: { job_id: job.id, message_id: `m-${job.id}` },
  };
}
it('WP-1 fake-model worker passes the validated plan delta to commit exactly once', async () => {
  const { deps, message, commits, store } = setup();
  expect(await processJob(message, deps)).toBe('SUCCEEDED');
  expect(commits[0]?.derived_changes).toMatchObject({
    kind: 'PLAN_DRAFT',
    expected_revision: 1,
    status: 'EDITING',
    draft: { tasks: [expect.objectContaining({ key: 'setup', stipend_amount: null })] },
  });
  expect(store.logs[0]?.prompt_version).toBe('plan-compose-wp1-v1');
  expect(await processJob(message, deps)).toBe('SKIPPED');
  expect(commits).toHaveLength(1);
  expect(productionRegistry).toEqual({});
});
it('FR-PLAN-01 retries invalid plan business output within three attempts and preserves the old draft', async () => {
  const { deps, message, commits, data, store } = setup();
  const before = structuredClone(data.draft);
  const bad = planOutput();
  bad.tasks[0]!.depends_on = [{ task_key: 'setup', kind: 'HARD' }];
  let calls = 0;
  deps.model = fakeModel(async () => {
    calls++;
    return { ...modelResponse, rawContent: JSON.stringify(bad) };
  });
  expect(await processJob(message, deps)).toBe('RETRY_SCHEDULED');
  expect(await processJob(message, deps)).toBe('RETRY_SCHEDULED');
  expect(await processJob(message, deps)).toBe('DEAD');
  expect(calls).toBe(3);
  expect(commits).toEqual([]);
  expect(store.retries).toEqual([2000, 8000]);
  expect(data.draft).toEqual(before);
});
it('FR-PLAN-02 invalid preparation terminates safely without model or budget consumption', async () => {
  const { deps, message, data, store } = setup();
  data.ai_turns_used = 12;
  let calls = 0;
  deps.model = fakeModel(async () => {
    calls++;
    return modelResponse;
  });
  expect(await processJob(message, deps)).toBe('DEAD');
  expect(calls).toBe(0);
  expect(store.remainingBudget).toBe(100);
  expect(store.fallbacks).toEqual(['PLAN_TURN_LIMIT']);
});
it('INV-04 an unrelated version conflict recomputes without another inference; stale drafts never commit', async () => {
  const { deps, message, store, job, commits } = setup();
  let calls = 0;
  deps.model = fakeModel(async () => {
    calls++;
    store.contexts.get(job.id)!.state_version++;
    return { ...modelResponse, rawContent: JSON.stringify(planOutput()) };
  });
  expect(await processJob(message, deps)).toBe('SUCCEEDED');
  expect(calls).toBe(1);
  expect(commits).toHaveLength(1);
  const second = setup();
  second.deps.model = fakeModel(async () => {
    second.store.contexts.get(second.job.id)!.basis_revision = 2;
    return { ...modelResponse, rawContent: JSON.stringify(planOutput()) };
  });
  expect(await processJob(second.message, second.deps)).toBe('DISCARDED_STALE');
  expect(second.commits).toEqual([]);
});
