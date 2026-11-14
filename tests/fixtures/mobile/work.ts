// Explicit development-preview simulation only. No API contracts or live fallback.
import type { ComposerDraft } from '../../../apps/mobile/src/features/evidence/composer-screen';
import type { TaskCardView } from '../../../apps/mobile/src/features/work/task-board';
import type { TaskDetailActions, TaskDetailView } from '../../../apps/mobile/src/features/work/task-detail';
import type { AssignmentSuggestion, OfferResultView } from '../../../apps/mobile/src/features/work/assign';
import type { EvidenceView } from '../../../apps/mobile/src/features/work/evidence-detail';
import type { CriterionAssessment, SubmissionReviewView } from '../../../apps/mobile/src/features/work/submission-review';
import type { TaskEditDraft, TaskEditorProps } from '../../../apps/mobile/src/features/work/task-editor';
import { formatDeadline } from '../../../apps/mobile/src/features/shared/interaction';

export const workPhotoLimits = {maxPhotos: 3, maxEdge: 1600, maxBytes: 2000000};
const areas = [{key: 'entrance', label: 'Main entrance'}, {key: 'courtyard', label: 'Courtyard'}];
const roles = [{key: 'welcome', label: 'Welcome team'}, {key: 'setup', label: 'Setup team'}];
const resourceChoices = [{key: 'table', label: 'Folding table'}, {key: 'sign', label: 'Welcome sign'}];
const baseDraft: TaskEditDraft = {
  titleInput: 'Prepare the welcome desk', descriptionInput: 'Set up a clear and welcoming arrival point for our neighbours.',
  areaKey: 'entrance', roleKey: 'welcome', roleRequired: false, startsInput: '2026-11-14T09:00:00+07:00', dueInput: '2026-11-14T09:40:00+07:00',
  durationInput: '20', stipendInput: '', critical: true, hardDeadline: false,
  criteria: [{key: 'clear', textInput: 'The welcome desk is visible from the entrance.', critical: true, photoExpected: true},
    {key: 'materials', textInput: 'Visitor information and name labels are laid out.', critical: false, photoExpected: false}],
  dependencies: [{key: 'layout', required: true}], resources: [{key: 'table-need', resourceKey: 'table', useCategory: false, categoryInput: '', required: true},
    {key: 'sign-need', useCategory: true, categoryInput: 'signage', required: false}],
};
const initial = () => ({
  revision: 1, owner: false, failNext: false, activeKey: 'welcome', adding: false, blocked: false, originalSource: false, aiAvailable: true, partialOffers: false,
  offerResults: [] as OfferResultView[],
  statuses: {welcome: 'ACCEPTED', layout: 'OPEN', signs: 'OPEN'} as Record<string, string>,
  assignees: {welcome: 'Alex'} as Record<string, string>,
  taskDrafts: {welcome: baseDraft, layout: {...baseDraft, titleInput: 'Lay out the courtyard', areaKey: 'courtyard', dependencies: [], resources: []},
    signs: {...baseDraft, titleInput: 'Put up directional signs', critical: false, dependencies: []}} as Record<string, TaskEditDraft>,
  draft: {text: '', photos: []} as ComposerDraft,
  drafts: {} as Record<string, ComposerDraft>,
  submissions: {welcome: {text: 'The desk is in place, with the sign facing the entrance. Visitor information is ready.', photos: []}} as Record<string, ComposerDraft>,
  assessments: {} as Record<string, Record<string, boolean>>,
  history: ['Alex accepted the welcome desk task.'],
});
let state = initial();
let offline = false;
const listeners = new Set<() => void>();
function patch(values: Partial<typeof state>) {state = {...state, ...values}; listeners.forEach(listener => listener());}
async function acknowledge(update: () => Partial<typeof state>) {
  await new Promise(resolve => setTimeout(resolve, 500));
  if (offline) throw {code: 'NETWORK_ERROR'};
  if (state.failNext) {patch({failNext: false}); throw {code: 'NETWORK_ERROR'};}
  patch({...update(), revision: state.revision + 1});
}
export const workPreviewSession = {
  snapshot: () => state,
  subscribe: (listener: () => void) => {listeners.add(listener); return () => {listeners.delete(listener);};},
  setOffline: (value: boolean) => {offline = value;},
  setOwner: (owner: boolean) => {if (state.owner !== owner) patch({owner});},
  toggleOwner: () => patch({owner: !state.owner}),
  toggleAi: () => patch({aiAvailable: !state.aiAvailable}),
  toggleFailure: () => patch({failNext: !state.failNext}),
  togglePartialOffers: () => patch({partialOffers: !state.partialOffers}),
  reset: () => {state = initial(); listeners.forEach(listener => listener());},
  showOffered: () => patch({statuses: {...state.statuses, [state.activeKey]: 'OFFERED'}, assignees: {...state.assignees, [state.activeKey]: 'Alex'}, blocked: false, revision: state.revision + 1}),
  showAccepted: () => patch({statuses: {...state.statuses, [state.activeKey]: 'ACCEPTED'}, assignees: {...state.assignees, [state.activeKey]: 'Alex'}, blocked: false, revision: state.revision + 1}),
  showBlocked: () => patch({statuses: {...state.statuses, [state.activeKey]: 'ACCEPTED'}, assignees: {...state.assignees, [state.activeKey]: 'Alex'}, blocked: true, revision: state.revision + 1}),
  showSubmitted: () => patch({statuses: {...state.statuses, [state.activeKey]: 'SUBMITTED'}, revision: state.revision + 1}),
  setDraft: (draft: ComposerDraft) => patch({draft, drafts: {...state.drafts, [state.activeKey]: draft}}),
  submit: (draft: ComposerDraft) => {
    const taskKey = state.activeKey;
    return acknowledge(() => ({submissions: {...state.submissions, [taskKey]: draft}, assessments: {...state.assessments, [taskKey]: {}}, draft: state.activeKey === taskKey ? {text: '', photos: []} : state.draft,
      drafts: {...state.drafts, [taskKey]: {text: '', photos: []}}, statuses: {...state.statuses, [taskKey]: 'SUBMITTED'}, history: [...state.history, 'Alex submitted evidence for review.']}));
  },
  supplement: (draft: ComposerDraft) => {
    const taskKey = state.activeKey;
    return acknowledge(() => {
      if (state.statuses[taskKey] !== 'SUBMITTED') throw {code: 'VERSION_CONFLICT'};
      const previous = state.submissions[taskKey] ?? {text: '', photos: []};
      return {submissions: {...state.submissions, [taskKey]: {text: [previous.text, draft.text].filter(Boolean).join('\n\n'), photos: [...previous.photos, ...draft.photos]}},
        draft: state.activeKey === taskKey ? {text: '', photos: []} : state.draft, drafts: {...state.drafts, [taskKey]: {text: '', photos: []}},
        history: [...state.history, 'Alex added evidence to the pending submission.']};
    });
  },
};
export function workPreviewModels(navigate: (screen: string) => void, openComposer: (mode: 'submission' | 'supplement') => void, owner = state.owner) {
  const key = state.activeKey;
  const draft = state.taskDrafts[key]!;
  const status = state.statuses[key] ?? 'OPEN';
  const submission = state.submissions[key] ?? {text: '', photos: []};
  const insufficientCriterion = state.aiAvailable && status === 'SUBMITTED' && !submission.photos.length ? draft.criteria.find(item => item.critical && item.photoExpected) : undefined;
  const deadline = (iso: string) => `${formatDeadline(iso, 'Asia/Ho_Chi_Minh', Date.parse('2026-11-14T02:20:00Z'))} · Asia/Ho_Chi_Minh`;
  const versionKey = `${key}-${state.revision}`;
  const openTask = (taskKey: string) => {patch({activeKey: taskKey, adding: false, draft: state.drafts[taskKey] ?? {text: '', photos: []}}); navigate('task');};
  const openEvidence = () => {patch({originalSource: false}); navigate('evidence');};
  const change = (next: string, message: string) => acknowledge(() => ({statuses: {...state.statuses, [key]: next},
    offerResults: next === 'OPEN' ? state.offerResults.filter(result => result.taskKey !== key) : state.offerResults, history: [...state.history, message]}));
  const board: TaskCardView[] = Object.entries(state.taskDrafts).map(([taskKey, item]) => ({
    key: taskKey, title: item.titleInput, statusLabel: state.statuses[taskKey] ?? 'OPEN',
    areaLabel: areas.find(area => area.key === item.areaKey)?.label ?? 'Main entrance',
    assigneeLabel: ['OPEN', 'DEFERRED', 'CANCELLED'].includes(state.statuses[taskKey] ?? '') ? 'No one assigned' : state.assignees[taskKey] ?? 'Alex',
    dueLabel: deadline(item.dueInput), riskLabel: taskKey === key && state.blocked ? 'BLOCKED' : undefined,
    mine: state.assignees[taskKey] === 'Alex' && !['OPEN', 'CANCELLED', 'DEFERRED'].includes(state.statuses[taskKey] ?? ''), atRisk: taskKey === key && state.blocked,
    unassigned: state.statuses[taskKey] === 'OPEN', onOpen: () => openTask(taskKey),
  }));
  const model: TaskDetailView = {
    versionKey, title: draft.titleInput, description: draft.descriptionInput, statusLabel: status,
    areaLabel: areas.find(area => area.key === draft.areaKey)?.label ?? '', assigneeLabel: ['OPEN', 'DEFERRED', 'CANCELLED'].includes(status) ? 'No one assigned' : state.assignees[key] ?? 'Alex',
    dueLabel: deadline(draft.dueInput), riskLabel: state.blocked ? 'BLOCKED' : undefined,
    evidenceSuggestion: insufficientCriterion && !owner ? `AI couldn't confirm: ${insufficientCriterion.textInput}. Add a photo or note?` : undefined,
    metadata: [...(draft.startsInput ? [{label: 'Starts at', value: deadline(draft.startsInput)}] : []), {label: 'Estimated time', value: `${draft.durationInput} minutes`},
      {label: 'Role', value: `${roles.find(role => role.key === draft.roleKey)?.label ?? 'Any teammate'}${draft.roleRequired ? ' · Required' : ''}`},
      {label: 'Stipend', value: draft.stipendInput ? `${draft.stipendInput} VND` : 'No stipend'},
      {label: 'Priority', value: `${draft.critical ? 'Critical task' : 'Standard task'}${draft.hardDeadline ? ' · Hard deadline' : ''}`}],
    riskReasons: state.blocked ? ['The courtyard layout is not ready yet.'] : [],
    criteria: draft.criteria.map(item => ({key: item.key, text: item.textInput, critical: item.critical, photoExpected: item.photoExpected,
      statusLabel: state.assessments[key]?.[item.key] === true ? 'Meets criterion' : state.assessments[key]?.[item.key] === false ? 'Does not meet criterion' : 'Awaiting assessment'})),
    dependencies: draft.dependencies.map(item => ({key: item.key, title: state.taskDrafts[item.key]?.titleInput ?? 'Layout',
      relationLabel: item.required ? 'Waiting on' : 'Helpful first', detail: state.blocked ? 'Not ready yet' : 'Ready for the next step', onOpen: () => openTask(item.key)})),
    resources: draft.resources.map(item => ({key: item.key, title: item.useCategory ? `Any resource in ${item.categoryInput}` : resourceChoices.find(resource => resource.key === item.resourceKey)?.label ?? '',
      detail: item.required ? 'Required to proceed' : 'Helpful, but not required', onOpen: () => navigate('resources')})),
    history: state.history.map((text, index) => ({key: String(index), text, timeLabel: '14 Nov · 09:20 · Asia/Ho_Chi_Minh'})),
    submissions: ['SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED'].includes(status) ? [{key: 'submission', title: 'Latest submission',
      detail: 'Alex · 09:20', onOpen: () => navigate(owner ? 'submission-review' : 'evidence')}] : [],
    startBlockedReason: state.blocked ? 'Lay out the courtyard' : undefined,
    releaseReasons: [{key: 'unavailable', label: 'I am no longer available'}, {key: 'equipment', label: 'I do not have what I need'}, {key: 'other', label: 'Another reason'}],
  };
  const terminal = status === 'APPROVED' || status === 'CANCELLED';
  const active = ['ACCEPTED', 'IN_PROGRESS', 'CHANGES_REQUESTED', 'SUBMITTED'].includes(status);
  const actions: TaskDetailActions = owner ? {
    onEdit: !terminal ? () => {patch({adding: false}); navigate('task-editor');} : undefined,
    onInvite: status === 'OPEN' ? () => navigate('assign') : undefined,
    onCancel: !terminal ? () => change('CANCELLED', 'Organizer cancelled the task.') : undefined,
    onDefer: !terminal && status !== 'DEFERRED' ? () => change('DEFERRED', 'Organizer deferred the task.') : undefined,
    onReopen: status === 'DEFERRED' ? () => change('OPEN', 'Organizer reopened the task.') : undefined,
    onUnlock: state.blocked && !terminal ? () => acknowledge(() => ({blocked: false, history: [...state.history, 'Organizer unlocked the dependency.']})) : undefined,
    onRevoke: active ? () => change('OPEN', 'Organizer revoked the assignment.') : undefined,
  } : state.assignees[key] !== 'Alex' ? {} : {
    onAccept: status === 'OFFERED' ? () => change('ACCEPTED', 'Alex accepted the offer.') : undefined,
    onDecline: status === 'OFFERED' ? reason => change('OPEN', `Alex declined the offer.${reason ? ` ${reason}` : ''}`) : undefined,
    onStart: status === 'ACCEPTED' ? () => change('IN_PROGRESS', 'Alex started the task.') : undefined,
    onSubmit: ['ACCEPTED', 'IN_PROGRESS', 'CHANGES_REQUESTED'].includes(status) ? () => openComposer('submission') : undefined,
    onAddEvidence: insufficientCriterion ? () => openComposer('supplement') : undefined,
    onRelease: active ? reason => change('OPEN', `Alex released the task: ${reason}.`) : undefined,
  };
  const suggestions: AssignmentSuggestion[] = Object.entries(state.taskDrafts).filter(([taskKey]) => state.statuses[taskKey] === 'OPEN').map(([taskKey, item]) => ({
    key: taskKey, title: item.titleInput, dueLabel: deadline(item.dueInput), respondByLabel: '09:30 · in 10 min', suggestedMemberKey: 'alex',
    members: [{key: 'alex', name: 'Alex', reason: 'Welcome team · checked in · available at Main entrance'}, {key: 'sam', name: 'Sam', reason: 'Setup team · checked in · available in Courtyard'}],
  }));
  const photos = submission.photos.map((photo, index) => ({key: `${photo.uri}-${index}`, uri: photo.uri, label: `Submission photo ${index + 1}`}));
  const review: SubmissionReviewView = {versionKey, title: draft.titleInput, authorLabel: 'Alex', timeLabel: '09:20 · Asia/Ho_Chi_Minh', note: submission.text,
    photos, canReview: owner && status === 'SUBMITTED', aiUnavailable: !state.aiAvailable,
    criteria: draft.criteria.map(item => ({key: item.key, text: item.textInput, critical: item.critical,
      aiCheck: state.aiAvailable ? {label: item.photoExpected && !photos.length ? 'INSUFFICIENT' : 'SUPPORTED', sourceLabels: photos.length ? photos.map(photo => photo.label) : ['Submission note'],
        explanation: item.photoExpected && !photos.length ? 'The note describes the setup, but no photo shows its visibility.' : 'The observation describes the requested setup.', onSource: openEvidence} : undefined})),
  };
  const evidence: EvidenceView = {title: state.originalSource ? 'Original submission note' : draft.titleInput, authorLabel: 'Alex', timeLabel: '09:20 · Asia/Ho_Chi_Minh',
    text: submission.text, photos,
    claims: state.originalSource || !state.aiAvailable ? [] : [{key: 'desk', text: 'The welcome desk setup is reported ready.', label: 'REPORTED', ai: true,
      sourceLabel: 'Alex · original submission', onSource: () => {patch({originalSource: true}); navigate('evidence');}}],
    related: [{key: 'task', label: 'Open task', onOpen: () => navigate('task')}],
  };
  const editor: TaskEditorProps = {
    versionKey: `${versionKey}-${state.adding}`, title: state.adding ? 'Add task' : 'Edit task',
    initial: state.adding ? {...baseDraft, titleInput: '', descriptionInput: '', criteria: [{key: 'first', textInput: '', critical: false, photoExpected: false}], dependencies: [], resources: []} : draft,
    currencyLabel: 'VND', areas, roles, dependencies: Object.entries(state.taskDrafts).filter(([taskKey]) => state.adding || taskKey !== key).map(([taskKey, item]) => ({key: taskKey, label: item.titleInput})),
    resources: resourceChoices, limits: {titleMin: 3, titleMax: 80, descriptionMax: 1000, criterionMax: 200, criteriaMax: 8}, canEdit: owner && (state.adding || !terminal),
    onSave: values => acknowledge(() => {
      const target = state.adding ? `created-${state.revision}` : key;
      return {taskDrafts: {...state.taskDrafts, [target]: values}, statuses: {...state.statuses, [target]: state.adding ? 'OPEN' : status},
        activeKey: target, adding: false, history: [...state.history, 'Organizer saved the task.']};
    }),
  };
  return {board, model, actions, suggestions, review, evidence, editor,
    add: () => {patch({adding: true}); navigate('task-editor');},
    sendOffers: (selections: {taskKey: string; memberKey: string}[]) => acknowledge(() => {
      const results: OfferResultView[] = selections.map((selection, index) => ({...selection,
        taskTitle: state.taskDrafts[selection.taskKey]?.titleInput ?? '', memberLabel: selection.memberKey === 'sam' ? 'Sam' : 'Alex',
        sent: !(state.partialOffers && index === selections.length - 1),
        errorMessage: state.partialOffers && index === selections.length - 1 ? 'Preview: this teammate became unavailable. Choose someone else or retry when available.' : undefined,
      }));
      const sent = results.filter(result => result.sent);
      return {partialOffers: false, offerResults: [...state.offerResults.filter(previous => !results.some(result => result.taskKey === previous.taskKey)), ...results],
        statuses: {...state.statuses, ...Object.fromEntries(sent.map(result => [result.taskKey, 'OFFERED']))},
        assignees: {...state.assignees, ...Object.fromEntries(sent.map(result => [result.taskKey, result.memberLabel]))},
        history: [...state.history, `Organizer sent ${sent.length} offers.`]};
    }),
    approve: (criteria: CriterionAssessment[]) => acknowledge(() => ({statuses: {...state.statuses, [key]: 'APPROVED'},
      assessments: {...state.assessments, [key]: Object.fromEntries(criteria.map(item => [item.criterionKey, item.met]))},
      history: [...state.history, 'Organizer approved the submission.']})),
    requestChanges: (input: {criteria: CriterionAssessment[]; reason: string; openIncident: boolean}) => acknowledge(() => ({statuses: {...state.statuses, [key]: 'CHANGES_REQUESTED'},
      assessments: {...state.assessments, [key]: Object.fromEntries(input.criteria.map(item => [item.criterionKey, item.met]))},
      history: [...state.history, `Organizer requested changes: ${input.reason}${input.openIncident ? ' A handoff incident was opened.' : ''}`]})),
  };
}
