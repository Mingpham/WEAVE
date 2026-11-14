/**
 * The `api` Edge Function app (spec §9). Pure: no Deno globals, so Vitest can run it with
 * in-memory deps. The Deno entry point (index.ts) wires the Supabase adapters.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './lib/context.ts';
import { ApiError } from './lib/errors.ts';
import { idempotency, requestLog, requireAuth } from './lib/middleware.ts';
import type { Deps } from './ports.ts';
import { registerMeRoutes } from './routes/me.ts';
import { registerProjectRoutes } from './routes/projects.ts';
import { registerMembershipRoutes } from './routes/membership.ts';
import { registerPlanningRoutes } from './routes/planning.ts';
import { registerWorkRoutes } from './routes/work.ts';

export function createApp(deps: Deps): Hono<Env> {
  const app = new Hono<Env>().basePath(`/${deps.functionName}`);

  // Bearer authentication only: no ambient cookies or credentialed cross-origin requests.
  app.use(
    '*',
    cors({
      origin: '*',
      allowHeaders: ['Authorization', 'apikey', 'Content-Type', 'X-Idempotency-Key'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['X-Request-Id'],
    }),
  );

  app.use('*', async (c, next) => {
    c.set('deps', deps);
    await next();
  });
  app.use('*', requestLog);
  app.use('/v1/*', requireAuth);
  app.use('/v1/*', idempotency);

  registerMeRoutes(app);
  if (deps.projects) registerProjectRoutes(app);
  if (deps.supabaseConfig) {
    registerMembershipRoutes(app, deps.supabaseConfig);
    registerPlanningRoutes(app, deps.supabaseConfig);
    registerWorkRoutes(app, deps.supabaseConfig);
  }

  app.notFound((c) => c.json(new ApiError('NOT_FOUND').toEnvelope(), 404));

  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json(err.toEnvelope(), err.status as 400);
    deps.logger.error('unhandled_error', {
      request_id: c.get('requestId'),
      error: err instanceof Error ? err.name : 'unknown',
      // Message only, never stack/request content (SEC-02); truncated defensively.
      message: err instanceof Error ? err.message.slice(0, 200) : null,
    });
    return c.json(new ApiError('INTERNAL').toEnvelope(), 500);
  });

  return app;
}
