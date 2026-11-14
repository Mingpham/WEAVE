import type { PlanComposeOutput } from '../../../../packages/contracts/src/ai/index.ts';
import type {
  PlanDraft,
  DraftArea,
  DraftTask,
  DraftResource,
} from '../../../../packages/contracts/src/plan.ts';
import { validateDraft } from '../../../../packages/engine/src/draft.ts';
import { AliasError } from './aliases.ts';
import type { PlanComposeContext } from './plan-compose-context.ts';
import { projectForDraft } from './plan-compose-context.ts';

const areaOutput = ({ origin: _origin, locked: _locked, ...area }: DraftArea) => area;
const taskOutput = ({
  origin: _origin,
  locked: _locked,
  stipend_amount: _stipend,
  ...task
}: DraftTask) => task;
const resourceOutput = ({
  origin: _origin,
  locked: _locked,
  inventory_state: _inventory,
  custodian_member_id: _custodian,
  ...resource
}: DraftResource) => resource;
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
};
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);

export function restoreLocked(output: PlanComposeOutput, previous: PlanDraft): PlanComposeOutput {
  const restore = <T extends { key: string }>(rows: T[], locked: T[]) => {
    const byKey = new Map(locked.map((row) => [row.key, row]));
    const result = rows.map((row) => byKey.get(row.key) ?? row);
    for (const row of locked) if (!rows.some((r) => r.key === row.key)) result.push(row);
    return structuredClone(result);
  };
  return {
    ...output,
    areas: restore(output.areas, previous.areas.filter((a) => a.locked).map(areaOutput)),
    tasks: restore(output.tasks, previous.tasks.filter((t) => t.locked).map(taskOutput)),
    resources: restore(
      output.resources,
      previous.resources.filter((r) => r.locked).map(resourceOutput),
    ),
  };
}

export function checkPlanReferences(raw: PlanComposeOutput, previous: PlanDraft): void {
  const oldKinds = new Map<string, string>();
  for (const [kind, rows] of [
    ['area', previous.areas],
    ['task', previous.tasks],
    ['resource', previous.resources],
  ] as const)
    for (const row of rows) oldKinds.set(row.key, kind);
  const seen = new Set<string>();
  for (const [kind, rows] of [
    ['area', raw.areas],
    ['task', raw.tasks],
    ['resource', raw.resources],
  ] as const)
    for (const row of rows) {
      if (seen.has(row.key) || (oldKinds.has(row.key) && oldKinds.get(row.key) !== kind))
        throw new AliasError();
      seen.add(row.key);
    }
  const output = restoreLocked(raw, previous);
  const areas = new Set(output.areas.map((a) => a.key)),
    tasks = new Set(output.tasks.map((t) => t.key)),
    resources = new Set(output.resources.map((r) => r.key));
  const all = new Set([...areas, ...tasks, ...resources]);
  for (const row of [...output.tasks, ...output.resources])
    if (row.area_key !== null && !areas.has(row.area_key)) throw new AliasError();
  for (const task of output.tasks) {
    if (
      task.depends_on.some((d) => !tasks.has(d.task_key)) ||
      task.needs.some((n) => n.resource_key !== null && !resources.has(n.resource_key))
    )
      throw new AliasError();
  }
  if (output.questions.some((q) => q.about_keys.some((k) => !all.has(k)))) throw new AliasError();
  if (
    raw.change_summary.added.some((k) => !all.has(k)) ||
    raw.change_summary.changed.some((k) => !all.has(k)) ||
    raw.change_summary.removed.some((k) => !oldKinds.has(k))
  )
    throw new AliasError();
}

export function finalizeAllowed(output: PlanComposeOutput, before: PlanDraft): boolean {
  if (output.questions.length || !same([...output.role_tags].sort(), [...before.role_tags].sort()))
    return false;
  for (const key of ['areas', 'tasks', 'resources'] as const)
    if (!same(output[key].map((r) => r.key).sort(), before[key].map((r) => r.key).sort()))
      return false;
  for (const task of output.tasks) {
    const old = before.tasks.find((t) => t.key === task.key)!;
    const business = (t: PlanComposeOutput['tasks'][number]) => ({
      ...t,
      title: '',
      description: '',
      area_key: old.area_key === null ? null : t.area_key,
      criteria: t.criteria.map((c) => ({ critical: c.critical, photo_expected: c.photo_expected })),
    });
    if (!same(business(task), business(taskOutput(old)))) return false;
  }
  for (const resource of output.resources) {
    const old = before.resources.find((r) => r.key === resource.key)!;
    const business = (r: PlanComposeOutput['resources'][number]) => ({
      ...r,
      name: '',
      reason: '',
      area_key: old.area_key === null ? null : r.area_key,
    });
    if (!same(business(resource), business(resourceOutput(old)))) return false;
  }
  return true;
}

export function mergePlan(output: PlanComposeOutput, context: PlanComposeContext) {
  const before = context.draft;
  const restored = restoreLocked(output, before);
  const draft: PlanDraft = {
    areas: restored.areas.map((a) => ({
      ...a,
      origin: before.areas.find((old) => old.key === a.key)?.origin ?? 'AI',
      locked: before.areas.find((old) => old.key === a.key)?.locked ?? false,
    })),
    tasks: restored.tasks.map((t) => {
      const old = before.tasks.find((old) => old.key === t.key);
      return {
        ...t,
        origin: old?.origin ?? 'AI',
        locked: old?.locked ?? false,
        stipend_amount: old?.stipend_amount ?? null,
      };
    }),
    resources: restored.resources.map((r) => {
      const old = before.resources.find((old) => old.key === r.key);
      return {
        ...r,
        origin: old?.origin ?? 'AI',
        locked: old?.locked ?? false,
        inventory_state: old?.inventory_state ?? 'UNVERIFIED',
        custodian_member_id: old?.custodian_member_id ?? null,
      };
    }),
    role_tags: [...restored.role_tags],
    questions: restored.questions.map((q, index) => {
      const old = before.questions.find(
        (old) => old.text === q.text && same(old.about_keys, q.about_keys),
      );
      return {
        ...q,
        id: old?.id ?? `q-${context.revision + 1}-${index + 1}`,
        status: old?.status ?? 'OPEN',
        answer: old?.answer ?? null,
      };
    }),
    assumptions: [...restored.assumptions],
    gaps: [],
  };
  return validateDraft({ project: projectForDraft(context.project), draft });
}

export function planChanges(
  before: PlanDraft,
  after: PlanDraft,
): PlanComposeOutput['change_summary'] {
  const rows = (draft: PlanDraft) =>
    new Map([...draft.areas, ...draft.tasks, ...draft.resources].map((row) => [row.key, row]));
  const oldRows = rows(before),
    newRows = rows(after);
  return {
    added: [...newRows.keys()].filter((k) => !oldRows.has(k)).sort(),
    removed: [...oldRows.keys()].filter((k) => !newRows.has(k)).sort(),
    changed: [...newRows.keys()]
      .filter((k) => oldRows.has(k) && !same(oldRows.get(k), newRows.get(k)))
      .sort(),
  };
}
