import { describe, expect, it } from 'vitest';
import { ErrorEnvelope, MeResponse, successEnvelope } from './contracts.ts';
import { createApp } from './app.ts';
import { ApiError } from './lib/errors.ts';
import { routeTemplate } from './lib/middleware.ts';
import { StateVersionMismatch, withStateVersionRetry } from './lib/write-loop.ts';
import { captureLogger, fakeAuth, fixedMe, memoryIdempotency, testDeps } from './testing/fakes.ts';

const USER_ID = '0b9c7a52-6a4e-4f0e-9a43-1f6c2b0d8e11';
const PROJECT_ID = '3f2b8c1d-5e6a-4b7c-9d8e-0f1a2b3c4d5e';
const MEMBER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const TOKEN = 'valid-token';

function app(extra: Parameters<typeof testDeps>[0] = {}) {
  return createApp(
    testDeps({
      auth: fakeAuth({ [TOKEN]: { id: USER_ID, isAnonymous: true, email: null } }),
      ...extra,
    }),
  );
}

const auth = { Authorization: `Bearer ${TOKEN}` };

describe('api skeleton (spec §9.1, §9.2)', () => {
  it('401 UNAUTHENTICATED in the §9.2 envelope without a JWT', async () => {
    const res = await app().request('/api/v1/me');
    expect(res.status).toBe(401);
    const body = ErrorEnvelope.parse(await res.json());
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('401 for an invalid JWT', async () => {
    const res = await app().request('/api/v1/me', { headers: { Authorization: 'Bearer nope' } });
    expect(res.status).toBe(401);
  });

  it('404 NOT_FOUND envelope for unknown routes', async () => {
    const res = await app().request('/api/v1/does-not-exist', { headers: auth });
    expect(res.status).toBe(404);
    expect(ErrorEnvelope.parse(await res.json()).error.code).toBe('NOT_FOUND');
  });

  it('FR-AUTH-05 GET /v1/me returns memberships incl. PENDING in the success envelope', async () => {
    const me = fixedMe({
      [USER_ID]: [
        {
          member_id: MEMBER_ID,
          role: 'PARTICIPANT',
          status: 'PENDING',
          nickname: 'Alex',
          project: {
            id: PROJECT_ID,
            title: 'Fixture event',
            status: 'ACTIVE',
            venue_name: null,
            starts_at: '2026-12-01T01:00:00.000Z',
            ends_at: '2026-12-01T10:00:00.000Z',
            timezone: 'Asia/Ho_Chi_Minh',
          },
        },
      ],
    });
    const res = await app({ me }).request('/api/v1/me', { headers: auth });
    expect(res.status).toBe(200);
    const body = successEnvelope(MeResponse).parse(await res.json());
    expect(body.meta.state_version).toBe(0);
    expect(body.data.memberships[0]?.status).toBe('PENDING');
    expect(res.headers.get('X-Request-Id')).toBeTruthy();
  });

  it('500 INTERNAL when a repository breaks the response contract, without leaking details', async () => {
    const logger = captureLogger();
    const broken = {
      getMe: async () => ({ user: { id: 'not-a-uuid' }, memberships: [] }) as never,
    };
    const res = await app({ me: broken, logger }).request('/api/v1/me', { headers: auth });
    expect(res.status).toBe(500);
    const body = ErrorEnvelope.parse(await res.json());
    expect(body.error.code).toBe('INTERNAL');
    expect(JSON.stringify(body)).not.toContain('not-a-uuid');
    expect(logger.lines.some((l) => l.msg === 'response_contract_violation')).toBe(true);
  });

  it('NFR-09 logs one structured line per request without the JWT', async () => {
    const logger = captureLogger();
    await app({ logger }).request(`/api/v1/projects/${PROJECT_ID}/snapshot`, { headers: auth });
    const line = logger.lines.find((l) => l.msg === 'request');
    expect(line?.fields).toMatchObject({
      user_id: USER_ID,
      project_id: PROJECT_ID,
      route: '/api/v1/projects/:id/snapshot',
      status: 404,
    });
    expect(JSON.stringify(logger.lines)).not.toContain(TOKEN);
  });
});

describe('idempotency (INV-05, spec §9.1)', () => {
  function echoApp() {
    const store = memoryIdempotency();
    const a = app({ idempotency: store });
    let calls = 0;
    a.post('/v1/test-echo', async (c) => {
      calls += 1;
      const body = await c.req.json();
      if (body.fail) throw new ApiError('CONSTRAINT_VIOLATION');
      return c.json({ data: { calls, echo: body }, meta: { state_version: calls } }, 201);
    });
    return { a, store, calls: () => calls };
  }
  const key = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const post = (body: unknown, k: string | null = key) => ({
    method: 'POST',
    headers: {
      ...auth,
      'Content-Type': 'application/json',
      ...(k ? { 'X-Idempotency-Key': k } : {}),
    },
    body: JSON.stringify(body),
  });

  it('rejects mutations without a UUID v4 key', async () => {
    const { a } = echoApp();
    const res = await a.request('/api/v1/test-echo', post({ x: 1 }, null));
    expect(res.status).toBe(422);
    expect(ErrorEnvelope.parse(await res.json()).error.code).toBe('VALIDATION_FAILED');
  });

  it('replays the stored response for the same key and body; handler runs once', async () => {
    const { a, calls } = echoApp();
    const first = await a.request('/api/v1/test-echo', post({ x: 1 }));
    const second = await a.request('/api/v1/test-echo', post({ x: 1 }));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await second.json()).toEqual(await first.json());
    expect(second.headers.get('Idempotent-Replay')).toBe('true');
    expect(calls()).toBe(1);
  });

  it('422 IDEMPOTENCY_KEY_REUSED for the same key with a different body', async () => {
    const { a } = echoApp();
    await a.request('/api/v1/test-echo', post({ x: 1 }));
    const res = await a.request('/api/v1/test-echo', post({ x: 2 }));
    expect(res.status).toBe(422);
    expect(ErrorEnvelope.parse(await res.json()).error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('stores 4xx outcomes too, so a retry gets the same answer', async () => {
    const { a, calls } = echoApp();
    const r1 = await a.request('/api/v1/test-echo', post({ fail: true }));
    const r2 = await a.request('/api/v1/test-echo', post({ fail: true }));
    expect(r1.status).toBe(422);
    expect(r2.status).toBe(422);
    expect(calls()).toBe(1);
  });
});

describe('write loop (spec §11.0)', () => {
  it('retries a state_version mismatch and succeeds without the caller noticing', async () => {
    let n = 0;
    const result = await withStateVersionRetry(async () => {
      n += 1;
      if (n < 3) throw new StateVersionMismatch(5, 6);
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(n).toBe(3);
  });

  it('gives up after 3 attempts with 409 VERSION_CONFLICT', async () => {
    await expect(
      withStateVersionRetry(async () => {
        throw new StateVersionMismatch(5, 7);
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT', status: 409 });
  });

  it('does not retry other errors', async () => {
    let n = 0;
    await expect(
      withStateVersionRetry(async () => {
        n += 1;
        throw new ApiError('FORBIDDEN');
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(n).toBe(1);
  });
});

describe('route template', () => {
  it('replaces ids so logs never carry them in the route name', () => {
    expect(routeTemplate(`/api/v1/members/${MEMBER_ID}/decision`)).toBe(
      '/api/v1/members/:id/decision',
    );
  });
});
