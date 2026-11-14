import { PlanDraft, type DraftTask, type PlanGap } from '../../contracts/src/plan.ts';
import { ProjectView, RoleTag } from '../../contracts/src/index.ts';
import { POL } from '../../contracts/src/policy.ts';
import type { DraftValidationInput } from './inputs.ts';

export type DraftIssueCode =
  | 'INVALID_PROJECT'
  | 'SCHEMA_INVALID'
  | 'LIMIT_EXCEEDED'
  | 'DUPLICATE_KEY'
  | 'DUPLICATE_NAME'
  | 'DUPLICATE_ROLE'
  | 'MISSING_REFERENCE'
  | 'INVALID_RESOURCE_REQUIREMENT'
  | 'INVALID_RESOURCE_QUANTITY'
  | 'DEPENDENCY_CYCLE'
  | 'INVALID_WINDOW';
export type DraftIssue = Readonly<{ code: DraftIssueCode; path: string }>;
export type DraftValidationResult =
  { ok: true; draft: PlanDraft } | { ok: false; issues: DraftIssue[] };
const projectSchema = ProjectView.pick({
  id: true,
  starts_at: true,
  ends_at: true,
  role_tags: true,
});
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const start = (task: DraftTask) =>
  task.start_offset_min ?? task.due_offset_min - task.estimated_minutes;

function gapsFor(draft: PlanDraft): PlanGap[] {
  const gaps: PlanGap[] = [];
  const add = (kind: PlanGap['kind'], keys: string[], message: string) =>
    gaps.push({ kind, keys, message });
  for (const resource of draft.resources) {
    if (resource.inventory_state === 'UNVERIFIED')
      add('UNVERIFIED_RESOURCE', [resource.key], 'Confirm whether this resource is available.');
    if (resource.area_key === null)
      add('NO_AREA', [resource.key], 'Choose an area for this resource.');
    const tasks = draft.tasks
      .filter((t) =>
        t.needs.some(
          (n) =>
            n.resource_key === resource.key ||
            (n.resource_key === null && n.category === resource.category),
        ),
      )
      .sort((a, b) => compare(a.key, b.key));
    for (let i = 0; i < tasks.length; i++)
      for (let j = i + 1; j < tasks.length; j++) {
        const a = tasks[i]!,
          b = tasks[j]!;
        if (start(a) < b.due_offset_min && start(b) < a.due_offset_min)
          add(
            'RESOURCE_CONTENTION',
            [resource.key, a.key, b.key],
            'Overlapping tasks may need the same resource; confirm allocation.',
          );
      }
  }
  for (const task of draft.tasks) {
    if (task.area_key === null) add('NO_AREA', [task.key], 'Choose an area for this task.');
    if (task.critical && !task.criteria.some((c) => c.photo_expected))
      add(
        'NO_CHECKABLE_CRITERION',
        [task.key],
        'Add a criterion that can be checked with a photo.',
      );
    if (task.critical && task.role_required && task.role_tag === null)
      add('CRITICAL_WITHOUT_ROLE', [task.key], 'Choose the role required by this critical task.');
  }
  return gaps.sort(
    (a, b) => compare(a.kind, b.kind) || compare(a.keys.join('\0'), b.keys.join('\0')),
  );
}

