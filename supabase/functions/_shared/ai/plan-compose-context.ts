import { z } from '../../../../packages/contracts/src/primitives.ts';
import { PlanDraft } from '../../../../packages/contracts/src/plan.ts';
import { ProjectView, Uuid } from '../../../../packages/contracts/src/index.ts';
import { POL } from '../../../../packages/contracts/src/policy.ts';
import { modelJsonSchema } from '../../../../packages/contracts/src/ai/index.ts';
import { validateDraft } from '../../../../packages/engine/src/draft.ts';
import { ModulePreparationError } from '../../ai-worker/ports.ts';
import { PROMPT_VERSION, SYSTEM_PROMPT } from './prompts/plan-compose.ts';
import type { ModelRequest } from './types.ts';

const projectSchema = ProjectView.pick({
  id: true,
  title: true,
  brief: true,
  venue_name: true,
  starts_at: true,
  ends_at: true,
  expected_team_size: true,
  expected_attendees: true,
  role_tags: true,
  status: true,
})
  .extend({
    status: z.literal('DRAFT'),
    title: z.string().min(3).max(80),
    brief: z.string().min(1).max(4000),
  })
  .strip();
const contextSchema = z.object({
  project: projectSchema,
  draft_id: Uuid,
  revision: z.number().int().positive(),
  ai_turns_used: z.number().int().nonnegative(),
  mode: z.enum(['DRAFT', 'REVISE', 'FINALIZE']),
  draft: PlanDraft,
  messages: z.array(z.object({ role: z.enum(['ORGANIZER', 'AI', 'SYSTEM']), text: z.string() })),
});
export type PlanComposeContext = z.infer<typeof contextSchema>;
export const projectForDraft = (project: PlanComposeContext['project']) => ({
  id: project.id,
  starts_at: project.starts_at,
  ends_at: project.ends_at,
  role_tags: project.role_tags,
});

export function readPlanContext(value: unknown): PlanComposeContext {
  const parsed = contextSchema.safeParse(value);
  if (!parsed.success) throw new ModulePreparationError('PLAN_CONTEXT_INVALID');
  const context = parsed.data;
  if (context.ai_turns_used >= POL.PLAN_MAX_AI_TURNS)
    throw new ModulePreparationError('PLAN_TURN_LIMIT');
  if (context.mode === 'DRAFT' && context.draft.tasks.length > 0)
    throw new ModulePreparationError('PLAN_MODE_INVALID');
  const draft = validateDraft({ project: projectForDraft(context.project), draft: context.draft });
  if (!draft.ok) throw new ModulePreparationError('PLAN_CONTEXT_INVALID');
  return { ...context, draft: draft.draft };
}

/** Per-field projection: DB IDs, human money and unknown metadata never enter the model snapshot. */
export function buildPlanComposeRequest(value: unknown): ModelRequest {
  const context = readPlanContext(value);
  let truncated =
    context.messages.length > 12 ||
    context.draft.questions.length > 4 ||
    context.draft.assumptions.length > 8;
  const clip = (text: string, max: number) => {
    if (text.length > max) truncated = true;
    return text.slice(0, max);
  };
  const messages = context.messages
    .slice(-12)
    .map((m) => ({ role: m.role, text: clip(m.text, 4000) }));
  const { id: _id, status: _status, role_tags: _roles, ...project } = context.project;
  const draft = {
    areas: context.draft.areas,
    role_tags: context.draft.role_tags,
    tasks: context.draft.tasks.map(({ stipend_amount: _stipend, ...task }) => task),
    resources: context.draft.resources.map(
      ({ custodian_member_id: _custodian, ...resource }) => resource,
    ),
    questions: context.draft.questions.slice(0, 4).map((q) => ({
      text: q.text,
      why: q.why,
      suggested_answers: q.suggested_answers,
      about_keys: q.about_keys,
      status: q.status,
      answer: q.answer === null ? null : clip(q.answer, 4000),
    })),
    assumptions: context.draft.assumptions.slice(0, 8).map((a) => clip(a, 500)),
  };
  return {
    module: 'plan_compose',
    promptVersion: PROMPT_VERSION,
    system: SYSTEM_PROMPT,
    userContent: JSON.stringify({
      project,
      draft,
      messages,
      mode: context.mode,
      limits: {
        max_tasks: POL.MAX_TASKS,
        max_resources: POL.MAX_RESOURCES,
        max_areas: POL.MAX_AREAS,
        max_questions: POL.PLAN_MAX_QUESTIONS_PER_TURN,
        min_due_offset_min: -20160,
        max_due_offset_min:
          (Date.parse(project.ends_at) - Date.parse(project.starts_at)) / 60_000 + 1440,
      },
      truncated,
    }),
    jsonSchema: modelJsonSchema('plan_compose'),
  };
}
