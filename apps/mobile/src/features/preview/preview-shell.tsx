import { useState, useSyncExternalStore } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Badge, Button, Card, Copy, Heading, Notice, PageTitle } from '@/components/ui';
import { OnboardingPreview } from '@/features/onboarding/preview';
import { PlanningPreview } from '@/features/planning/preview';
import { WorkPreview } from '@/features/work/preview';
import { AskProbe, ManualDecision, NewIncident } from '@/features/incidents/decision-tools-screen';
import { navigationEn as nav , en } from '@/strings/en';
import { decisionFixtures, decisionKinds } from '../../../../../tests/fixtures/mobile/decisions';
import { MyEvents } from '@/features/events/event-screens';
import { CommandCenter, ParticipantHome } from '@/features/events/dashboard-screens';
import { Composer, type ComposerDraft } from '@/features/evidence/composer-screen';
import { pickPhoto } from '@/features/evidence/pick-photo';
import { Incident } from '@/features/incidents/incident-screen';
import { Probe } from '@/features/probes/probe-screen';
import { Offer } from '@/features/tasks/offer-screen';

import { styles as s } from '@/theme';
import { demoCategories, demoContexts, demoEvent, demoLastUpdate, demoModels, demoPolicy, demoSource, fixtureMarker, previewSession } from '../../../../../tests/fixtures/mobile/demo';

