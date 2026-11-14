// UI preview only: examples and simulated state transitions are never production adapters.
import type { PlanningEditorOptions, PlanningForm, PlanningItem, PlanningItemKind, PlanningView, ResourceReportDraft, ResourcesView } from '../../../apps/mobile/src/features/planning/models';
import type { EvidenceView } from '../../../apps/mobile/src/features/work/evidence-detail';
import { previewSession } from './demo';

const planningTimezone = 'Asia/Ho_Chi_Minh';
const planningStartsAt = Date.parse('2026-11-14T02:00:00Z');
const planningDemoNow = Date.parse('2026-11-14T01:35:00Z');
const planningBrief = 'Run a neighbourhood makers fair on 14 November, 09:00–16:00, in the main courtyard. Welcome visitors at the east entrance and make an opening announcement. Keep the central walkway clear. Check which equipment is available before publishing.';
const planningAssumptions = ['DEMO · The event starts at 09:00.', 'DEMO · The courtyard is available for preparation from 08:00.'];
const eventClock = (instant: number) => new Intl.DateTimeFormat('en-GB', {timeZone: planningTimezone, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(instant);
function dueClock(offset: string) {
  const instant = planningStartsAt + Number(offset) * 60000;
  const minutes = Math.round((instant - planningDemoNow) / 60000);
  const relative = Math.abs(minutes) <= 120 ? minutes > 0 ? ` · in ${minutes} min` : minutes < 0 ? ` · ${-minutes} min late` : ' · due now' : '';
  return `${eventClock(instant)}${relative}`;
}

export const planningInventory = [{key: 'have', label: 'We have it'}, {key: 'acquire', label: 'Need to get it'}, {key: 'unsure', label: 'Not sure'}];
export const planningKinds = [{key: 'individual', label: 'Individual item'}, {key: 'supply', label: 'Supply / batch'}];
export const planningReportChoices = [{key: 'working', label: 'Working'}, {key: 'failed', label: 'Not working'}, {key: 'missing', label: 'Missing'}, {key: 'low', label: 'Running low'}, {key: 'moved', label: 'Moved to…'}];
const blank = (): PlanningForm => ({name: '', description: '', areaKey: '', roleKey: '', roleRequired: false, start: '', due: '0', duration: '15', stipend: '', critical: false, hardDeadline: false, criteria: [{text: '', critical: false, photo: false}], dependencies: [], needs: [], category: '', kindKey: 'individual', quantity: '', inventoryKey: 'unsure', custodian: ''});
const item = (key: string, kind: PlanningItemKind, name: string, partial: Partial<PlanningForm>, ai = true): PlanningItem => ({key, kind, title: name,
  detail: partial.description ?? '', locked: !ai, ai, sourceLabel: ai ? 'DEMO · event brief · AI suggestion' : 'DEMO · organizer input', form: {...blank(), ...partial, name}});
const initialItems = [
  item('courtyard', 'area', 'Main courtyard', {description: 'Open-air gathering space. Keep the central walkway clear.'}),
  item('entrance', 'area', 'Welcome desk', {description: 'Visitor check-in beside the east entrance.'}),
  item('welcome', 'role', 'Welcome team', {}, false),
  item('sound', 'resource', 'Portable speaker', {description: 'Opening announcements and background music.', category: 'audio', areaKey: 'courtyard', quantity: '1', custodian: 'Alex'}),
  item('signs', 'resource', 'Wayfinding signs', {description: 'Help visitors find their way.', category: 'signage', kindKey: 'supply', quantity: '8', areaKey: 'entrance', inventoryKey: 'have'}, false),
  item('setup', 'task', 'Prepare the welcome desk', {description: 'Set out the visitor list, maps, and signs before doors open.', areaKey: 'entrance', roleKey: 'welcome', start: '-45', due: '-15', duration: '30', critical: true,
    criteria: [{text: 'Visitor materials and signs are visible in a clear photo.', critical: true, photo: true}], needs: [{key: 'signs', required: true}]}, false),
  item('soundcheck', 'task', 'Run the opening sound check', {description: 'Test the announcement from the far end of the courtyard.', areaKey: 'courtyard', start: '-20', due: '-10', duration: '10', hardDeadline: true,
    criteria: [{text: 'A test announcement is audible across the courtyard.', critical: true, photo: false}], needs: [{key: 'sound', required: true}]})
];
type PlanningState = {
  items: PlanningItem[]; revision: number; composing: boolean; finalized: boolean; published: boolean; aiFailed: boolean; aiEnabled: boolean;
  messages: PlanningView['messages']; questions: PlanningView['questions']; selected: string; editing: PlanningForm; isNew: boolean;
  reportKey: string; report: ResourceReportDraft; reports: Record<string, ResourceReportDraft>; returnScreen: string; source?: EvidenceView;
};
let state: PlanningState = {
  items: initialItems, revision: 1, composing: false, finalized: false, published: false, aiFailed: false, aiEnabled: true,
  messages: [{key: 'intro', ai: true, text: 'Here is a starting plan for the makers fair. I have kept your welcome desk task protected and suggested equipment to check.', sourceLabel: 'DEMO · event brief and organizer edits', changes: ['Added one sound-check task.', 'Suggested one unverified speaker.']}],
  questions: [{key: 'sound-question', text: 'Do you already have a portable speaker?', why: 'The opening announcement depends on it. A suggestion is not confirmed inventory.', answers: ['We have one; I will verify it.', 'We still need to get one.']}],
  selected: 'setup', editing: {...initialItems.find(entry => entry.key === 'setup')!.form}, isNew: false,
  reportKey: 'sound', report: {choiceKey: '', areaKey: '', text: '', photos: []}, reports: {}, returnScreen: 'plan',
};
const listeners = new Set<() => void>();
const patch = (next: Partial<PlanningState>) => { state = {...state, ...next}; listeners.forEach(listener => listener()); };
const mutate = (items: PlanningItem[]) => patch({items, revision: state.revision + 1, finalized: false});
async function acknowledge() { await previewSession.acknowledge({}, previewSession.snapshot().revision); }
function requireEditable() {
  if (state.composing || previewSession.snapshot().role !== 'organizer') throw {code: 'FORBIDDEN'};
}
function validateReferences(items: PlanningItem[]) {
  const tasks = items.filter(entry => entry.kind === 'task');
  const visiting = new Set<string>(); const done = new Set<string>();
  const visit = (key: string) => {
    if (visiting.has(key)) throw {code: 'VALIDATION_FAILED'};
    if (done.has(key)) return;
    visiting.add(key);
    for (const link of tasks.find(task => task.key === key)?.form.dependencies ?? []) {
      if (!tasks.some(task => task.key === link.key)) throw {code: 'VALIDATION_FAILED'};
      visit(link.key);
    }
    visiting.delete(key); done.add(key);
  };
  for (const task of tasks) visit(task.key);
}
function rawItem(entry: PlanningItem) {
  const form = entry.form;
  const area = state.items.find(candidate => candidate.key === form.areaKey)?.title ?? 'Not assigned';
  const inventory = planningInventory.find(choice => choice.key === form.inventoryKey)?.label ?? form.inventoryKey;
  return [`Name: ${entry.title}`, `Origin: ${entry.ai ? 'AI suggestion, not verified fact' : 'Organizer entry'}`, `Protected from AI: ${entry.locked ? 'Yes' : 'No'}`,
    ...(form.description ? [`Description: ${form.description}`] : []),
    ...(['task', 'resource'].includes(entry.kind) ? [`${entry.ai ? 'Suggested area' : 'Area'}: ${area}`] : []),
    ...(entry.kind === 'resource' ? [`Category: ${form.category}`, `Inventory selection: ${inventory}`, `Quantity: ${form.quantity || 'Not entered'}`, `Custodian: ${form.custodian || 'Not assigned'}`] : []),
    ...(entry.kind === 'task' ? [`Due: ${dueClock(form.due)} · ${planningTimezone}`, ...form.criteria.map(row => `Criterion: ${row.text} · Photo expected: ${row.photo ? 'Yes' : 'No'}`)] : [])].join('\n');
}
function sourceFor(reference: string): EvidenceView {
  const divider = reference.indexOf(':');
  const kind = divider < 0 ? reference : reference.slice(0, divider);
  const key = divider < 0 ? '' : reference.slice(divider + 1);
  const result: EvidenceView = {title: 'Planning source', authorLabel: 'DEMO · fixture record', timeLabel: `${eventClock(planningDemoNow)} · ${planningTimezone}`, text: '', photos: [], claims: [], related: []};
  const entry = state.items.find(candidate => candidate.key === key);
  if (kind === 'resource' && entry && state.reports[key]) {
    const report = state.reports[key]!;
    result.title = `Report · ${entry.title}`; result.authorLabel = 'DEMO · submitted resource observation';
    result.text = [`Saved inventory entry:\n${rawItem(entry)}\n`, `Observed status: ${planningReportChoices.find(choice => choice.key === report.choiceKey)?.label ?? report.choiceKey}`,
      ...(report.choiceKey === 'moved' ? [`Reported destination: ${state.items.find(area => area.key === report.areaKey)?.title ?? report.areaKey}`] : []),
      `Original note: ${report.text || '(No note supplied)'}`, 'This report has not verified inventory or replaced a confirmed condition.'].join('\n');
    result.photos = report.photos.map((photo, index) => ({key: `${key}-${index}`, uri: photo.uri, label: `Attached report photo ${index + 1}`}));
  } else if ((kind === 'item' || kind === 'resource') && entry) {
    result.title = entry.title; result.authorLabel = entry.sourceLabel;
    result.text = entry.ai ? `Original event brief:\n${planningBrief}\n\nAI draft content:\n${rawItem(entry)}` : `Saved organizer entry:\n${rawItem(entry)}`;
  } else if (kind === 'message') {
    const index = state.messages.findIndex(message => message.key === key);
    const message = state.messages[index];
    result.title = message?.ai ? 'AI conversation source' : 'Organizer message'; result.authorLabel = message?.sourceLabel ?? result.authorLabel;
    const input = message?.ai && index > 0 ? state.messages[index - 1]?.text : planningBrief;
    result.text = message?.ai ? `Original input:\n${input ?? planningBrief}\n\nSimulated AI reply:\n${message.text}\n\nChange summary:\n${(message.changes ?? []).join('\n')}` : message?.text ?? '';
  } else if (kind === 'question') {
    const question = state.questions.find(candidate => candidate.key === key);
    result.title = 'AI question source'; result.authorLabel = 'DEMO · generated clarification';
    result.text = `Original event brief:\n${planningBrief}\n\nQuestion:\n${question?.text ?? ''}\n\nReason given:\n${question?.why ?? ''}`;
  } else if (kind === 'gap') {
    const gap = planningView().gaps[Number(key)] ?? '';
    const affected = state.items.filter(candidate => gap.startsWith(candidate.title));
    result.title = 'Draft gap source'; result.authorLabel = `DEMO · computed from saved draft revision ${state.revision}`;
    result.text = `${gap}\n\nSaved fields used for this check:\n${affected.map(rawItem).join('\n\n')}`;
  } else if (kind === 'assumptions') {
    result.title = 'AI assumptions source'; result.authorLabel = 'DEMO · original brief and simulated AI output';
    result.text = `Original event brief:\n${planningBrief}\n\nAI assumptions:\n${planningAssumptions.join('\n')}\n\nThe 08:00 courtyard access is an AI assumption, not a confirmed statement from the organizer.`;
  }
  return result;
}
export const planningSession = {
  subscribe: (listener: () => void) => { listeners.add(listener); return () => {listeners.delete(listener);}; }, snapshot: () => state,
  edit(key: string, returnScreen = 'plan') { const found = state.items.find(entry => entry.key === key); if (found) patch({selected: key, editing: {...found.form}, isNew: false, returnScreen}); },
  add(kind: PlanningItemKind, returnScreen = 'plan') { patch({selected: `new-${kind}`, editing: blank(), isNew: true, returnScreen}); },
  change: (editing: PlanningForm) => patch({editing}),
  showSource: (reference: string) => patch({source: sourceFor(reference)}),
  closeSource: () => patch({source: undefined}),
  toggleAI: () => patch({aiEnabled: !state.aiEnabled}),
  changeReport: (report: ResourceReportDraft) => patch({report}),
  report(key: string) { patch({reportKey: key, report: {choiceKey: '', areaKey: '', text: '', photos: []}}); },
  async save(form: PlanningForm) {
    requireEditable(); await acknowledge();
    const previous = state.items.find(entry => entry.key === state.selected);
    const kind = previous?.kind ?? state.selected.replace('new-', '') as PlanningItemKind;
    const key = previous?.key ?? `manual-${kind}-${state.revision}`;
    if ((kind === 'area' || kind === 'role') && state.items.some(entry => entry.kind === kind && entry.key !== key && entry.title.toLowerCase() === form.name.trim().toLowerCase())) throw {code: 'VALIDATION_FAILED'};
    const updated = item(key, kind, form.name.trim(), form, false);
    const next = previous ? state.items.map(entry => entry.key === key ? updated : entry) : [...state.items, updated];
    validateReferences(next);
    if (kind === 'resource' && form.inventoryKey === 'acquire' && !next.some(entry => entry.key === `acquire-${key}`)) next.push(item(`acquire-${key}`, 'task', `Get ${form.name}`, {description: `Arrange ${form.name} before setup.`, areaKey: form.areaKey, due: '-60', criteria: [{text: `${form.name} is available for preparation.`, critical: false, photo: false}]}, false));
    mutate(next); patch({selected: key, isNew: false, editing: updated.form});
  },
  async remove() {
    requireEditable(); await acknowledge();
    const target = state.items.find(entry => entry.key === state.selected);
    if (!target) return;
    if (state.items.some(entry => entry.key !== target.key && (entry.form.areaKey === target.key || entry.form.roleKey === target.key || entry.form.dependencies.some(link => link.key === target.key)))) throw {code: 'VALIDATION_FAILED'};
    mutate(state.items.filter(entry => entry.key !== target.key).map(entry => ({...entry, form: {...entry.form, needs: entry.form.needs.filter(link => link.key !== target.key)}})));
  },
  async lock(locked: boolean) { requireEditable(); await acknowledge(); mutate(state.items.map(entry => entry.key === state.selected ? {...entry, locked} : entry)); },
  async send(message: string) {
    requireEditable(); patch({composing: true, aiFailed: false});
    try {
      await acknowledge();
      patch({revision: state.revision + 1, finalized: false, questions: [], messages: [...state.messages,
        {key: `human-${state.revision}`, ai: false, text: message, sourceLabel: 'DEMO · your message'},
        {key: `ai-${state.revision}`, ai: true, text: 'DEMO · I have recorded your clarification. Please edit the resource inventory to confirm what you have. Your locked items are unchanged.', sourceLabel: 'DEMO · simulated reply to your message', changes: ['Recorded a clarification; no inventory facts changed.', 'Preserved all manual edits.']} ]});
    } catch (error) { patch({aiFailed: true}); throw error; }
    finally { patch({composing: false}); }
  },
  async finalize() {
    requireEditable(); patch({composing: true});
    try { await acknowledge(); validateReferences(state.items); patch({finalized: true, revision: state.revision + 1}); }
    finally { patch({composing: false}); }
  },
  async publish() {
    requireEditable(); if (!state.finalized || state.published) throw {code: 'VERSION_CONFLICT'};
    await acknowledge(); patch({published: true, revision: state.revision + 1});
  },
  async sendReport(report: ResourceReportDraft) {
    await acknowledge(); patch({reports: {...state.reports, [state.reportKey]: {...report, photos: [...report.photos]}}});
  },
};
export function planningView(): PlanningView {
  const areaName = (key: string) => state.items.find(entry => entry.key === key)?.title ?? 'No area assigned';
  const gaps = state.items.flatMap(entry => [
    ...(entry.kind === 'resource' && entry.form.inventoryKey === 'unsure' ? [`${entry.title} is unverified. Ask someone to check it after publishing.`] : []),
    ...(['task', 'resource'].includes(entry.kind) && !entry.form.areaKey ? [`${entry.title} has no area assigned.`] : []),
    ...(entry.kind === 'task' && entry.form.critical && !entry.form.criteria.some(row => row.photo) ? [`${entry.title} needs a criterion that can be checked with a photo.`] : []),
  ]);
  return {revision: String(state.revision), items: state.items, messages: state.messages, questions: state.questions, gaps,
    assumptions: planningAssumptions, timeContext: `${planningTimezone} · 24-hour time · DEMO clock ${eventClock(planningDemoNow)}`,
    composing: state.composing, aiAvailable: state.aiEnabled && !state.published, aiFailed: state.aiFailed, canEdit: previewSession.snapshot().role === 'organizer', finalized: state.finalized, published: state.published,
    timeline: state.items.filter(entry => entry.kind === 'task').sort((a, b) => Number(a.form.due) - Number(b.form.due)).map(entry => ({key: entry.key, title: entry.title,
      time: dueClock(entry.form.due), area: `${areaName(entry.form.areaKey)}${entry.form.start ? ` · Starts ${eventClock(planningStartsAt + Number(entry.form.start) * 60000)}` : ''}`}))};
}
export function planningEditorOptions(): PlanningEditorOptions {
  const choices = (kind: PlanningItemKind) => state.items.filter(entry => entry.kind === kind).map(entry => ({key: entry.key, label: entry.title}));
  const categories = [...new Set(state.items.filter(entry => entry.kind === 'resource').map(entry => entry.form.category).filter(Boolean))];
  return {areas: choices('area'), roles: choices('role'), tasks: choices('task'), resources: choices('resource'),
    resourceCategories: categories.map(category => ({key: `category:${category}`, label: `Any resource in ${category}`})),
    inventory: planningInventory, resourceKinds: planningKinds, acquisitionKey: 'acquire'};
}
export function planningEditorItem(): PlanningItem {
  return state.items.find(entry => entry.key === state.selected) ?? item(state.selected, state.selected.replace('new-', '') as PlanningItemKind, '', state.editing, false);
}
export function planningResources(): ResourcesView {
  const areas = state.items.filter(entry => entry.kind === 'area').map(entry => ({key: entry.key, title: entry.title, notes: entry.form.description}));
  if (state.items.some(entry => entry.kind === 'resource' && !entry.form.areaKey)) areas.push({key: '', title: 'Unassigned area', notes: ''});
  return {canEdit: previewSession.snapshot().role === 'organizer', groups: areas.map(area => ({...area,
    resources: state.items.filter(entry => entry.kind === 'resource' && entry.form.areaKey === area.key).map(entry => ({key: entry.key, title: entry.title,
      category: `${entry.form.category} · ${entry.form.quantity || '—'}`, inventoryLabel: entry.form.inventoryKey === 'have' ? 'CONFIRMED · organizer' : entry.form.inventoryKey === 'acquire' ? 'TO ACQUIRE' : 'UNVERIFIED',
      unverified: entry.form.inventoryKey === 'unsure', conditionLabel: state.reports[entry.key] ? 'Report awaiting verification' : 'Condition unknown',
      claimLabel: state.reports[entry.key] ? 'REPORTED · demo observation' : 'No condition evidence', sourceLabel: state.reports[entry.key] ? `DEMO · ${planningReportChoices.find(choice => choice.key === state.reports[entry.key]?.choiceKey)?.label}` : entry.sourceLabel,
      custodian: entry.form.custodian || undefined, needs: state.items.filter(task => task.kind === 'task' && task.form.needs.some(need => need.key === entry.key || need.key === `category:${entry.form.category}`)).map(task => task.title),
    }))}))};
}
