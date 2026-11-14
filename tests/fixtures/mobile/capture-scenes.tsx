// Capture-only native component fixtures. Never import this module into the product app.
import React, {useState, type ReactNode} from 'react';
import {Welcome, MyEvents} from '@/features/events/event-screens';
import {CommandCenter, ParticipantHome} from '@/features/events/dashboard-screens';
import {SignIn, JoinCode, JoinConsent, JoinProfile, Waiting} from '@/features/onboarding/join-screens';
import {CreateEvent} from '@/features/onboarding/event-form';
import {People} from '@/features/onboarding/people-screen';
import {EventSettings} from '@/features/onboarding/settings-screen';
import {Me} from '@/features/onboarding/me-screen';
import {PlanStudio, PlanReview} from '@/features/planning/studio-screen';
import {DraftItemEditor} from '@/features/planning/editor-screen';
import {ResourcesAreas, ResourceReport} from '@/features/planning/resources-screen';
import {TaskBoard} from '@/features/work/task-board';
import {TaskDetail} from '@/features/work/task-detail';
import {TaskEditor} from '@/features/work/task-editor';
import {Assign} from '@/features/work/assign';
import {SubmissionReview} from '@/features/work/submission-review';
import {EvidenceDetail} from '@/features/work/evidence-detail';
import {Composer, type ComposerDraft} from '@/features/evidence/composer-screen';
import {Incident} from '@/features/incidents/incident-screen';
import {ManualDecision, NewIncident, AskProbe} from '@/features/incidents/decision-tools-screen';
import {Probe, DirectAnswer} from '@/features/probes/probe-screen';
import {Offer} from '@/features/tasks/offer-screen';
import type {ResourceReportDraft} from '@/features/planning/models';
import {demoModels, demoContexts, demoCategories} from './demo';
import {onboardingDemo, onboardingEvent, onboardingInvite, onboardingRoles} from './onboarding';
import {planningView, planningEditorItem, planningEditorOptions, planningResources, planningReportChoices} from './planning';
import {workPreviewModels} from './work';
import {decisionFixtures, decisionKinds} from './decisions';

export type CaptureScene = {id: string; name: string; render: () => ReactNode};
const noop = () => {};
// Every asynchronous action refuses to mutate or claim backend acknowledgement.
const unavailable = (): Promise<never> => Promise.reject({code: 'SERVICE_UNAVAILABLE'});
const onboarding = onboardingDemo.snapshot();
const demo = demoModels(noop);
const work = workPreviewModels(noop, noop, true);
const plan = planningView();
const incidentActions = {
  onApprove: unavailable, onReject: unavailable, onRecheck: unavailable,
  onConfirm: unavailable, onDismiss: unavailable, onManual: noop,
  onKnow: noop, onAsk: noop, onResolve: unavailable,
};
const taskActions = {onEdit: noop, onInvite: noop, onCancel: unavailable,
  onDefer: unavailable, onRevoke: unavailable, onSubmit: noop};

function DraftCapture() {
  const item = planningEditorItem();
  const [form, setForm] = useState(item.form);
  return <DraftItemEditor item={item} form={form} options={planningEditorOptions()} revision="capture-1"
    canEdit onChange={setForm} onSave={unavailable} onDelete={unavailable} onLock={unavailable}
    onBack={noop} onSource={noop} />;
}
function ComposerCapture({report = false}: {report?: boolean}) {
  const [draft, setDraft] = useState<ComposerDraft>({
    text: report ? 'The main speaker has power but no audio. The opening announcement may be delayed.'
      : 'The welcome desk is set up facing the entrance. Visitor information and name labels are ready.',
    photos: [], contextKey: 'demo-task', categoryKey: report ? 'resource' : undefined,
  });
  return <Composer draft={draft} onChange={setDraft} onSend={unavailable} onPickPhoto={unavailable}
    contexts={demoContexts} categories={report ? demoCategories : undefined} report={report} maxPhotos={3} />;
}
function ResourceReportCapture() {
  const [draft, setDraft] = useState<ResourceReportDraft>({choiceKey: 'working', areaKey: '',
    text: 'The portable speaker passed the sound test and is ready at the welcome desk.', photos: []});
  return <ResourceReport resourceTitle="Portable speaker" choices={planningReportChoices}
    areas={planningEditorOptions().areas} movedChoiceKey="moved" draft={draft} onChange={setDraft}
    onSend={unavailable} onPickPhoto={unavailable} maxPhotos={3} />;
}

