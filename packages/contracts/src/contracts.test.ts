import { describe, expect, it } from 'vitest';
import {
  CreateProjectBody,
  DB_ENUMS,
  ENDPOINTS,
  EventType,
  ERROR_HTTP_STATUS,
  ErrorCode,
  INVITE_CODE_ALPHABET,
  InviteCode,
  JoinBody,
  PENDING_ENDPOINTS,
  POL,
  PlanDraft,
  EMPTY_PLAN_DRAFT,
  SPEC_LISTED_EVENT_TYPES,
  Snapshot,
  UpdateMemberBody,
  isMutation,
} from './index.ts';

const iso = (s: string) => new Date(s).toISOString();

describe('enums (spec §7.2)', () => {
  it('defines all 49 Postgres enums', () => {
    expect(Object.keys(DB_ENUMS)).toHaveLength(49);
  });

  it('has no duplicate values inside an enum', () => {
    for (const [name, e] of Object.entries(DB_ENUMS)) {
      expect(new Set(e.options).size, name).toBe(e.options.length);
    }
  });
});

describe('policy (Appendix B)', () => {
  it('uses the D-15 AI limits, not the ADR ones', () => {
    expect(POL.MAX_AI_CALLS_PER_INCIDENT).toBe(8);
    expect(POL.MAX_PROBES_PER_INCIDENT).toBe(3);
  });

  it('invite alphabet excludes ambiguous characters (FR-MEM-01)', () => {
    for (const ch of '0O1IL') expect(INVITE_CODE_ALPHABET).not.toContain(ch);
  });
});

describe('errors (spec §9.2)', () => {
  it('maps every code to an HTTP status', () => {
    for (const code of ErrorCode.options) expect(ERROR_HTTP_STATUS[code]).toBeGreaterThan(399);
  });
});

describe('event types (spec §9.7)', () => {
  it('contains every type the spec lists', () => {
    for (const t of SPEC_LISTED_EVENT_TYPES) expect(EventType.options).toContain(t);
  });
});

describe('endpoint registry (spec §9.3)', () => {
  it('covers rows 1–53 exactly once between defined and pending', () => {
    const rows = [...ENDPOINTS.map((e) => e.no), ...PENDING_ENDPOINTS.map(([n]) => n)].sort(
      (a, b) => a - b,
    );
    expect(rows).toEqual(Array.from({ length: 53 }, (_, i) => i + 1));
  });

  it('gives every mutation a body schema', () => {
    for (const e of ENDPOINTS) if (isMutation(e.method)) expect(e.body, `#${e.no}`).not.toBeNull();
  });

  it('marks versioned endpoints with an expected_version field', () => {
    for (const e of ENDPOINTS.filter((x) => x.versioned)) {
      expect(JSON.stringify(e.body?.toJSONSchema()), `#${e.no}`).toMatch(
        /expected_(version|revision)/,
      );
    }
  });
});

describe('request schemas', () => {
  const base = {
    title: 'Test event',
    brief: 'A community meetup with check-in, two rooms and a small volunteer team.',
    starts_at: iso('2026-12-01T08:00:00Z'),
    ends_at: iso('2026-12-01T18:00:00Z'),
    timezone: 'Asia/Ho_Chi_Minh',
    expected_team_size: 8,
  };

  it('FR-EVT-01 accepts a valid project', () => {
    expect(CreateProjectBody.safeParse(base).success).toBe(true);
  });

  it('FR-EVT-01 rejects ends_at before starts_at and events longer than 72h', () => {
    expect(CreateProjectBody.safeParse({ ...base, ends_at: base.starts_at }).success).toBe(false);
    expect(
      CreateProjectBody.safeParse({ ...base, ends_at: iso('2026-12-05T08:00:00Z') }).success,
    ).toBe(false);
  });

  it('SEC-04 rejects unknown fields', () => {
    expect(CreateProjectBody.safeParse({ ...base, owner_user_id: 'x' }).success).toBe(false);
  });

  it('FR-MEM-01 normalises invite codes and rejects ambiguous characters', () => {
    expect(InviteCode.parse(' abc234 ')).toBe('ABC234');
    expect(InviteCode.safeParse('ABC10O').success).toBe(false);
  });

  it('FR-MEM-02 requires a nickname of 2–24 characters', () => {
    const join = {
      code: 'ABC234',
      role_tags: ['check-in'],
      availability: { whole_event: true },
      consent_version: 'v1',
    };
    expect(JoinBody.safeParse({ ...join, nickname: 'A' }).success).toBe(false);
    expect(JoinBody.safeParse({ ...join, nickname: 'Alex' }).success).toBe(true);
  });

  it('FR-MEM-05 only allows a reason when marking unavailable', () => {
    expect(UpdateMemberBody.safeParse({ unavailable_reason: 'sick' }).success).toBe(false);
    expect(
      UpdateMemberBody.safeParse({ presence: 'UNAVAILABLE', unavailable_reason: 'sick' }).success,
    ).toBe(true);
  });
});

describe('read models', () => {
  it('accepts the empty plan draft', () => {
    expect(PlanDraft.parse(EMPTY_PLAN_DRAFT)).toEqual(EMPTY_PLAN_DRAFT);
  });

  it('keeps extended views strict (unknown fields rejected)', () => {
    const member = {
      id: '7d3f1c2a-4b5e-4c6d-8e7f-9a0b1c2d3e4f',
      nickname: 'Alex',
      role: 'PARTICIPANT',
      role_tags: [],
      presence: 'NOT_ARRIVED',
      current_area_id: null,
      status: 'APPROVED',
      availability: { whole_event: true },
      consent_at: null,
      consent_version: null,
      version: 1,
    };
    const me = Snapshot.shape.me;
    expect(me.safeParse(member).success).toBe(true);
    expect(me.safeParse({ ...member, user_id: 'leak' }).success).toBe(false);
  });
});