// Drafts are intentionally session-only in UI preview. Production persistence is owned by src/lib.
const drafts: Record<string, ComposerDraft> = {};
export default function PreviewShell() {
  const {screen = 'events'} = useLocalSearchParams<{screen: string}>();
  const state = useSyncExternalStore(previewSession.subscribe, previewSession.snapshot, previewSession.snapshot);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [draft, setDraft] = useState<ComposerDraft>(() => drafts[screen] ?? {text: '', photos: []});
  const go = (target: string) => router.push({pathname: '/preview/[screen]', params: {screen: target}});
  const models = demoModels(go);
  const onDraft = (next: ComposerDraft) => { drafts[screen] = next; setDraft(next); };
  const switchRole = () => { const role = state.role === 'organizer' ? 'participant' : 'organizer'; previewSession.patch({role}); go(role === 'organizer' ? 'command' : 'home'); };
  const navigation = state.role === 'organizer'
    ? [{label: en.command, screen: 'command'}, {label: en.plan, screen: 'plan'}, {label: en.people, screen: 'people'}, {label: en.timeline, screen: 'timeline'}, {label: en.more, screen: 'more'}]
    : [{label: en.home, screen: 'home'}, {label: en.tasks, screen: 'tasks'}, {label: en.inbox, screen: 'inbox'}, {label: en.me, screen: 'me'}];
  const footer = <>
    {state.phase !== 'ready' && <View style={s.footer}><Button label={en.previewReady} onPress={() => previewSession.patch({phase: 'ready'})} variant="secondary" /></View>}
    {screen === 'home' && <View style={s.footer}><View style={s.row}><View style={s.grow}><Button label={en.report} onPress={() => go('report')} /></View><View style={s.grow}><Button label={en.note} onPress={() => go('composer')} variant="secondary" /></View></View></View>}
    <View style={s.nav}>{navigation.map(item => <Pressable key={item.label} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected: item.screen === screen}}
      style={s.navItem} onPress={() => router.replace({pathname: '/preview/[screen]', params: {screen: item.screen}})}><Text style={[s.navText, item.screen === screen && s.navActive]}>{item.label === en.command ? en.commandTab : item.label}</Text>{item.screen === screen && <View style={s.navDot} />}</Pressable>)}</View>
  </>;
  const ownerOnly = ['command', 'people', 'settings', 'plan', 'draft-item', 'plan-review', 'assign', 'submission-review', 'task-editor', 'manual', 'new-incident', 'ask-probe', 'close', 'settlement'];
  if (state.role !== 'organizer' && ownerOnly.includes(screen)) return <Screen demo footer={footer}>
    <Notice>{en.errorCodes.FORBIDDEN}</Notice><Button label={en.switchRole} onPress={switchRole} variant="secondary" />
  </Screen>;
  return <Screen demo state={{phase: state.phase, offline: state.offline, lastUpdatedLabel: demoLastUpdate, errorCode: 'NETWORK_ERROR', refresh: () => previewSession.patch({phase: 'ready'})}} footer={footer}>
    <View testID={fixtureMarker} style={s.between}><Button label={en.switchRole} onPress={switchRole} variant="secondary" /><Button label={en.previewTools} onPress={() => setToolsOpen(!toolsOpen)} variant="secondary" /></View>
    {toolsOpen && <Card><Heading>{en.previewTools}</Heading><View style={s.row}>
      {([{phase: 'ready', label: en.previewReady}, {phase: 'loading', label: en.previewLoading}, {phase: 'empty', label: en.previewEmpty}, {phase: 'error', label: en.previewError}] as const).map(item => <Button key={item.phase} label={item.label} onPress={() => previewSession.patch({phase: item.phase})} variant="secondary" />)}
      <Button label={en.previewOffline} onPress={() => previewSession.patch({offline: !state.offline})} variant={state.offline ? 'accent' : 'secondary'} />
      <Button label={en.previewStale} onPress={() => previewSession.patch({stale: !state.stale})} variant={state.stale ? 'accent' : 'secondary'} />
      <Button label={en.previewFailure} onPress={() => previewSession.patch({failNext: !state.failNext})} variant={state.failNext ? 'accent' : 'secondary'} />
      <Button label={en.previewVerify} onPress={() => previewSession.patch({stage: 'verify', stale: false, probeClosed: false, safety: false})} variant="secondary" />
      <Button label={en.previewApproval} onPress={() => previewSession.patch({stage: 'ready', stale: false, probeClosed: false, safety: false})} variant="secondary" />
      <Button label={en.previewReset} onPress={() => { previewSession.reset(); go('events'); }} variant="secondary" />
      <Button label={nav.catalog} onPress={() => go('directory')} variant="secondary" />
      <Button label={en.exitDemo} onPress={() => router.replace('/')} variant="secondary" />
    </View></Card>}
    {screen === 'events' && <MyEvents isGuest={state.role === 'participant'} events={[{key: 'owner', ...demoEvent, role: 'organizer', roleLabel: en.organizer, onOpen: () => { previewSession.patch({role: 'organizer'}); go('command'); }},
      {key: 'participant', ...demoEvent, role: 'participant', roleLabel: en.participant, onOpen: () => { previewSession.patch({role: 'participant'}); go('home'); }}]}
      onJoin={() => go('join-code')} onCreate={() => go('auth')} onSignOut={() => router.replace('/')} />}
    {screen === 'command' && <CommandCenter model={models.command} onNewIncident={() => go('new-incident')} onInbox={() => go('inbox')} />}
    {screen === 'home' && <ParticipantHome model={models.home} onHere={() => go('me')} offline={state.offline} />}
    {['auth', 'join-code', 'join-consent', 'join-profile', 'waiting', 'create-event', 'people', 'settings', 'me'].includes(screen) && <OnboardingPreview key={screen} screen={screen} navigate={go} offline={state.offline} />}
    {['plan', 'draft-item', 'plan-review', 'resources', 'resource-report'].includes(screen) && <PlanningPreview key={screen} screen={screen} navigate={go} offline={state.offline} />}
    {['tasks', 'task', 'assign', 'submission-review', 'evidence', 'task-editor'].includes(screen) && <WorkPreview key={screen} screen={screen} navigate={go} offline={state.offline} owner={state.role === 'organizer'} />}
    {screen === 'new-incident' && <NewIncident demo types={decisionFixtures.types} subjects={decisionFixtures.subjects} tasks={decisionFixtures.tasks} offline={state.offline}
      onCreate={state.role === 'organizer' ? async () => {await previewSession.acknowledge({stage: 'verify'}); go('incident');} : undefined} />}
    {screen === 'manual' && <ManualDecision demo kinds={decisionKinds} maxActions={decisionFixtures.maxActions} versionKey={String(state.revision)} offline={state.offline}
      onCheck={state.role === 'organizer' ? async () => {await previewSession.check(state.revision); return decisionFixtures.check;} : undefined}
      onApply={state.role === 'organizer' ? async () => {await previewSession.acknowledge({stage: 'recovering'}, state.revision); go('incident');} : undefined} />}
    {screen === 'ask-probe' && <AskProbe demo recipients={decisionFixtures.members} questionContext={decisionFixtures.context} offline={state.offline}
      onSend={state.role === 'organizer' ? () => previewSession.acknowledge({stage: 'verify', probeClosed: false}) : undefined} />}
    {(screen === 'composer' || screen === 'report') && <Composer key={screen} demo draft={draft} onChange={onDraft} contexts={demoContexts}
      categories={screen === 'report' ? demoCategories : undefined} safetySelected={draft.categoryKey === 'safety'} maxPhotos={demoPolicy.maxPhotos}
      report={screen === 'report'} offline={state.offline} onPickPhoto={camera => pickPhoto(camera, demoPolicy)}
      onSend={async () => { await previewSession.acknowledge({stage: screen === 'report' ? 'verify' : state.stage === 'working' ? 'evidence' : state.stage,
        ...(screen === 'report' ? {safety: draft.categoryKey === 'safety', probeClosed: false} : {})}); onDraft({text: '', photos: []}); }} />}
    {screen === 'incident' && <Incident demo model={models.incident} offline={state.offline} actions={{
      onApprove: () => previewSession.acknowledge({stage: 'recovering'}, state.revision), onReject: () => previewSession.acknowledge({stage: 'verify'}),
      onRecheck: () => previewSession.acknowledge({stale: false}), onConfirm: () => previewSession.acknowledge(), onDismiss: () => previewSession.acknowledge(),
      onManual: () => go('manual'), onKnow: () => go('composer'), onAsk: () => go('ask-probe'),
      onResolve: () => previewSession.acknowledge({stage: 'resolved'}),
    }} />}
    {screen === 'probe' && <Probe key={state.stage} demo model={models.probe} offline={state.offline} maxPhotos={demoPolicy.maxPhotos} onPickPhoto={camera => pickPhoto(camera, demoPolicy)}
      onAnswer={answer => previewSession.acknowledge({stage: answer.choiceKey === 'works' ? 'ready' : 'verify'})}
      onCannotCheck={() => previewSession.acknowledge({probeClosed: true})} onDecline={() => previewSession.acknowledge({probeClosed: true})} />}
    {screen === 'offer' && <Offer key={state.stage} demo model={models.offer} offline={state.offline}
      onAccept={() => previewSession.acknowledge({stage: 'working'})} onDecline={() => previewSession.acknowledge({stage: 'verify'})} />}
    {screen === 'source' && <><PageTitle eyebrow={en.previewSource} title={demoSource.title} subtitle={demoSource.author} /><Card><Copy>{demoSource.text}</Copy><Badge>{demoSource.label}</Badge></Card></>}
    {screen === 'more' && <><PageTitle title={nav.moreTitle} subtitle={nav.moreCopy} />{(['tasks', 'resources', 'settings', 'close', 'settlement', 'events'] as const).map(route => <Button key={route} label={nav.routes[route]} onPress={() => go(route)} variant="secondary" />)}</>}
    {screen === 'directory' && <><PageTitle title={nav.catalog} subtitle={nav.catalogCopy} />{Object.entries(nav.routes).map(([route, label]) => <Button key={route} label={label} onPress={() => go(route)} variant="secondary" />)}</>}
    {['timeline', 'close', 'settlement', 'inbox', 'unavailable'].includes(screen) && <><PageTitle title={nav.routes[screen as keyof typeof nav.routes] ?? en.integrationTitle} /><Notice>{nav.ownerSlot}</Notice><Copy>{nav.ownerSlotDetail}</Copy>
      <Button label={en.back} onPress={() => router.back()} /></>}
  </Screen>;
}
