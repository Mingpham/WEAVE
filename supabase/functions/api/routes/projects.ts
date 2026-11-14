import type { Hono } from 'hono';
import { CreateProject, IDEMPOTENCY_HEADER } from '../contracts.ts';
import type { Env } from '../lib/context.ts';
import { ApiError } from '../lib/errors.ts';
import { register } from '../lib/route.ts';

export function registerProjectRoutes(app: Hono<Env>): void {
  register(app, CreateProject, async ({ c, body }) => {
    const user = c.get('user');
    if (user.isAnonymous) throw new ApiError('FORBIDDEN');
    const repository = c.get('deps').projects;
    if (!repository) throw new ApiError('INTERNAL');
    const result = await repository.create(user, body, c.req.header(IDEMPOTENCY_HEADER)!);
    return { ...result, status: 201 };
  });
}
