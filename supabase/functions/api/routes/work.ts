import type { Hono } from 'hono';
import {
  CreateTask,
  GetWork,
  SendOffers,
  RespondAssignment,
  ReleaseAssignment,
  StartTask,
  TaskStatusAction,
  IDEMPOTENCY_HEADER,
  Uuid,
} from '../contracts.ts';
import { register } from '../lib/route.ts';
import type { Env } from '../lib/context.ts';
import { ApiError } from '../lib/errors.ts';
import type { SupabaseConfig } from '../adapters/supabase.ts';
import { readWork, mutateWork } from '../adapters/work.ts';

export function registerWorkRoutes(app: Hono<Env>, cfg: SupabaseConfig) {
  register(app, GetWork, async ({ c, params }) => {
    if (!Uuid.safeParse(params.pid).success) throw new ApiError('VALIDATION_FAILED');
    const u = c.get('user');
    const data = await readWork(cfg, u.jwt, u.id, params.pid!);
    return { data, stateVersion: data.project.state_version };
  });
  register(app, CreateTask, ({ c, body, params }) =>
    mutateWork(
      cfg,
      c.get('user').jwt,
      'CREATE',
      params.pid!,
      body,
      c.req.header(IDEMPOTENCY_HEADER)!,
    ),
  );
  register(app, SendOffers, ({ c, body, params }) =>
    mutateWork(
      cfg,
      c.get('user').jwt,
      'OFFERS',
      params.pid!,
      body,
      c.req.header(IDEMPOTENCY_HEADER)!,
    ),
  );
  register(app, RespondAssignment, ({ c, body, params }) =>
    mutateWork(
      cfg,
      c.get('user').jwt,
      'RESPOND',
      params.aid!,
      body,
      c.req.header(IDEMPOTENCY_HEADER)!,
    ),
  );
  register(app, ReleaseAssignment, ({ c, body, params }) =>
    mutateWork(
      cfg,
      c.get('user').jwt,
      'RELEASE',
      params.aid!,
      body,
      c.req.header(IDEMPOTENCY_HEADER)!,
    ),
  );
  register(app, StartTask, ({ c, body, params }) =>
    mutateWork(
      cfg,
      c.get('user').jwt,
      'START',
      params.tid!,
      body,
      c.req.header(IDEMPOTENCY_HEADER)!,
    ),
  );
  register(app, TaskStatusAction, ({ c, body, params }) =>
    mutateWork(
      cfg,
      c.get('user').jwt,
      'STATUS',
      params.tid!,
      body,
      c.req.header(IDEMPOTENCY_HEADER)!,
    ),
  );
}
