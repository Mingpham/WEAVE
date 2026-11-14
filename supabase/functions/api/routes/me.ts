/** Endpoint #1 `GET /v1/me` (FR-AUTH-05). Read-only; `meta.state_version` is 0 (no project). */
import type { Hono } from 'hono';
import { GetMe } from '../contracts.ts';
import type { Env } from '../lib/context.ts';
import { register } from '../lib/route.ts';

export function registerMeRoutes(app: Hono<Env>): void {
  register(app, GetMe, async ({ c }) => {
    const data = await c.get('deps').me.getMe(c.get('user'));
    return { data, stateVersion: 0 };
  });
}