export const captureScenes: CaptureScene[] = [
  {id: '01', name: 'Welcome', render: () => <Welcome onJoin={noop} onOrganize={noop} />},
  {id: '02', name: 'My Events', render: () => <MyEvents events={[
    {key: 'social', title: onboardingEvent.title, role: 'organizer', roleLabel: 'Organizer', statusLabel: 'DRAFT', timeLabel: '15 Nov · 14:00–18:00 · Asia/Ho_Chi_Minh', onOpen: noop},
    {key: 'fair', title: 'Neighbourhood makers fair', role: 'participant', roleLabel: 'Participant', statusLabel: 'ACTIVE', timeLabel: '14 Nov · 09:00–16:00 · Asia/Ho_Chi_Minh', onOpen: noop},
  ]} onJoin={noop} onCreate={noop} onSignOut={noop} />},
  {id: '03', name: 'Join Code', render: () => <JoinCode initialCode="WEAV3X" invite={onboardingInvite} onResolve={unavailable} onScan={unavailable} onContinue={noop} />},
  {id: '04', name: 'Consent', render: () => <JoinConsent invite={onboardingInvite} onContinue={noop} />},
  {id: '05', name: 'Join Profile', render: () => <JoinProfile invite={onboardingInvite} roles={onboardingRoles} initialProfile={onboarding.me.profile} consentAccepted onJoin={unavailable} />},
  {id: '06', name: 'Waiting', render: () => <Waiting eventName={onboardingEvent.title} onCancel={unavailable} />},
  {id: '07', name: 'Create Event', render: () => <CreateEvent initialValue={onboardingEvent} maxMembers={50} canCreate onCreate={unavailable} onSignIn={noop} />},
  {id: '08', name: 'Plan Studio', render: () => <PlanStudio model={plan} onSend={unavailable} onFinalize={unavailable} onEdit={noop} onAdd={noop} onSource={noop} />},
  {id: '09', name: 'Draft Item Editor', render: () => <DraftCapture />},
  {id: '10', name: 'Plan Review', render: () => <PlanReview model={{...plan, finalized: true}} onBack={noop} onPublish={unavailable} onResources={noop} onSource={noop} />},
  {id: '11', name: 'Command Center', render: () => <CommandCenter model={demo.command} onNewIncident={noop} onInbox={noop} />},
  {id: '12', name: 'Task Board', render: () => <TaskBoard tasks={work.board.map(task => ({...task, onOpen: noop}))} onAdd={noop} onSuggest={noop} />},
  {id: '13', name: 'Task Detail', render: () => <TaskDetail model={work.model} actions={taskActions} />},
  {id: '14', name: 'Assign', render: () => <Assign versionKey="capture-1" tasks={work.suggestions} onSend={unavailable} />},
  {id: '15', name: 'Resources and Areas', render: () => <ResourcesAreas model={planningResources()} onEditResource={noop} onEditArea={noop} onAddResource={noop} onAddArea={noop} onReport={noop} onSource={noop} />},
  {id: '16', name: 'People', render: () => <People model={onboarding.people} onApprove={unavailable} onReject={unavailable} onRemove={unavailable} onRegenerate={unavailable} onDisableInvite={unavailable} />},
  {id: '18', name: 'Event Settings', render: () => <EventSettings model={onboarding.settings} onSave={unavailable} onClose={unavailable} onDelete={unavailable} />},
  {id: '21', name: 'Submission Review', render: () => <SubmissionReview model={{...work.review, canReview: true}} onApprove={unavailable} onRequestChanges={unavailable} />},
  {id: '22', name: 'Incident', render: () => <Incident model={demo.incident} actions={incidentActions} />},
  {id: '23', name: 'Manual Decision', render: () => <ManualDecision kinds={decisionKinds} maxActions={decisionFixtures.maxActions} versionKey="capture-1" onCheck={unavailable} onApply={unavailable} />},
  {id: '24', name: 'New Incident', render: () => <NewIncident types={decisionFixtures.types} subjects={decisionFixtures.subjects} tasks={decisionFixtures.tasks} onCreate={unavailable} />},
  {id: '25', name: 'Participant Home', render: () => <ParticipantHome model={demo.home} onHere={unavailable} />},
  {id: '27', name: 'Me', render: () => <Me model={onboarding.me} onSave={unavailable} onHere={unavailable} onUnavailable={unavailable} onLeave={unavailable} onSignOut={unavailable} />},
  {id: '28', name: 'Composer', render: () => <ComposerCapture />},
  {id: '29', name: 'Report a Problem', render: () => <ComposerCapture report />},
  {id: '30', name: 'Answer Probe', render: () => <Probe model={{...demo.probe, open: true}} onAnswer={unavailable} onCannotCheck={unavailable} onDecline={unavailable} onPickPhoto={unavailable} maxPhotos={3} />},
  {id: '31', name: 'Resource Report', render: () => <ResourceReportCapture />},
  {id: '32', name: 'Offer', render: () => <Offer model={{...demo.offer, open: true}} onAccept={unavailable} onDecline={unavailable} />},
  {id: '33', name: 'Evidence Detail', render: () => <EvidenceDetail model={work.evidence} />},
  {id: '34', name: 'Sign In', render: () => <SignIn onGoogle={unavailable} onGuest={unavailable} />},
  {id: '35', name: 'Task Editor', render: () => <TaskEditor {...work.editor} canEdit onSave={unavailable} />},
  {id: '36', name: 'Ask Probe', render: () => <AskProbe recipients={decisionFixtures.members} questionContext={decisionFixtures.context} onSend={unavailable} />},
  {id: '37', name: 'Direct Answer', render: () => <DirectAnswer model={{...demo.probe, open: true}} onAnswer={unavailable} onPickPhoto={unavailable} maxPhotos={3} />},
];
