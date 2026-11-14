// Deliberately local preview data and responses. Never used by a production data adapter.
import type { EventForm } from '../../../apps/mobile/src/features/onboarding/event-form';
import type { InviteSummary } from '../../../apps/mobile/src/features/onboarding/join-screens';
import type { MeView } from '../../../apps/mobile/src/features/onboarding/me-screen';
import type { PeopleView } from '../../../apps/mobile/src/features/onboarding/people-screen';
import type { SettingsForm, SettingsView } from '../../../apps/mobile/src/features/onboarding/settings-screen';
import type { EditableProfile } from '../../../apps/mobile/src/features/onboarding/shared';
import { onboardingEn as t } from '../../../apps/mobile/src/strings/en';

export const onboardingFixtureMarker = 'WEAVE_UI_FIXTURE_ONLY';
export const onboardingRoles = [{ key: 'welcome', label: 'Welcome team' }, { key: 'logistics', label: 'Logistics' }, { key: 'av', label: 'Sound & stage' }, { key: 'other', label: t.otherRole }];
export const onboardingInvite: InviteSummary = { eventName: 'The Sunday Social', organizerName: 'Mai', consentVersion: '1.0-demo', timezone: 'Asia/Ho_Chi_Minh' };
export const onboardingEmptyProfile: EditableProfile = { nickname: '', roleKeys: [], wholeEvent: true, windows: [] };
export const onboardingEvent: EventForm = {
  title: 'The Sunday Social', brief: 'A welcoming afternoon of food, music and conversation for our local community. Help neighbors meet and make everyone feel at home.',
  venue: 'Riverside Community Hall', start: '2026-11-15T14:00', end: '2026-11-15T18:00', timeZone: 'Asia/Ho_Chi_Minh', teamSize: '12', attendees: '120', currency: 'VND',
};
const initialSettings: SettingsForm = { event: onboardingEvent, roles: 'Welcome team, Logistics, Sound & stage', ai: true, questions: true, recovery: true, photos: true, autoApprove: false };
const initialPeople: PeopleView = {
  revision: '1', closed: false, invite: { code: 'WEAV3X', expiresLabel: '15 Nov, 18:00 · Asia/Ho_Chi_Minh' },
  requests: [{ key: 'request-linh', nickname: 'Linh', roleLabels: ['Welcome team'], availabilityLabel: 'Whole event' }, { key: 'request-tuan', nickname: 'Tuan', roleLabels: ['Sound & stage'], availabilityLabel: '15 Nov, 13:00–16:00' }],
  members: [{ key: 'mai', nickname: 'Mai', roleLabels: ['Organizer'], presenceLabel: 'On site', areaLabel: 'Main hall', taskCount: 0, removable: false },
    { key: 'an', nickname: 'An', roleLabels: ['Logistics'], presenceLabel: 'On site', areaLabel: 'Welcome desk', taskCount: 2, removable: true },
    { key: 'binh', nickname: 'Binh', roleLabels: ['Sound & stage'], presenceLabel: 'Not arrived', areaLabel: 'No area selected', taskCount: 1, removable: true }],
};
const initialMe: MeView = { revision: '1', profile: { nickname: 'An', roleKeys: ['logistics'], wholeEvent: true, windows: [] }, roles: onboardingRoles, timezone: onboardingInvite.timezone,
  presenceLabel: 'On site', areas: [{ key: 'welcome', label: 'Welcome desk' }, { key: 'hall', label: 'Main hall' }, { key: 'courtyard', label: 'Courtyard' }],
  currentAreaKey: 'welcome', closed: false, guest: true, canMarkHere: false, canMarkUnavailable: true, canLeave: true };
