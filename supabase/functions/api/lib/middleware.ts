/** Request logging, authentication and idempotency (spec §9.1, NFR-09, SEC-02). */
import type { MiddlewareHandler } from 'hono';
import { IDEMPOTENCY_HEADER, IdempotencyKey, POL } from '../contracts.ts';
import type { Env } from './context.ts';
import { sha256Hex } from './context.ts';
import { ApiError } from './errors.ts';

const UUID_IN_PATH = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi;
const PROJECT_IN_PATH =
  /\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/** `/api/v1/projects/<uuid>/snapshot` → `/api/v1/projects/:id/snapshot` (no ids in route names). */
export function routeTemplate(path: string): string {
  return path.replace(UUID_IN_PATH, '/:id');
}

/** One structured JSON line per request. Never logs headers, JWTs, bodies or signed URLs. */
export const requestLog: MiddlewareHandler<Env> = async (c, next) => {
  const started = Date.now();
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  try {
    await next();
  } finally {
    const user = c.get('user');
    c.get('deps').logger.info('request', {
      request_id: requestId,
      user_id: user?.id ?? null,
      project_id: PROJECT_IN_PATH.exec(c.req.path)?.[1] ?? null,
      method: c.req.method,
      route: routeTemplate(c.req.path),
      status: c.res.status,
      duration_ms: Date.now() - started,
    });
  }
};

/** Every route requires `Authorization: Bearer <jwt>` (spec §9.1). */
export const requireAuth: MiddlewareHandler<Env> = async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match?.[1]) throw new ApiError('UNAUTHENTICATED');
  const user = await c.get('deps').auth.verify(match[1]);
  if (!user) throw new ApiError('UNAUTHENTICATED');
  c.set('user', user);
  await next();
};

const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * `X-Idempotency-Key` is required on every mutation (INV-05). Same (user, key) and same
 * request → replay the stored response. Same key, different request → 422
 * IDEMPOTENCY_KEY_REUSED. 5xx responses are not stored so the client can retry.
 */
export const idempotency: MiddlewareHandler<Env> = async (c, next) => {
  if (!MUTATIONS.has(c.req.method)) return next();

  const raw = c.req.header(IDEMPOTENCY_HEADER);
  const parsed = IdempotencyKey.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError('VALIDATION_FAILED', `${IDEMPOTENCY_HEADER} must be a UUID v4.`, {
      where: 'header',
      header: IDEMPOTENCY_HEADER,
    });
  }
  const key = parsed.data;
  const user = c.get('user');
  const { idempotency: store } = c.get('deps');
  const operation = `${c.req.method} ${routeTemplate(c.req.path)}`;
  const requestHash = await sha256Hex(`${c.req.method} ${c.req.path}\n${await c.req.text()}`);

  const existing = await store.get(user.id, key);
  if (existing) return replay(existing, requestHash);

  await next();

  const status = c.res.status;
  if (status >= 500) return;
  const body = await c.res
    .clone()
    .json()
    .catch(() => null);
  const saved = await store.put(user.id, key, operation, { requestHash, status, body });
  if (!saved) {
    const winner = await store.get(user.id, key);
    if (winner) c.res = replay(winner, requestHash);
  }
};

function replay(
  record: { requestHash: string; status: number; body: unknown },
  requestHash: string,
) {
  if (record.requestHash !== requestHash) throw new ApiError('IDEMPOTENCY_KEY_REUSED');
  return new Response(JSON.stringify(record.body), {
    status: record.status,
    headers: { 'Content-Type': 'application/json', 'Idempotent-Replay': 'true' },
  });
}

/** Retention for stored keys (POL.IDEMPOTENCY_TTL_HOURS); the cleanup job uses this. */
export const IDEMPOTENCY_TTL_MS = POL.IDEMPOTENCY_TTL_HOURS * 3_600_000;
