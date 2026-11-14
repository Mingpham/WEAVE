// UI-only fixtures. Not API DTOs; replace with Mingpham's contract-validated mock API at integration.
import type { CommandView, HomeView } from '../../../apps/mobile/src/features/events/dashboard-screens';
import type { IncidentView } from '../../../apps/mobile/src/features/incidents/incident-screen';
import type { ProbeView } from '../../../apps/mobile/src/features/probes/probe-screen';
import type { OfferView } from '../../../apps/mobile/src/features/tasks/offer-screen';
import { en } from '../../../apps/mobile/src/strings/en';

export type DemoScreen = 'events' | 'command' | 'home' | 'composer' | 'report' | 'incident' | 'probe' | 'offer' | 'source' | 'unavailable';
type DemoState = {
  phase: 'ready' | 'loading' | 'empty' | 'error'; offline: boolean; failNext: boolean; stale: boolean;
  role: 'organizer' | 'participant'; stage: 'verify' | 'ready' | 'recovering' | 'working' | 'evidence' | 'resolved'; revision: number;
  safety: boolean; probeClosed: boolean;
};
const initial: DemoState = {phase: 'ready', offline: false, failNext: false, stale: false, role: 'organizer', stage: 'ready', revision: 1, safety: false, probeClosed: false};
let state = {...initial};
const listeners = new Set<() => void>();
export const previewSession = {
  snapshot: () => state,
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  patch: (patch: Partial<DemoState>) => { state = {...state, ...patch}; listeners.forEach(fn => fn()); },
  reset: () => { state = {...initial}; listeners.forEach(fn => fn()); },
  async check(expectedRevision?: number) {
    await new Promise(resolve => setTimeout(resolve, 650));
    if (state.offline) throw {code: 'NETWORK_ERROR'};
    if (state.failNext) { previewSession.patch({failNext: false}); throw {code: 'NETWORK_ERROR'}; }
    if (expectedRevision !== undefined && (state.stale || state.revision !== expectedRevision)) throw {code: 'PROPOSAL_STALE'};
  },
  async acknowledge(patch: Partial<DemoState> = {}, expectedRevision?: number) {
    await previewSession.check(expectedRevision);
    previewSession.patch({...patch, revision: state.revision + 1});
  },
};
export const demoPolicy = {maxPhotos: 3, maxEdge: 1600, maxBytes: 2000000};
export const fixtureMarker = 'WEAVE_UI_FIXTURE_ONLY';
export const demoContexts = [{key: 'demo-task', label: 'Sound check · Main courtyard'}, {key: 'demo-area', label: 'Main courtyard'}];
export const demoCategories = [
  {key: 'unsure', label: en.notSure}, {key: 'member', label: en.memberIssue}, {key: 'resource', label: en.resourceIssue},
  {key: 'delay', label: en.taskDelay}, {key: 'handoff', label: en.handoffIssue}, {key: 'conflict', label: en.conflictingInfo},
  {key: 'plan', label: en.planChange}, {key: 'other', label: en.other}, {key: 'safety', label: en.safety},
];
export const demoEvent = {title: 'Neighbourhood\nmakers fair', timeLabel: '14 Nov · 09:00–16:00 · Asia/Ho_Chi_Minh', statusLabel: 'ACTIVE'};
export const demoSource = {
  title: 'A field observation', author: 'Alex · 09:18 · Main courtyard',
  text: 'The portable speaker is powered on and the test announcement is audible across the courtyard.',
  label: 'REPORTED · Photo not attached',
};
export const demoLastUpdate = '09:20';
export function demoModels(go: (screen: DemoScreen) => void) {
  const recovering = ['recovering', 'working', 'evidence'].includes(state.stage);
  const resolved = state.stage === 'resolved';
  const verifying = state.stage === 'verify';
  const source = () => go('source');
  const command: CommandView = {
    ...demoEvent,
    progress: [{label: en.done, value: resolved ? 9 : 8}, {label: en.inProgress, value: 3}, {label: en.notStarted, value: 5}],
    metrics: [{label: en.blocked, value: resolved ? '0' : '1'}, {label: en.atRisk, value: '2'}, {label: en.onSite, value: '12 / 16'}, {label: en.incidents, value: resolved ? '0' : '1'}],
    groups: resolved ? [] : [{title: verifying ? en.verification : en.actNow, items: [{key: 'incident', title: 'Sound check needs a way forward',
      detail: verifying ? 'A field check is in progress. We’re waiting for one useful fact.' : recovering ? 'The team is carrying out the approved recovery.' : 'One verified option is ready for your decision.',
      badge: recovering ? 'RECOVERING' : verifying ? 'NEEDS VERIFICATION' : 'HIGH · READY FOR APPROVAL', actionLabel: en.decision, onOpen: () => go('incident')} ]},
      {title: en.review, items: [{key: 'handoff', title: 'Welcome desk is ready for review', detail: 'A teammate has submitted the setup checklist.', badge: 'SUBMITTED', actionLabel: en.evidence, onOpen: source}]}],
  };
  const home: HomeView = {
    eventTitle: 'Neighbourhood makers fair', subtitle: 'You’re part of something good.', needsArrival: false,
    questions: verifying && !state.probeClosed && !state.safety ? [{key: 'question', title: 'Can you check the portable speaker?', detail: 'Your answer helps the team choose a safe next step.', badge: 'QUESTION · 4 min left', actionLabel: en.probe, onOpen: () => go('probe')}] : [],
    offers: state.stage === 'recovering' ? [{key: 'offer', title: 'Bring the portable speaker', detail: 'A recovery invitation from the organizer.', badge: 'RECOVERY OFFER', actionLabel: en.offer, onOpen: () => go('offer')}] : [],
    current: [{key: 'task', title: state.stage === 'working' ? 'Bring the portable speaker' : 'Prepare the welcome desk',
      detail: 'Main courtyard · Due 09:40', badge: 'IN PROGRESS', criteria: ['Set up the equipment in the marked area.', 'Share a note or photo when ready.'],
      actionLabel: en.submit, onOpen: () => go('composer')}],
    next: [{key: 'next', title: 'Welcome the first visitors', detail: 'Entrance · Starts 10:00', badge: 'UP NEXT', actionLabel: en.tasks, onOpen: () => go('unavailable')}],
  };
  const incident: IncidentView = {
    versionKey: String(state.revision),
    title: 'Let’s get the\nsound back on.', summary: 'The courtyard sound system stopped responding during the morning setup. The opening announcement is affected.',
    statusLabel: resolved ? 'RESOLVED' : recovering ? 'RECOVERING' : 'OPEN', severityLabel: 'HIGH',
    readinessLabel: state.safety || state.probeClosed ? 'ESCALATE_TO_HUMAN' : verifying ? 'NEEDS_VERIFICATION' : 'READY_FOR_APPROVAL', ai: !state.safety, aiUnavailable: false,
    canManage: state.role === 'organizer', suspected: false, recovering, resolved, safety: state.safety,
    stale: state.stale, revisionMatches: !state.stale, canDecide: state.stage === 'ready', canResolve: recovering,
    sources: [{key: 'report', text: 'The main speaker has no audio output.', label: 'REPORTED · Sam · 09:14', onSource: source}],
    affected: [{key: 'announcement', title: 'Opening announcement', riskLabel: resolved ? 'CLEAR' : 'BLOCKED'}],
    known: [{key: 'portable', text: 'A portable speaker is available at the welcome desk.', label: 'REPORTED · Alex · 09:18', onSource: source}],
    unknown: verifying ? [{key: 'power', question: 'Is the portable speaker working?', askingLabel: 'Asking Alex · response due 09:25'}] : [],
    changed: !verifying ? 'Alex reported that the portable speaker passed the sound test.' : undefined,
    options: verifying || resolved || state.safety ? [] : [{key: 'portable-option', title: 'Bring the portable speaker', actions: ['Alex brings the portable speaker to the main courtyard.'],
      validityLabel: 'VALID', canApprove: true, requiresReason: false, ai: true, recommended: true,
      checks: [{key: 'working', text: '✓ Replacement equipment is usable', label: 'REPORTED · Alex', onSource: source},
        {key: 'available', text: '✓ Teammate is available for the transfer', label: 'CONFIRMED · Availability', onSource: source}],
      tradeoffs: ['The portable speaker will be unavailable at the welcome desk.'], assumptions: []}],
    resolutionEvidence: state.stage === 'evidence' ? [{key: 'recovery-note', text: 'The announcement is audible in the courtyard.', label: 'REPORTED · Alex · 09:28', onSource: source}] : [],
  };
  const probe: ProbeView = {question: 'Is the portable speaker working?', whyYou: 'You’re at the welcome desk, near the replacement equipment.', deadlineLabel: '09:25 · in 4 min',
    choices: [{key: 'works', label: 'Yes, the sound test works'}, {key: 'unusable', label: 'No, it is not usable'}], open: verifying && !state.probeClosed && !state.safety, ai: true};
  const offer: OfferView = {title: 'Bring the portable speaker', detail: 'Welcome desk → Main courtyard', incidentContext: 'The opening announcement needs a working sound system.',
    criteria: ['Speaker is in the courtyard.', 'A test announcement is audible.', 'Submit a note or photo for review.'], dueLabel: '09:35 · in 12 min', respondByLabel: '09:28 · in 5 min', open: state.stage === 'recovering'};
  return {command, home, incident, probe, offer};
}
