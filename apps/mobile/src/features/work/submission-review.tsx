import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { styles as s } from '@/theme';
import { workEn as w } from '@/strings/en';
import { useAcknowledgedAction } from '@/features/shared/use-acknowledged-action';
import { ActionFeedback, PhotoGallery, Tick, type EvidencePhoto } from './common';

export type ReviewCriterion = {key: string; text: string; critical: boolean;
  aiCheck?: {label: string; explanation: string; sourceLabels?: string[]; onSource: () => void}};
export type SubmissionReviewView = {versionKey: string; title: string; authorLabel: string; timeLabel: string; note: string;
  photos: EvidencePhoto[]; criteria: ReviewCriterion[]; canReview: boolean; aiUnavailable: boolean};
export type CriterionAssessment = {criterionKey: string; met: boolean};
export type SubmissionReviewProps = {model: SubmissionReviewView; offline?: boolean; demo?: boolean;
  onApprove: (criteria: CriterionAssessment[]) => Promise<void>;
  onRequestChanges: (input: {criteria: CriterionAssessment[]; reason: string; openIncident: boolean}) => Promise<void>};
export function SubmissionReview(props: SubmissionReviewProps) { return <ReviewForm key={props.model.versionKey} {...props} />; }
function ReviewForm({model, offline, demo, onApprove, onRequestChanges}: SubmissionReviewProps) {
  // Never initialize the owner's choices from AI checks or an earlier submission.
  const [checked, setChecked] = useState<Record<string, boolean | undefined>>({});
  const [reason, setReason] = useState('');
  const [openIncident, setOpenIncident] = useState(false);
  const action = useAcknowledgedAction(model.versionKey);
  const disabled = offline || !model.canReview || action.pending || action.acknowledged || action.stale;
  const criticalMissing = model.criteria.some(criterion => criterion.critical && checked[criterion.key] !== true);
  const assessments = model.criteria.flatMap(criterion => checked[criterion.key] === undefined ? [] : [{criterionKey: criterion.key, met: checked[criterion.key]!}]);
  return <><PageTitle eyebrow={w.review} title={model.title} subtitle={`${model.authorLabel} · ${model.timeLabel}`} /><Copy>{w.reviewCopy}</Copy>
    {!model.canReview && <Notice>{w.alreadyReviewed}</Notice>}
    <Card><Heading>{w.note}</Heading><Copy>{model.note}</Copy>{model.photos.length > 0 ? <><Heading>{w.photos}</Heading><PhotoGallery photos={model.photos} /></> : <Copy small>{w.noPhotos}</Copy>}</Card>
    {model.aiUnavailable && <Notice>{w.aiUnavailable}</Notice>}
    {model.criteria.map(criterion => <Card key={criterion.key}><Heading>{criterion.text}</Heading>{criterion.critical && <Badge tone="warning">{w.critical}</Badge>}
      {criterion.aiCheck && <View style={s.stack}><Badge>{`${w.aiCheck} · ${criterion.aiCheck.label}`}</Badge><Copy>{criterion.aiCheck.explanation}</Copy>
        {criterion.aiCheck.sourceLabels?.map(label => <Copy key={label} small>{label}</Copy>)}
        <Button label={w.source} onPress={criterion.aiCheck.onSource} variant="secondary" /></View>}
      <Heading>{w.yourAssessment}</Heading>{checked[criterion.key] === undefined && <Copy small>{w.unchecked}</Copy>}
      <Tick label={w.met} checked={checked[criterion.key] === true} disabled={disabled} onChange={() => setChecked({...checked, [criterion.key]: checked[criterion.key] === true ? undefined : true})} />
      <Tick label={w.notMet} checked={checked[criterion.key] === false} disabled={disabled} onChange={() => setChecked({...checked, [criterion.key]: checked[criterion.key] === false ? undefined : false})} />
    </Card>)}
    {criticalMissing && <Notice>{w.criticalGate}</Notice>}
    <Button label={w.approve} disabled={disabled || criticalMissing} pending={action.pending} onPress={() => void action.run(() => onApprove(assessments))} />
    <Card><Heading>{w.changes}</Heading><Field label={w.changesReason} value={reason} onChangeText={setReason} disabled={disabled} multiline />
      <Tick label={w.incident} checked={openIncident} disabled={disabled} onChange={() => setOpenIncident(!openIncident)} /><Copy small>{w.incidentHelp}</Copy>
      <Button label={w.changes} disabled={disabled || !reason.trim()} onPress={() => void action.run(() => onRequestChanges({criteria: assessments, reason: reason.trim(), openIncident}))} variant="secondary" />
    </Card><ActionFeedback {...action} demo={demo} />
  </>;
}
