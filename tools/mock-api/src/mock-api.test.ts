import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CONSENT_VERSION,
  CreateProjectData,
  ErrorEnvelope,
  JoinData,
  MeResponse,
  ResolveInviteData,
  Snapshot,
  successEnvelope,
} from '@weave/contracts';
import { Fixture } from './fixture.ts';
import { createMockApp } from './server.ts';

const seed = JSON.parse(
  readFileSync(new URL('../../../tests/fixtures/mock-api/seed.json', import.meta.url), 'utf8'),
);
const PROJECT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BASE = '/functions/v1/api/v1';
const silent = { info: () => {}, error: () => {} };

function mock() {
  const signals: [string, number, string][] = [];
  const { app, state } = createMockApp(seed, {
    now: () => new Date('2026-11-20T00:00:00Z'),
    logger: silent,
    onSignal: (p, v, e) => signals.push([p, v, e]),
  });
  const call = async (
    token: string,
    method: string,
    path: string,
    body?: unknown,
    key?: string,
  ) => {
    const res = await app.request(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(method === 'GET' ? {} : { 'X-Idempotency-Key': key ?? crypto.randomUUID() }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: res.status, json: (await res.json()) as unknown };
  };
  return { call, state, signals };
}

const errCode = (json: unknown) => ErrorEnvelope.parse(json).error.code;

describe('fixture (spec §15.5: fixtures are checked against contracts)', () => {
  it('tests/fixtures/mock-api/seed.json matches the contracts', () => {
    expect(Fixture.safeParse(seed).success).toBe(true);
  });
});

describe('mock API — milestone 1 join flow', () => {
  it('FR-AUTH-05 GET /me lists memberships, including PENDING', async () => {
    const { call } = mock();
    const r = await call('mock-pending', 'GET', '/me');
    const me = successEnvelope(MeResponse).parse(r.json);
    expect(me.data.memberships.map((m) => m.status)).toEqual(['PENDING']);
  });

  it('snapshot is contract-valid and hides owner-only data from participants (spec §3, §9.4)', async () => {
    const { call } = mock();
    const r = await call('mock-participant', 'GET', `/projects/${PROJECT}/snapshot`);
    expect(r.status).toBe(200);
    const snap = successEnvelope(Snapshot).parse(r.json).data;
    expect(snap.project.settings).toBeNull();
    expect(snap.invite).toBeNull();
    expect(snap.pending_members).toEqual([]);
    expect(snap.my_assignments).toHaveLength(1);

    const owner = successEnvelope(Snapshot).parse(
      (await call('mock-organizer', 'GET', `/projects/${PROJECT}/snapshot`)).json,
    ).data;
    expect(owner.project.settings).not.toBeNull();
    expect(owner.pending_members.map((m) => m.nickname)).toEqual(['Riley']);
  });

  it('AT-05 a PENDING member cannot read the snapshot; a non-member gets 404', async () => {
    const { call } = mock();
    expect(errCode((await call('mock-pending', 'GET', `/projects/${PROJECT}/snapshot`)).json)).toBe(
      'FORBIDDEN',
    );
    expect(errCode((await call('mock-guest', 'GET', `/projects/${PROJECT}/snapshot`)).json)).toBe(
      'NOT_FOUND',
    );
  });

  it('AT-02 an anonymous user cannot create a project', async () => {
    const { call } = mock();
    const r = await call('mock-guest', 'POST', '/projects', {
      title: 'Guest event',
      brief: 'A brief that is long enough to pass the forty character minimum.',
      starts_at: '2026-12-10T01:00:00Z',
      ends_at: '2026-12-10T05:00:00Z',
      timezone: 'Asia/Ho_Chi_Minh',
      expected_team_size: 4,
    });
    expect(r.status).toBe(403);
    expect(errCode(r.json)).toBe('FORBIDDEN');
  });

  it('INV-05 creating a project twice with the same key creates it once', async () => {
    const { call, state } = mock();
    const body = {
      title: 'Organizer event',
      brief: 'A brief that is long enough to pass the forty character minimum.',
      starts_at: '2026-12-10T01:00:00Z',
      ends_at: '2026-12-10T05:00:00Z',
      timezone: 'Asia/Ho_Chi_Minh',
      expected_team_size: 4,
    };
    const key = crypto.randomUUID();
    const a = successEnvelope(CreateProjectData).parse(
      (await call('mock-organizer', 'POST', '/projects', body, key)).json,
    );
    const b = successEnvelope(CreateProjectData).parse(
      (await call('mock-organizer', 'POST', '/projects', body, key)).json,
    );
    expect(b.data.project.id).toBe(a.data.project.id);
    expect(state.projects.filter((p) => p.title === 'Organizer event')).toHaveLength(1);
    expect(a.data.project.status).toBe('DRAFT');
    expect(a.data.me.role).toBe('OWNER');
  });

  it('AT-04 wrong codes return INVITE_INVALID; too many attempts return 429', async () => {
    const { call } = mock();
    for (let i = 0; i < 10; i++) {
      const r = await call('mock-guest', 'POST', '/invites/resolve', { code: 'ZZZZZZ' });
      expect(errCode(r.json)).toBe('INVITE_INVALID');
    }
    const limited = await call('mock-guest', 'POST', '/invites/resolve', { code: 'K7P4QX' });
    expect(limited.status).toBe(429);
    expect(errCode(limited.json)).toBe('RATE_LIMITED');
  });

  it('FR-MEM-02/04 guest resolves, joins as PENDING, owner approves, guest reads the snapshot', async () => {
    const { call, signals } = mock();
    const resolved = successEnvelope(ResolveInviteData).parse(
      (await call('mock-guest', 'POST', '/invites/resolve', { code: 'k7p4qx' })).json,
    );
    expect(resolved.data.project_id).toBe(PROJECT);

    const joined = await call('mock-guest', 'POST', '/invites/join', {
      code: 'K7P4QX',
      nickname: 'Jordan',
      role_tags: ['av'],
      availability: { whole_event: true },
      consent_version: CONSENT_VERSION,
    });
    expect(joined.status).toBe(201);
    const member = successEnvelope(JoinData).parse(joined.json).data.member;
    expect(member.status).toBe('PENDING');

    const decided = await call('mock-organizer', 'POST', `/members/${member.id}/decision`, {
      decision: 'APPROVE',
      expected_version: member.version,
    });
    expect(decided.status).toBe(200);

    const snap = await call('mock-guest', 'GET', `/projects/${PROJECT}/snapshot`);
    expect(snap.status).toBe(200);
    expect(signals.map(([, , e]) => e)).toEqual(['MEMBER_JOIN_REQUESTED', 'MEMBER_APPROVED']);
  });

  it('rejects a duplicate nickname (case-insensitive) and a stale expected_version', async () => {
    const { call } = mock();
    const dup = await call('mock-guest', 'POST', '/invites/join', {
      code: 'K7P4QX',
      nickname: 'sam',
      role_tags: [],
      availability: { whole_event: true },
      consent_version: CONSENT_VERSION,
    });
    expect(errCode(dup.json)).toBe('CONSTRAINT_VIOLATION');

    const stale = await call(
      'mock-organizer',
      'POST',
      '/members/0a000000-0000-4000-8000-000000000003/decision',
      {
        decision: 'APPROVE',
        expected_version: 99,
      },
    );
    expect(stale.status).toBe(409);
    expect(errCode(stale.json)).toBe('VERSION_CONFLICT');
  });

  it('AT-07 removing a member releases their assignment and their access', async () => {
    const { call, state } = mock();
    const r = await call(
      'mock-organizer',
      'POST',
      '/members/0a000000-0000-4000-8000-000000000002/remove',
      {},
    );
    expect(r.status).toBe(200);
    expect(state.assignments[0]?.status).toBe('RELEASED');
    expect(state.tasks.find((t) => t.id === '0e000000-0000-4000-8000-000000000002')?.status).toBe(
      'OPEN',
    );
    expect(
      errCode((await call('mock-participant', 'GET', `/projects/${PROJECT}/snapshot`)).json),
    ).toBe('NOT_FOUND');
  });

  it('the owner cannot leave; only role_tags of others can be edited by the owner', async () => {
    const { call } = mock();
    expect(
      errCode((await call('mock-organizer', 'POST', `/projects/${PROJECT}/leave`, {})).json),
    ).toBe('FORBIDDEN');
    const r = await call(
      'mock-organizer',
      'PATCH',
      '/members/0a000000-0000-4000-8000-000000000002',
      {
        presence: 'UNAVAILABLE',
      },
    );
    expect(errCode(r.json)).toBe('FORBIDDEN');
  });
});
