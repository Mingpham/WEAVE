import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { styles as s } from '@/theme';
import { workEn as w } from '@/strings/en';
import { useAcknowledgedAction } from '@/features/shared/use-acknowledged-action';
import { ActionFeedback } from './common';

export type TaskDetailView = {
  versionKey: string; title: string; description: string; statusLabel: string; areaLabel: string; assigneeLabel: string; dueLabel: string;
  riskLabel?: string; riskReasons: string[]; criteria: {key: string; text: string; statusLabel?: string; critical: boolean; photoExpected: boolean}[];
  metadata?: {label: string; value: string}[];
  terminal?: boolean; stale?: boolean; readOnlyReason?: string;
  evidenceSuggestion?: string;
  dependencies: {key: string; title: string; relationLabel: string; detail: string; onOpen: () => void}[];
  resources: {key: string; title: string; detail: string; onOpen: () => void}[];
  history: {key: string; text: string; timeLabel: string}[];
  submissions: {key: string; title: string; detail: string; onOpen: () => void}[];
  startBlockedReason?: string; releaseReasons: {key: string; label: string}[];
};
export type TaskDetailActions = {
  onAccept?: () => Promise<void>; onDecline?: (reason: string) => Promise<void>; onStart?: () => Promise<void>;
  onRelease?: (reason: string) => Promise<void>; onCancel?: () => Promise<void>; onDefer?: () => Promise<void>;
  onReopen?: () => Promise<void>; onUnlock?: () => Promise<void>; onRevoke?: () => Promise<void>;
  onEdit?: () => void; onInvite?: () => void; onSubmit?: () => void; onAddEvidence?: () => void;
};
export type TaskDetailProps = {model: TaskDetailView; actions: TaskDetailActions; offline?: boolean; demo?: boolean};
type ConfirmedAction = 'onCancel' | 'onDefer' | 'onUnlock' | 'onRevoke';
type Confirmation = {versionKey: string; label: string; consequence?: string; actionKey: ConfirmedAction};
export function TaskDetail({model, actions, offline, demo}: TaskDetailProps) {
  const action = useAcknowledgedAction(model.versionKey);
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [reasonMode, setReasonMode] = useState<'decline' | 'release'>();
  const [reasonVersion, setReasonVersion] = useState(model.versionKey);
  const [declineReason, setDeclineReason] = useState('');
  const [releaseReason, setReleaseReason] = useState('');
  const locked = action.pending || action.acknowledged || action.stale || model.stale || model.terminal || !!model.readOnlyReason;
  const disabled = offline || locked;
  const hasActions = Object.values(actions).some(callback => typeof callback === 'function');
  const releaseValid = model.releaseReasons.some(item => item.key === releaseReason);
  const confirm = (label: string, consequence: string, actionKey: ConfirmedAction) => setConfirmation({versionKey: model.versionKey, label, consequence, actionKey});
  return <><PageTitle eyebrow={w.task} title={model.title} subtitle={model.areaLabel} />
    <View style={s.row}><Badge>{model.statusLabel}</Badge>{model.riskLabel && <Badge tone="warning">{model.riskLabel}</Badge>}</View>
    {model.terminal && <Notice>{w.terminalTask}</Notice>}
    {model.readOnlyReason && <Notice>{model.readOnlyReason}</Notice>}
    {model.stale && <Notice danger>{w.stale}</Notice>}
    {!hasActions && !model.terminal && !model.readOnlyReason && <Copy small>{w.noTaskActions}</Copy>}
    {offline && <Notice>{w.offlineActions}</Notice>}
    <Card><Copy small>{w.assignee}</Copy><Heading>{model.assigneeLabel}</Heading><Copy small>{`${w.due} · ${model.dueLabel}`}</Copy></Card>
    {!!model.metadata?.length && <Card>{model.metadata.map(item => <View key={item.label} style={s.stack}><Copy small>{item.label}</Copy><Copy>{item.value}</Copy></View>)}</Card>}
    <Card><Heading>{w.description}</Heading><Copy>{model.description}</Copy></Card>
    <Heading>{w.criteria}</Heading>{model.criteria.map(item => <Card key={item.key}><Copy>{item.text}</Copy><View style={s.row}>
      {item.critical && <Badge tone="warning">{w.critical}</Badge>}{item.photoExpected && <Badge>{w.photoExpected}</Badge>}{item.statusLabel && <Badge>{item.statusLabel}</Badge>}
    </View></Card>)}
    {model.riskReasons.length > 0 && <Card><Heading>{w.risk}</Heading>{model.riskReasons.map(line => <Copy key={line}>{line}</Copy>)}</Card>}
    <Heading>{w.dependencies}</Heading>{model.dependencies.length === 0 ? <Copy small>{w.noDependencies}</Copy> : model.dependencies.map(item =>
      <Card key={item.key}><Badge>{item.relationLabel}</Badge><Heading>{item.title}</Heading><Copy>{item.detail}</Copy><Button label={w.openTask} onPress={item.onOpen} variant="secondary" /></Card>)}
    <Heading>{w.resources}</Heading>{model.resources.length === 0 ? <Copy small>{w.noResources}</Copy> : model.resources.map(item =>
      <Card key={item.key}><Heading>{item.title}</Heading><Copy>{item.detail}</Copy><Button label={w.openRelated} onPress={item.onOpen} variant="secondary" /></Card>)}
    {model.startBlockedReason && <Notice>{`${w.waitingOn}: ${model.startBlockedReason}`}</Notice>}
    {actions.onAccept && <Button label={w.accept} disabled={disabled} pending={action.pending} onPress={() => void action.run(actions.onAccept!)} />}
    {actions.onDecline && <Button label={w.decline} disabled={disabled} onPress={() => {setReasonVersion(model.versionKey); setReasonMode('decline');}} variant="secondary" />}
    {actions.onStart && <Button label={w.start} disabled={disabled || !!model.startBlockedReason} onPress={() => void action.run(actions.onStart!)} />}
    {actions.onSubmit && <Button label={w.submit} disabled={locked} onPress={actions.onSubmit} />}
    {model.evidenceSuggestion && <Card><Badge>{w.aiSuggestion}</Badge><Copy>{model.evidenceSuggestion}</Copy>
      {actions.onAddEvidence && <Button label={w.addEvidence} disabled={locked} onPress={actions.onAddEvidence} variant="secondary" />}</Card>}
    {actions.onRelease && <Button label={w.release} disabled={disabled} onPress={() => {setReasonVersion(model.versionKey); setReasonMode('release');}} variant="secondary" />}
    {reasonMode && reasonVersion === model.versionKey && (reasonMode === 'release' ? actions.onRelease : actions.onDecline) && <Card><Heading>{reasonMode === 'release' ? w.release : w.decline}</Heading>
      {reasonMode === 'release' ? <><Copy>{w.releaseConsequence}</Copy><Heading>{w.chooseReason}</Heading><View accessibilityRole="radiogroup" accessibilityLabel={w.chooseReason} style={s.stack}>{model.releaseReasons.map(item =>
        <Choice key={item.key} label={item.label} selected={releaseReason === item.key} disabled={disabled} onPress={() => setReleaseReason(item.key)} />)}</View>
        {!releaseValid && <Notice>{w.releaseReasonRequired}</Notice>}</>
        : <Field label={w.optionalReason} value={declineReason} onChangeText={setDeclineReason} disabled={disabled} multiline />}
      <Button label={w.confirm} disabled={disabled || (reasonMode === 'release' && !releaseValid)} onPress={() => void action.run(async () => {
        if (reasonMode === 'release' && actions.onRelease) await actions.onRelease(releaseReason);
        else if (reasonMode === 'decline' && actions.onDecline) await actions.onDecline(declineReason.trim());
        else throw {code: 'FORBIDDEN'};
        setReasonMode(undefined);
      })} /><Button label={w.keep} disabled={action.pending} onPress={() => setReasonMode(undefined)} variant="secondary" />
    </Card>}
    {actions.onEdit && <Button label={w.edit} disabled={disabled} onPress={actions.onEdit} variant="secondary" />}
    {actions.onInvite && <Button label={w.invite} disabled={disabled} onPress={actions.onInvite} variant="secondary" />}
    {actions.onUnlock && <Button label={w.unlock} disabled={disabled} onPress={() => confirm(w.unlock, w.unlockConsequence, 'onUnlock')} variant="secondary" />}
    {actions.onRevoke && <Button label={w.revoke} disabled={disabled} onPress={() => confirm(w.revoke, w.revokeConsequence, 'onRevoke')} variant="secondary" />}
    {actions.onDefer && <Button label={w.defer} disabled={disabled} onPress={() => confirm(w.defer, w.deferConsequence, 'onDefer')} variant="secondary" />}
    {actions.onReopen && <Button label={w.reopen} disabled={disabled} onPress={() => void action.run(actions.onReopen!)} variant="secondary" />}
    {actions.onCancel && <Button label={w.cancelTask} disabled={disabled} onPress={() => confirm(w.cancelTask, w.cancelConsequence, 'onCancel')} variant="danger" />}
    {confirmation && confirmation.versionKey === model.versionKey && actions[confirmation.actionKey] && <Card><Heading>{confirmation.label}</Heading><Copy>{confirmation.consequence}</Copy><Button label={w.confirm} disabled={disabled} pending={action.pending}
      onPress={() => void action.run(async () => {const send = actions[confirmation.actionKey]; if (!send) throw {code: 'FORBIDDEN'}; await send(); setConfirmation(undefined);})} />
      <Button label={w.keep} disabled={action.pending} onPress={() => setConfirmation(undefined)} variant="secondary" /></Card>}
    <ActionFeedback {...action} demo={demo} />
    <Heading>{w.submissions}</Heading>{model.submissions.length === 0 ? <Copy small>{w.noSubmissions}</Copy> : model.submissions.map(item => <Card key={item.key}>
      <Heading>{item.title}</Heading><Copy>{item.detail}</Copy><Button label={w.viewSubmission} onPress={item.onOpen} variant="secondary" /></Card>)}
    <Heading>{w.history}</Heading>{model.history.length === 0 ? <Copy small>{w.emptyHistory}</Copy> : model.history.map(item => <Card key={item.key}><Copy>{item.text}</Copy><Copy small>{item.timeLabel}</Copy></Card>)}
  </>;
}