/** Validate the full draft, including manual edits. Gaps are rebuilt from validated data. */
export function validateDraft(input: DraftValidationInput): DraftValidationResult {
  const project = projectSchema.safeParse(input.project);
  if (!project.success || Date.parse(project.data.ends_at) <= Date.parse(project.data.starts_at))
    return { ok: false, issues: [{ code: 'INVALID_PROJECT', path: 'project' }] };
  const parsed = PlanDraft.safeParse({ ...input.draft, gaps: [] });
  if (!parsed.success)
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ code: 'SCHEMA_INVALID', path: i.path.join('.') })),
    };
  const draft = parsed.data;
  const issues: DraftIssue[] = [];
  const add = (code: DraftIssueCode, path: string) => issues.push({ code, path });
  if (draft.tasks.length > POL.MAX_TASKS) add('LIMIT_EXCEEDED', 'tasks');
  if (draft.resources.length > POL.MAX_RESOURCES) add('LIMIT_EXCEEDED', 'resources');
  if (draft.areas.length > POL.MAX_AREAS) add('LIMIT_EXCEEDED', 'areas');
  if (draft.role_tags.length > 12) add('LIMIT_EXCEEDED', 'role_tags');
  if (issues.length) return { ok: false, issues };

  const keys = new Set<string>();
  for (const [collection, rows] of [
    ['areas', draft.areas],
    ['tasks', draft.tasks],
    ['resources', draft.resources],
  ] as const) {
    for (const row of rows) {
      if (keys.has(row.key)) add('DUPLICATE_KEY', `${collection}.${row.key}`);
      keys.add(row.key);
    }
  }
  const areaNames = new Set<string>();
  for (const area of draft.areas) {
    const name = area.name.toLowerCase();
    if (areaNames.has(name)) add('DUPLICATE_NAME', `areas.${area.key}.name`);
    areaNames.add(name);
  }
  const roles = new Set<string>();
  for (const role of draft.role_tags) {
    const valid = RoleTag.safeParse(role);
    if (!valid.success || valid.data !== role) add('SCHEMA_INVALID', 'role_tags');
    if (roles.has(role)) add('DUPLICATE_ROLE', 'role_tags');
    roles.add(role);
  }
  const areas = new Set(draft.areas.map((a) => a.key));
  const resources = new Set(draft.resources.map((r) => r.key));
  const tasks = new Map(draft.tasks.map((t) => [t.key, t]));
  for (const resource of draft.resources) {
    if (resource.kind === 'ITEM' && resource.quantity !== null)
      add('INVALID_RESOURCE_QUANTITY', `resources.${resource.key}.quantity`);
  }
  for (const row of [...draft.tasks, ...draft.resources]) {
    if (row.area_key !== null && !areas.has(row.area_key))
      add('MISSING_REFERENCE', `${row.key}.area_key`);
  }
  const maximumDue =
    (Date.parse(project.data.ends_at) - Date.parse(project.data.starts_at)) / 60_000 + 1440;
  for (const task of draft.tasks) {
    if (
      task.due_offset_min < -20160 ||
      task.due_offset_min > maximumDue ||
      start(task) >= task.due_offset_min
    )
      add('INVALID_WINDOW', `tasks.${task.key}`);
    if (task.role_tag !== null && !roles.has(task.role_tag))
      add('MISSING_REFERENCE', `tasks.${task.key}.role_tag`);
    const dependencies = new Set<string>();
    for (const dependency of task.depends_on) {
      if (!tasks.has(dependency.task_key)) add('MISSING_REFERENCE', `tasks.${task.key}.depends_on`);
      if (dependencies.has(dependency.task_key))
        add('DUPLICATE_KEY', `tasks.${task.key}.depends_on`);
      dependencies.add(dependency.task_key);
    }
    for (const need of task.needs) {
      if (
        (need.resource_key === null) === (need.category === null) ||
        (need.category !== null && !need.category.trim())
      )
        add('INVALID_RESOURCE_REQUIREMENT', `tasks.${task.key}.needs`);
      if (need.resource_key !== null && !resources.has(need.resource_key))
        add('MISSING_REFERENCE', `tasks.${task.key}.needs`);
    }
  }
  const questionIds = new Set<string>();
  for (const question of draft.questions) {
    if (questionIds.has(question.id)) add('DUPLICATE_KEY', `questions.${question.id}`);
    questionIds.add(question.id);
    if (question.about_keys.some((key) => !keys.has(key)))
      add('MISSING_REFERENCE', `questions.${question.id}.about_keys`);
  }
  // Every edge, including SOFT, participates in dependency-cycle validation.
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (key: string): boolean => {
    if (visiting.has(key)) return false;
    if (visited.has(key)) return true;
    visiting.add(key);
    for (const dep of tasks.get(key)?.depends_on ?? [])
      if (tasks.has(dep.task_key) && !visit(dep.task_key)) return false;
    visiting.delete(key);
    visited.add(key);
    return true;
  };
  if ([...tasks.keys()].some((key) => !visit(key))) add('DEPENDENCY_CYCLE', 'tasks.depends_on');
  if (issues.length) return { ok: false, issues };
  draft.gaps = gapsFor(draft);
  return { ok: true, draft };
}

export function computeDraftGaps(input: DraftValidationInput): PlanGap[] {
  const result = validateDraft(input);
  if (!result.ok) throw new Error('INVALID_DRAFT');
  return result.draft.gaps;
}
