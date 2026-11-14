import { createContext, createElement, useContext, type ComponentProps, type ComponentType, type PropsWithChildren } from 'react';
import type { ScreenState } from '@/components/screen';
import { MyEvents, Welcome } from '../events/event-screens';
import { CommandCenter, ParticipantHome } from '../events/dashboard-screens';
import { SignIn, JoinConsent, JoinProfile, Waiting } from '../onboarding/join-screens';
import { CreateEvent } from '../onboarding/event-form';
import {JoinEntry} from './join-entry';
import { People } from '../onboarding/people-screen';
import { EventSettings } from '../onboarding/settings-screen';
import { Me } from '../onboarding/me-screen';
import { PlanReview, PlanStudio } from '../planning/studio-screen';
import { DraftItemEditor } from '../planning/editor-screen';
import { ResourceReport, ResourcesAreas } from '../planning/resources-screen';
import { TaskBoard } from '../work/task-board';
import { TaskDetail } from '../work/task-detail';
import { TaskEditor } from '../work/task-editor';
import { Assign } from '../work/assign';
import { SubmissionReview } from '../work/submission-review';
import { EvidenceDetail } from '../work/evidence-detail';
import { Composer } from '../evidence/composer-screen';
import { Incident } from '../incidents/incident-screen';
import { AskProbe, ManualDecision, NewIncident } from '../incidents/decision-tools-screen';
import { DirectAnswer, Probe } from '../probes/probe-screen';
import { Offer } from '../tasks/offer-screen';
import type { EventAccess, MobileRoute } from './routes';

export const mobileViews = {
  welcome: Welcome, events: MyEvents, auth: SignIn, 'join-code': JoinEntry, 'join-consent': JoinConsent,
  'join-profile': JoinProfile, waiting: Waiting, 'create-event': CreateEvent, people: People, settings: EventSettings, me: Me,
  command: CommandCenter, home: ParticipantHome, plan: PlanStudio, 'draft-item': DraftItemEditor, 'plan-review': PlanReview,
  resources: ResourcesAreas, 'resource-report': ResourceReport, tasks: TaskBoard, task: TaskDetail, 'task-editor': TaskEditor,
  assign: Assign, 'submission-review': SubmissionReview, evidence: EvidenceDetail, composer: Composer, report: Composer,
  incident: Incident, manual: ManualDecision, 'new-incident': NewIncident, 'ask-probe': AskProbe, 'direct-answer': DirectAnswer, probe: Probe, offer: Offer,
};
type ViewName = keyof typeof mobileViews;
export type MobileViewProps<K extends ViewName> = Omit<ComponentProps<(typeof mobileViews)[K]>, 'demo' | 'onPreview'>;
export type MobileView = {[K in ViewName]: {screen: K; props: MobileViewProps<K>}}[ViewName];
export type MobileBinding = {
  state: ScreenState;
  access?: EventAccess;
  view?: MobileView;
};
export type MobilePresentation = {
  session: 'loading' | 'signed-out' | 'signed-in' | 'unavailable';
  // Pure lookup into hook-derived state. Do not call hooks or perform requests here.
  read: (route: MobileRoute) => MobileBinding | undefined;
  ownerScreens?: Partial<Record<'timeline' | 'inbox' | 'close' | 'settlement', ComponentType<{route: MobileRoute}>>>;
};
const PresentationContext = createContext<MobilePresentation | null>(null);

// The API/integration stream wraps the router with its hook-backed provider.
// This boundary deliberately contains no API client, fabricated DTO or fixture fallback.
export function MobilePresentationProvider({value, children}: PropsWithChildren<{value: MobilePresentation}>) {
  return <PresentationContext.Provider value={value}>{children}</PresentationContext.Provider>;
}
export const useMobilePresentation = () => useContext(PresentationContext);

export function MobileViewContent({view, offline}: {view: MobileView; offline?: boolean}) {
  // The public discriminated union checks the component/props pair at the adapter boundary.
  const Component = mobileViews[view.screen] as ComponentType<typeof view.props & {demo?: boolean; onPreview?: undefined; offline?: boolean}>;
  return createElement(Component, {...view.props, demo: false, onPreview: undefined, offline: offline || ('offline' in view.props && view.props.offline)});
}

export function OwnerViewContent({component: Component, route}: {component: ComponentType<{route: MobileRoute}>; route: MobileRoute}) {
  return <Component route={route} />;
}
