import { useSyncExternalStore } from 'react';
import { Modal } from 'react-native';
import { Button } from '@/components/ui';
import { Screen } from '@/components/screen';
import { planningEn as p } from '@/strings/en';
import { pickPhoto } from '../evidence/pick-photo';
import { DraftItemEditor } from './editor-screen';
import { PlanReview, PlanStudio } from './studio-screen';
import { ResourceReport, ResourcesAreas } from './resources-screen';
import { EvidenceDetail } from '../work/evidence-detail';
import type { PlanningItemKind } from './models';
import { demoPolicy } from '../../../../../tests/fixtures/mobile/demo';
import { planningEditorItem, planningEditorOptions, planningReportChoices, planningResources, planningSession, planningView } from '../../../../../tests/fixtures/mobile/planning';

export function PlanningPreview({screen, navigate, offline}: {screen: string; navigate: (screen: string) => void; offline: boolean}) {
  const state = useSyncExternalStore(planningSession.subscribe, planningSession.snapshot, planningSession.snapshot);
  const model = planningView();
  const options = planningEditorOptions();
  const edit = (key: string) => { planningSession.edit(key, screen); navigate('draft-item'); };
  const add = (kind: PlanningItemKind) => { planningSession.add(kind, screen); navigate('draft-item'); };
  const onSource = planningSession.showSource;
  const render = () => {
  if (screen === 'draft-item') return <DraftItemEditor key={state.selected} item={planningEditorItem()} form={state.editing} options={options} revision={model.revision}
    demo isNew={state.isNew} liveResource={state.published && !state.isNew} canEdit={model.canEdit} offline={offline} composing={model.composing} onChange={planningSession.change}
    onSave={planningSession.save} onDelete={async () => {await planningSession.remove(); navigate(state.returnScreen);}}
    onLock={planningSession.lock} onBack={() => navigate(state.returnScreen)} onSource={onSource} />;
  if (screen === 'plan-review') return <PlanReview model={model} demo offline={offline} onBack={() => navigate('plan')} onPublish={planningSession.publish} onResources={() => navigate('resources')} onSource={onSource} />;
  if (screen === 'resources') return <ResourcesAreas model={planningResources()} onEditResource={edit} onEditArea={edit} onAddArea={() => add('area')} onAddResource={() => add('resource')}
    onReport={key => {planningSession.report(key); navigate('resource-report');}} onSource={onSource} />;
  if (screen === 'resource-report') return <><ResourceReport key={state.reportKey} demo resourceTitle={state.items.find(item => item.key === state.reportKey)?.title ?? p.resources}
    choices={planningReportChoices} movedChoiceKey="moved" areas={options.areas} draft={state.report} onChange={planningSession.changeReport}
    onSend={planningSession.sendReport} maxPhotos={demoPolicy.maxPhotos} offline={offline} onPickPhoto={camera => pickPhoto(camera, demoPolicy)} />
    <Button label={p.openResources} variant="secondary" onPress={() => navigate('resources')} /></>;
  return <>{!model.published && <Button label={state.aiEnabled ? p.manualMode : p.aiMode} variant="secondary" disabled={model.composing} onPress={planningSession.toggleAI} />}
    <PlanStudio model={model} offline={offline} onSend={planningSession.send} onEdit={edit} onAdd={add} onSource={onSource}
      onFinalize={async () => {await planningSession.finalize(); navigate('plan-review');}} /></>;
  };
  return <>{render()}<Modal visible={!!state.source} animationType="slide" onRequestClose={planningSession.closeSource}>
    <Screen topInset demo><Button label={p.closeSource} variant="secondary" onPress={planningSession.closeSource} />
      {state.source && <EvidenceDetail model={state.source} />}</Screen>
  </Modal></>;
}
