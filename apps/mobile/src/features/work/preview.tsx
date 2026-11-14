import { useEffect, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { Button, Card } from '@/components/ui';
import { styles as s } from '@/theme';
import { workEn as w } from '@/strings/en';
import { pickPhoto } from '@/features/evidence/pick-photo';
import { workPhotoLimits, workPreviewModels, workPreviewSession } from '../../../../../tests/fixtures/mobile/work';
import { TaskBoard } from './task-board';
import { TaskDetail } from './task-detail';
import { Assign } from './assign';
import { SubmissionReview } from './submission-review';
import { EvidenceDetail } from './evidence-detail';
import { TaskSubmission } from './task-submission';
import { TaskEditor } from './task-editor';

// Imported only by the explicitly gated development preview route.
export function WorkPreview({screen, navigate, offline, owner}: {screen: string; navigate: (screen: string) => void; offline: boolean; owner?: boolean}) {
  const state = useSyncExternalStore(workPreviewSession.subscribe, workPreviewSession.snapshot, workPreviewSession.snapshot);
  const [composing, setComposing] = useState<'submission' | 'supplement'>();
  const isOwner = owner ?? state.owner;
  useEffect(() => {workPreviewSession.setOffline(offline);}, [offline]);
  useEffect(() => {if (owner !== undefined) workPreviewSession.setOwner(owner);}, [owner, state.owner]);
  const models = workPreviewModels(navigate, mode => setComposing(mode), isOwner);
  return <><Card><View style={s.row}>
    {owner === undefined && <Button label={isOwner ? w.participantView : w.ownerView} onPress={workPreviewSession.toggleOwner} variant="secondary" />}
    <Button label={state.failNext ? w.previewSuccess : w.previewFailure} onPress={workPreviewSession.toggleFailure} variant="secondary" />
    <Button label={state.aiAvailable ? w.previewAiOff : w.previewAiOn} onPress={workPreviewSession.toggleAi} variant="secondary" />
    {screen === 'assign' && <Button label={w.previewPartialOffers} onPress={workPreviewSession.togglePartialOffers} variant={state.partialOffers ? 'accent' : 'secondary'} />}
    <Button label={w.previewReset} onPress={() => {workPreviewSession.reset(); setComposing(undefined);}} variant="secondary" />
    {screen === 'task' && <><Button label={w.previewOffered} onPress={workPreviewSession.showOffered} variant="secondary" />
      <Button label={w.previewAccepted} onPress={workPreviewSession.showAccepted} variant="secondary" />
      <Button label={w.previewBlocked} onPress={workPreviewSession.showBlocked} variant="secondary" />
      <Button label={w.previewSubmitted} onPress={workPreviewSession.showSubmitted} variant="secondary" /></>}
  </View></Card>
    {screen === 'tasks' && <TaskBoard tasks={models.board} offline={offline} onAdd={isOwner ? models.add : undefined}
      onSuggest={isOwner ? () => navigate('assign') : undefined} />}
    {screen === 'task' && (composing && !isOwner && (composing === 'submission' ? !!models.actions.onSubmit : !!models.actions.onAddEvidence) ? <><Button label={w.returnTask} onPress={() => setComposing(undefined)} variant="secondary" />
      <TaskSubmission demo photoExpected={composing === 'submission' && models.model.criteria.some(item => item.photoExpected)} draft={state.draft} onChange={workPreviewSession.setDraft}
        maxPhotos={workPhotoLimits.maxPhotos} contexts={[]} offline={offline} onPickPhoto={camera => pickPhoto(camera, workPhotoLimits)}
        onSend={async draft => {await (composing === 'supplement' ? workPreviewSession.supplement(draft) : workPreviewSession.submit(draft)); setComposing(undefined);}} /></>
      : <TaskDetail model={models.model} actions={models.actions} offline={offline} demo />)}
    {screen === 'assign' && <Assign versionKey={String(state.revision)} tasks={models.suggestions} results={state.offerResults} offline={offline || !isOwner} demo onSend={models.sendOffers} />}
    {screen === 'submission-review' && <SubmissionReview model={models.review} offline={offline} demo onApprove={models.approve} onRequestChanges={models.requestChanges} />}
    {screen === 'evidence' && <EvidenceDetail model={models.evidence} />}
    {screen === 'task-editor' && <TaskEditor {...models.editor} offline={offline} demo />}
  </>;
}
