import { expect, it } from 'vitest';
import { processJob } from '../process-job.ts';
import { productionRegistry } from '../registry.ts';
import type { ModuleHandler, WorkerDeps } from '../ports.ts';
import { ModelError } from '../../_shared/ai/openrouter.ts';
import { InMemoryStore } from '../../../../tests/ai-evals/support/in-memory-store.ts';
import { fakeModel, modelResponse } from '../../../../tests/ai-evals/support/fake-model.ts';

const id = '00000000-0000-4000-8000-000000000001';
const message = { job_id: id, message_id: `m-${id}` };
const fixtureHandler: ModuleHandler = {
  module: 'event_summarize', promptVersion: 'fixture-v1',
  prepare: c => ({ request: { module: 'event_summarize', promptVersion: 'fixture-v1', system: 'Test JSON', userContent: '{}', jsonSchema: {} }, context: { module: 'event_summarize', aliases: {}, snapshot: c.snapshot, now: c.now } }),
  validators: { references: () => {}, policy: value => ({ ok: true, value, warnings: [] }), business: value => ({ ok: true, value, warnings: [] }) },
  derive: () => ({ kind: 'NONE' }),
};
function setup() {
  const store = new InMemoryStore(); store.add(id);
  const deps: WorkerDeps = { store, model: fakeModel(), modelId: 'test/model', registry: { EVENT_SUMMARIZE: fixtureHandler }, nowMs: () => store.now };
  return { store, deps };
}
it('INV-05 claims once across concurrent deliveries and commits one result', async () => {
  const { store, deps } = setup(); let calls = 0; deps.model = fakeModel(async () => { calls++; return modelResponse; });
  await Promise.all([processJob(message, deps), processJob(message, deps)]);
  expect(calls).toBe(1); expect(store.writes).toEqual([id]); expect(store.logs).toHaveLength(1);
  await processJob(message, deps); expect(calls).toBe(1); expect(store.writes).toHaveLength(1);
});
it.each(['disabled', 'budget'])('INV-08 no outbound call when %s', async condition => {
  const { store, deps } = setup(); let calls = 0; deps.model = fakeModel(async () => { calls++; return modelResponse; });
  if (condition === 'disabled') store.enabled = false; else store.remainingBudget = 0;
  expect(await processJob(message, deps)).toBe('DEAD'); expect(calls).toBe(0);
  expect(store.fallbacks).toEqual([condition === 'disabled' ? 'AI_DISABLED' : 'BUDGET_EXCEEDED']);
  expect(store.logs).toHaveLength(0);
});
it('does not consume jobs for modules that are not ready', async () => {
  const { store, deps } = setup(); deps.registry = productionRegistry;
  expect(await processJob(message, deps)).toBe('MODULE_NOT_READY'); expect(store.jobs.get(id)!.attempts).toBe(0);
});
it('INV-04 stale revision drops business writes but records observed inference', async () => {
  const { store, deps } = setup(); deps.model = fakeModel(async () => { store.contexts.get(id)!.basis_revision = 2; return modelResponse; });
  expect(await processJob(message, deps)).toBe('DISCARDED_STALE'); expect(store.writes).toEqual([]);
  expect(store.logs[0]!.outcome).toBe('STALE_DISCARDED');
});
it('AT-34 retries computation after unrelated state changes without another model call', async () => {
  const { store, deps } = setup(); let calls = 0;
  deps.model = fakeModel(async () => { calls++; store.contexts.get(id)!.state_version++; return modelResponse; });
  expect(await processJob(message, deps)).toBe('SUCCEEDED'); expect(calls).toBe(1); expect(store.writes).toEqual([id]);
});
it('repeated network failures stop after 3 calls, preserving delay and attempt logs', async () => {
  const { store, deps } = setup(); deps.model = fakeModel(async () => { throw new ModelError('TIMEOUT'); });
  expect(await processJob(message, deps)).toBe('RETRY_SCHEDULED');
  expect(await processJob(message, deps)).toBe('RETRY_SCHEDULED');
  expect(await processJob(message, deps)).toBe('DEAD');
  expect(store.retries).toEqual([2000, 8000]); expect(store.logs.map(l => l.attempt)).toEqual([1, 2, 3]);
});
it('schema retry count survives a new invocation and auth errors do not retry', async () => {
  const { store, deps } = setup(); deps.model = fakeModel(async () => ({ ...modelResponse, rawContent: '{bad' }));
  expect(await processJob(message, deps)).toBe('RETRY_SCHEDULED');
  expect(await processJob(message, { ...deps })).toBe('DEAD'); expect(store.retries).toEqual([2000]);
  const next = setup(); next.deps.model = fakeModel(async () => { throw new ModelError('HTTP_ERROR', 401); });
  expect(await processJob(message, next.deps)).toBe('DEAD'); expect(next.store.retries).toEqual([]);
});
it('redelivery after commit/ack crash does not invoke model twice', async () => {
  const { store, deps } = setup(); let calls = 0; deps.model = fakeModel(async () => { calls++; return modelResponse; }); store.failAck = true;
  await expect(processJob(message, deps)).rejects.toThrow('ACK_UNAVAILABLE'); store.failAck = false;
  expect(await processJob(message, deps)).toBe('SKIPPED'); expect(calls).toBe(1); expect(store.writes).toHaveLength(1);
});
it('does not acknowledge a response when durable logging/commit is unavailable', async () => {
  const { store, deps } = setup(); store.failLog = true;
  await expect(processJob(message, deps)).rejects.toThrow('LOG_UNAVAILABLE');
  expect(store.writes).toEqual([]); expect(store.acks).toEqual([]); expect(store.jobs.get(id)!.status).toBe('RUNNING');
});
it('fences an expired worker while allowing a recovered lease to finish', async () => {
  const { store, deps } = setup(); let resume!: () => void;
  const paused = new Promise<void>(resolve => { resume = resolve; });
  const old = processJob(message, { ...deps, model: fakeModel(async () => { await paused; return modelResponse; }) });
  await new Promise(resolve => setTimeout(resolve, 0));
  await store.recoverExpired({ now: 60001, limit: 1 });
  expect(await processJob(message, deps)).toBe('SUCCEEDED'); resume();
  expect(await old).toBe('SKIPPED'); expect(store.writes).toEqual([id]); expect(store.logs).toHaveLength(2);
});
it('FR-SET-03 two jobs compete for the final reserved budget slot', async () => {
  const { store, deps } = setup(); const other = '00000000-0000-4000-8000-000000000002'; store.add(other); store.remainingBudget = 1;
  let calls = 0; deps.model = fakeModel(async () => { calls++; return modelResponse; });
  await Promise.all([processJob(message, deps), processJob({ job_id: other, message_id: `m-${other}` }, deps)]);
  expect(calls).toBe(1); expect(store.writes).toHaveLength(1); expect(store.fallbacks).toEqual(['BUDGET_EXCEEDED']);
});
it('caps unrelated version-conflict recomputation at three without recalling the model', async () => {
  const { store, deps } = setup(); let commits = 0; let calls = 0;
  store.commitResult = async () => { commits++; return 'VERSION_CONFLICT'; };
  deps.model = fakeModel(async () => { calls++; return modelResponse; });
  expect(await processJob(message, deps)).toBe('DEAD');
  expect(commits).toBe(3); expect(calls).toBe(1); expect(store.fallbacks).toEqual(['VERSION_CONFLICT']);
});
it('retains original alias identities when recomputing against a newer project version', async () => {
  const { store, deps } = setup(); const aliases = { T1: { id, project_id: store.jobs.get(id)!.project_id, kind: 'TASK' as const } };
  const seen: unknown[] = [];
  deps.registry = { EVENT_SUMMARIZE: { ...fixtureHandler,
    prepare: c => { const prepared = fixtureHandler.prepare(c); prepared.context = { ...prepared.context, aliases }; return prepared; },
    derive: (_value, _context, originalAliases) => { seen.push(originalAliases); return { kind: 'NONE' }; },
  } };
  deps.model = fakeModel(async () => { store.contexts.get(id)!.state_version++; return modelResponse; });
  expect(await processJob(message, deps)).toBe('SUCCEEDED');
  expect(seen).toHaveLength(2); expect(seen[0]).toBe(aliases); expect(seen[1]).toBe(aliases);
});
