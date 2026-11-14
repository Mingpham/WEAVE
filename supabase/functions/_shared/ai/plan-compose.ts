import type { PlanComposeOutput } from '../../../../packages/contracts/src/ai/index.ts';
import { PlanComposeOutputSchema } from '../../../../packages/contracts/src/ai/index.ts';
import { ModulePreparationError, type ModuleHandler } from '../../ai-worker/ports.ts';
import { AliasError } from './aliases.ts';
import type { ModuleValidators, ValidationContext } from './types.ts';
import { readPlanContext, buildPlanComposeRequest } from './plan-compose-context.ts';
import {
  checkPlanReferences,
  finalizeAllowed,
  mergePlan,
  planChanges,
  restoreLocked,
} from './plan-compose-rules.ts';
import { PROMPT_VERSION } from './prompts/plan-compose.ts';
export { buildPlanComposeRequest } from './plan-compose-context.ts';
export type { PlanComposeContext } from './plan-compose-context.ts';

function boundContext(context: ValidationContext) {
  const plan = readPlanContext(context.snapshot);
  if (
    context.module !== 'plan_compose' ||
    context.project_id !== plan.project.id ||
    context.subject_id !== plan.draft_id ||
    context.basis_revision !== plan.revision
  )
    throw new AliasError();
  return plan;
}
export const planComposeValidators: ModuleValidators<'plan_compose'> = {
  references: (value, context) => checkPlanReferences(value, boundContext(context).draft),
  policy: (value, context) => {
    const plan = boundContext(context),
      restored = restoreLocked(value, plan.draft);
    if (plan.mode === 'FINALIZE' && !finalizeAllowed(restored, plan.draft))
      return { ok: false, code: 'POLICY_REJECTED' };
    return { ok: true, value: restored, warnings: [] };
  },
  business: (value, context) => {
    const plan = boundContext(context),
      merged = mergePlan(value, plan);
    return merged.ok
      ? {
          ok: true,
          value: { ...value, change_summary: planChanges(plan.draft, merged.draft) },
          warnings: [],
        }
      : { ok: false, code: 'BUSINESS_REJECTED' };
  },
};
const output = (value: unknown): PlanComposeOutput => PlanComposeOutputSchema.parse(value);

/** Opt-in handler. The production registry stays empty until real DB contracts are bound. */
export const planComposeHandler: ModuleHandler = {
  module: 'plan_compose',
  promptVersion: PROMPT_VERSION,
  prepare: (context, job) => {
    const plan = readPlanContext(context.snapshot);
    if (
      job.type !== 'PLAN_COMPOSE' ||
      job.project_id !== plan.project.id ||
      job.subject_id !== plan.draft_id ||
      job.basis_revision !== plan.revision ||
      context.basis_revision !== plan.revision
    )
      throw new ModulePreparationError('PLAN_CONTEXT_INVALID');
    return {
      request: buildPlanComposeRequest(plan),
      context: {
        module: 'plan_compose',
        aliases: {},
        snapshot: plan,
        now: context.now,
        project_id: job.project_id,
        subject_id: job.subject_id,
        basis_revision: job.basis_revision,
      },
    };
  },
  validators: {
    references: (value, context) =>
      planComposeValidators.references(output(value), { ...context, module: 'plan_compose' }),
    policy: (value, context) =>
      planComposeValidators.policy(output(value), { ...context, module: 'plan_compose' }),
    business: (value, context) =>
      planComposeValidators.business(output(value), { ...context, module: 'plan_compose' }),
  },
  derive: (value, current) => {
    const plan = readPlanContext(current.snapshot),
      merged = mergePlan(output(value), plan);
    if (!merged.ok) throw new Error('INVALID_PLAN_DERIVATION');
    return {
      kind: 'PLAN_DRAFT',
      draft_id: plan.draft_id,
      expected_revision: plan.revision,
      status: 'EDITING',
      draft: merged.draft,
      reply: output(value).reply,
      change_summary: planChanges(plan.draft, merged.draft),
      prompt_version: PROMPT_VERSION,
    };
  },
};
