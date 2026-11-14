/** In-memory fakes of the ports for Vitest. Not imported by index.ts. */
import type { MeResponse } from '../contracts.ts';
import type {
  AuthUser,
  Deps,
  IdempotencyRecord,
  IdempotencyStore,
  Logger,
  MeRepository,
} from '../ports.ts';

export function fakeAuth(users: Record<string, Omit<AuthUser, 'jwt'>>) {
  return {
    async verify(jwt: string): Promise<AuthUser | null> {
      const u = users[jwt];
      return u ? { ...u, jwt } : null;
    },
  };
}

export function memoryIdempotency(): IdempotencyStore & { size(): number } {
  const rows = new Map<string, IdempotencyRecord & { operation: string }>();
  return {
    async get(userId, key) {
      return rows.get(`${userId}:${key}`) ?? null;
    },
    async put(userId, key, operation, record) {
      const k = `${userId}:${key}`;
      if (rows.has(k)) return false;
      rows.set(k, { ...record, operation });
      return true;
    },
    size: () => rows.size,
  };
}

export function fixedMe(byUser: Record<string, MeResponse['memberships']>): MeRepository {
  return {
    async getMe(user) {
      return {
        user: { id: user.id, is_anonymous: user.isAnonymous, email: user.email },
        memberships: byUser[user.id] ?? [],
      };
    },
  };
}

export function captureLogger(): Logger & {
  lines: { level: string; msg: string; fields?: Record<string, unknown> }[];
} {
  const lines: { level: string; msg: string; fields?: Record<string, unknown> }[] = [];
  return {
    lines,
    info: (msg, fields) => void lines.push({ level: 'info', msg, ...(fields ? { fields } : {}) }),
    error: (msg, fields) => void lines.push({ level: 'error', msg, ...(fields ? { fields } : {}) }),
  };
}

export function testDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    auth: fakeAuth({}),
    idempotency: memoryIdempotency(),
    me: fixedMe({}),
    logger: captureLogger(),
    now: () => new Date('2026-11-14T00:00:00Z'),
    functionName: 'api',
    ...overrides,
  };
}
