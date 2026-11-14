import type { Hono } from 'hono';
import {
  GetPlan,
  PatchPlan,
  PublishPlan,
  ComposePlan,
} from '../../../../packages/contracts/src/api/planning.ts';
import { Uuid, IDEMPOTENCY_HEADER } from '../contracts.ts';
import { planningRepository } from '../adapters/planning.ts';
import type { SupabaseConfig } from '../adapters/supabase.ts';
import type { Env, Ctx } from '../lib/context.ts';
import { ApiError } from '../lib/errors.ts';
import { register } from '../lib/route.ts';
export function registerPlanningRoutes(app: Hono<Env>, cfg: SupabaseConfig): void {
  const repo = (c: Ctx, pid: string) => {
    if (!Uuid.safeParse(pid).success) throw new ApiError('VALIDATION_FAILED');
    return planningRepository(cfg, c.get('user'));
  };
  register(app, GetPlan, async ({ c, params }) => {
    const data = await repo(c, params.pid!).get(params.pid!);
    return { data, stateVersion: data.state_version };
  });
  register(app, PatchPlan, async ({ c, params, body }) =>
    repo(c, params.pid!).mutate(params.pid!, body, c.req.header(IDEMPOTENCY_HEADER)!),
  );
  register(app, PublishPlan, async ({ c, params, body }) =>
    repo(c, params.pid!).mutate(
      params.pid!,
      { ...body, ops: [] },
      c.req.header(IDEMPOTENCY_HEADER)!,
      true,
    ),
  );
  register(app, ComposePlan, async ({ c, params, body }) => {
    const repository = repo(c, params.pid!);
    await repository.get(params.pid!);
    if (body.mode === 'FINALIZE')
      return repository.mutate(
        params.pid!,
        {
          expected_state_version: body.expected_state_version,
          expected_revision: body.expected_revision,
          ops: [],
          finalize: true,
        },
        c.req.header(IDEMPOTENCY_HEADER)!,
      );
    throw new ApiError(
      'INVALID_TRANSITION',
      "AI couldn't update the plan. You can keep editing manually or try again.",
    );
  });
}
