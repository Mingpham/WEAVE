/**
 * Builds the mock app: the real `api` app (same middleware, validation, envelope) with
 * in-memory ports, plus mock handlers for routes the real API has not implemented yet.
 */
import type { Hono } from 'hono';
import { createApp } from '../../../supabase/functions/api/app.ts';
import type { Env } from '../../../supabase/functions/api/lib/context.ts';
import type { Logger, MeRepository } from '../../../supabase/functions/api/ports.ts';
import { memoryIdempotency } from '../../../supabase/functions/api/testing/fakes.ts';
import { Fixture } from './fixture.ts';
import type { MockHooks } from './routes.ts';
import { registerMockRoutes } from './routes.ts';
import { createState } from './store.ts';
import type { MockState } from './store.ts';

/** Same prefix as the deployed function, so the mobile client only swaps the host. */
export const MOCK_FUNCTION_NAME = 'functions/v1/api';

export interface MockOptions extends MockHooks {
  now?: () => Date;
  logger?: Logger;
}

export function createMockApp(
  fixtureJson: unknown,
  opts: MockOptions = {},
): { app: Hono<Env>; state: MockState } {
  const state = createState(Fixture.parse(fixtureJson));
  const now = opts.now ?? (() => new Date());

  const me: MeRepository = {
    async getMe(user) {
      const memberships = state.members
        .filter((m) => m.user_id === user.id && ['PENDING', 'APPROVED'].includes(m.status))
        .flatMap((m) => {
          const p = state.projects.find((x) => x.id === m.project_id && !x.deleted);
          if (!p) return [];
          const { id, title, status, venue_name, starts_at, ends_at, timezone } = p;
          return [
            {
              member_id: m.id,
              role: m.role,
              status: m.status,
              nickname: m.nickname,
              project: { id, title, status, venue_name, starts_at, ends_at, timezone },
            },
          ];
        });
      return {
        user: { id: user.id, is_anonymous: user.isAnonymous, email: user.email },
        memberships,
      };
    },
  };

  const app = createApp({
    auth: {
      async verify(jwt) {
        const u = state.users.find((x) => x.token === jwt);
        return u ? { id: u.id, isAnonymous: u.is_anonymous, email: u.email, jwt } : null;
      },
    },
    idempotency: memoryIdempotency(),
    me,
    logger: opts.logger ?? {
      info: (msg, f) => console.log(JSON.stringify({ level: 'info', msg, ...f })),
      error: (msg, f) => console.error(JSON.stringify({ level: 'error', msg, ...f })),
    },
    now,
    functionName: MOCK_FUNCTION_NAME,
  });
  registerMockRoutes(app, state, now, opts);
  return { app, state };
}
