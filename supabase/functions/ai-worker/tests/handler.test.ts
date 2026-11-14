import { expect, it } from 'vitest';
import { createWorkerHandler } from '../handler.ts';
import type { WorkerDeps } from '../ports.ts';
import { InMemoryStore } from '../../../../tests/ai-evals/support/in-memory-store.ts';
import { fakeModel } from '../../../../tests/ai-evals/support/fake-model.ts';

const secret = 'internal-worker-test-secret';
const request = (auth = `Bearer ${secret}`, body = '{"mode":"drain"}', method = 'POST') =>
  new Request('http://localhost/worker', {
    method,
    headers: { Authorization: auth },
    ...(method === 'POST' ? { body } : {}),
  });
function setup() {
  const store = new InMemoryStore();
  let received = 0;
  store.receive = async () => {
    received++;
    return [];
  };
  const deps: WorkerDeps = {
    store,
    model: fakeModel(),
    modelId: 'test/model',
    registry: {},
    nowMs: () => 0,
  };
  return { handler: createWorkerHandler(deps, secret), received: () => received, store };
}
it.each(['', 'Bearer wrong-secret', 'Bearer user.jwt.token'])(
  'INV-12 rejects unauthorized calls before store access: %s',
  async (auth) => {
    const { handler, received } = setup();
    expect((await handler(request(auth))).status).toBe(401);
    expect(received()).toBe(0);
  },
);
it('requires a separate nonempty secret at construction', () => {
  expect(() => createWorkerHandler(null, '')).toThrow('AI_WORKER_SECRET_REQUIRED');
});
it.each(['{bad', '{"mode":"unknown"}', '{"mode":"drain","model":"arbitrary"}', 'null'])(
  'rejects invalid control bodies: %s',
  async (body) => {
    const { handler, received } = setup();
    expect((await handler(request(undefined, body))).status).toBe(400);
    expect(received()).toBe(0);
  },
);
it('does not allow GET to trigger jobs', async () => {
  const { handler, received } = setup();
  expect((await handler(request(undefined, '', 'GET'))).status).toBe(405);
  expect(received()).toBe(0);
});
it('reports integration pending without consuming work when no real store is bound', async () => {
  const response = await createWorkerHandler(null, secret)(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: { code: 'INTEGRATION_PENDING' } });
});
it('returns an explicit empty batch and reports queue-only sweep scope', async () => {
  const { handler, received } = setup();
  expect(await (await handler(request())).json()).toEqual({
    data: { processed: 0, outcomes: [], scope: 'queue' },
  });
  expect(await (await handler(request(undefined, '{"mode":"sweep"}'))).json()).toMatchObject({
    data: { scope: 'queue_recovery_only' },
  });
  expect(received()).toBe(2);
});
it('sanitizes store failures and refuses to report success', async () => {
  const { handler, store } = setup();
  store.receive = async () => {
    throw new Error('secret-sentinel');
  };
  const response = await handler(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('sentinel');
});