type DemoState = { revision: number; resolved: boolean; consentAccepted: boolean; people: PeopleView; me: MeView; settings: SettingsView };
function initial(): DemoState {
  return { revision: 1, resolved: false, consentAccepted: false, people: { ...initialPeople }, me: { ...initialMe },
    settings: { revision: '1', form: { ...initialSettings }, closed: false, timesEditable: true, maxMembers: 50,
      unresolvedItems: ['2 unresolved incidents', '1 submission awaiting review', '2 pending task invitations'] } };
}
let state = initial();
const listeners = new Set<() => void>();
function update(patch: Partial<DemoState>) {
  const revision = state.revision + 1;
  state = { ...state, ...patch, revision };
  state.people = { ...state.people, revision: String(revision) };
  state.me = { ...state.me, revision: String(revision) };
  state.settings = { ...state.settings, revision: String(revision) };
  listeners.forEach(listener => listener());
}
async function acknowledge(offline: boolean) {
  await new Promise(resolve => setTimeout(resolve, 450));
  if (offline) throw { code: 'NETWORK_ERROR' };
}
export const onboardingDemo = {
  snapshot: () => state,
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  reset: () => { state = initial(); listeners.forEach(listener => listener()); },
};
export function onboardingDemoActions(navigate: (screen: string) => void, offline: boolean) {
  return {
    google: async () => { await acknowledge(offline); navigate('create-event'); },
    guest: async () => { await acknowledge(offline); navigate('join-code'); },
    resolve: async (code: string) => { await acknowledge(offline); if (code !== state.people.invite?.code) throw { code: 'INVITE_INVALID' }; update({ resolved: true, consentAccepted: false }); },
    continueJoin: () => navigate('join-consent'),
    agree: () => { update({ consentAccepted: true }); navigate('join-profile'); },
    join: async (profile: EditableProfile) => { await acknowledge(offline); if (!state.consentAccepted) throw { code: 'VALIDATION_FAILED' };
      update({ me: { ...state.me, profile } }); navigate('waiting'); },
    cancelRequest: async () => { await acknowledge(offline); update({ resolved: false, consentAccepted: false }); navigate('events'); },
    create: async (event: EventForm) => { await acknowledge(offline); update({ settings: { ...state.settings, form: { ...state.settings.form, event } } }); navigate('plan'); },
    approve: async (key: string) => { await acknowledge(offline); const request = state.people.requests.find(item => item.key === key); if (!request) throw { code: 'NOT_FOUND' };
      update({ people: { ...state.people, requests: state.people.requests.filter(item => item.key !== key), members: [...state.people.members,
        { key, nickname: request.nickname, roleLabels: request.roleLabels, presenceLabel: 'Not arrived', areaLabel: 'No area selected', taskCount: 0, removable: true }] } }); },
    reject: async (key: string) => { await acknowledge(offline); update({ people: { ...state.people, requests: state.people.requests.filter(item => item.key !== key) } }); },
    remove: async (key: string) => { await acknowledge(offline); update({ people: { ...state.people, members: state.people.members.filter(item => item.key !== key) } }); },
    regenerate: async () => { await acknowledge(offline); update({ people: { ...state.people, invite: { code: state.people.invite?.code === 'WEAV3X' ? 'TEAM7X' : 'WEAV3X', expiresLabel: '16 Nov, 18:00 · Asia/Ho_Chi_Minh' } } }); },
    disableInvite: async () => { await acknowledge(offline); update({ people: { ...state.people, invite: undefined } }); },
    saveSettings: async (form: SettingsForm) => { await acknowledge(offline); update({ settings: { ...state.settings, form } }); },
    close: async () => { await acknowledge(offline); update({ settings: { ...state.settings, closed: true }, people: { ...state.people, closed: true }, me: { ...state.me, closed: true } }); },
    delete: async () => { await acknowledge(offline); onboardingDemo.reset(); navigate('events'); },
    saveMe: async (profile: EditableProfile, currentAreaKey?: string) => { await acknowledge(offline); update({ me: { ...state.me, profile, currentAreaKey } }); },
    here: async () => { await acknowledge(offline); update({ me: { ...state.me, presenceLabel: 'On site', canMarkHere: false, canMarkUnavailable: true } }); },
    unavailable: async (_reason: string) => { await acknowledge(offline); update({ me: { ...state.me, presenceLabel: 'Unavailable', canMarkHere: true, canMarkUnavailable: false } }); },
    leave: async () => { await acknowledge(offline); navigate('events'); },
    signOut: async () => { await acknowledge(offline); onboardingDemo.reset(); navigate('auth'); },
  };
}
