/**
 * Binds a contracts `EndpointDef` to a Hono handler: path conversion, strict body / query
 * validation (SEC-04), and the success envelope (spec §9.1). Responses are checked against
 * the contract's `data` schema so the API cannot drift from `packages/contracts`.
 */
import type { Hono } from 'hono';
import type { BodyOf, DataOf, EndpointDef, QueryOf } from '../contracts.ts';
import type { Ctx, Env } from './context.ts';
import { ApiError, validationError } from './errors.ts';

export interface HandlerResult<D> {
  data: D;
  stateVersion: number;
  status?: 200 | 201 | 202;
}

type Handler<E extends EndpointDef> = (args: {
  c: Ctx;
  body: BodyOf<E>;
  query: QueryOf<E>;
  params: Record<string, string>;
}) => Promise<HandlerResult<DataOf<E>>>;

/** `/projects/{pid}/snapshot` → `/v1/projects/:pid/snapshot`. */
export function honoPath(path: string): string {
  return `/v1${path.replace(/\{(\w+)\}/g, ':$1')}`;
}

export function register<E extends EndpointDef>(app: Hono<Env>, def: E, handler: Handler<E>): void {
  const method = def.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
  app[method](honoPath(def.path), async (c) => {
    let body: unknown = undefined;
    if (def.body) {
      const json = await c.req.json().catch(() => {
        throw new ApiError('VALIDATION_FAILED', 'Request body must be JSON.', { where: 'body' });
      });
      const parsed = def.body.safeParse(json);
      if (!parsed.success) throw validationError(parsed.error, 'body');
      body = parsed.data;
    }
    let query: unknown = undefined;
    if (def.query) {
      const parsed = def.query.safeParse(c.req.query());
      if (!parsed.success) throw validationError(parsed.error, 'query');
      query = parsed.data;
    }
    const result = await handler({
      c,
      body: body as never,
      query: query as never,
      params: c.req.param() as Record<string, string>,
    });
    const checked = def.data.safeParse(result.data);
    if (!checked.success) {
      c.get('deps').logger.error('response_contract_violation', {
        request_id: c.get('requestId'),
        endpoint: def.no,
        issues: checked.error.issues.slice(0, 5).map((i) => i.path.join('.')),
      });
      throw new ApiError('INTERNAL');
    }
    return c.json(
      { data: checked.data, meta: { state_version: result.stateVersion } },
      result.status ?? 200,
    );
  });
}
