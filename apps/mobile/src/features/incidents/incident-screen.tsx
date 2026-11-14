import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { en } from '@/strings/en';
import { styles as s } from '@/theme';
import { approvalBlock } from '../shared/interaction';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';

export type SourceLine = { key: string; text: string; label: string; onSource: () => void };
export type DecisionOption = {
  key: string; title: string; actions: string[]; validityLabel: string; canApprove: boolean; requiresReason: boolean;
  ai: boolean; recommended: boolean; checks: SourceLine[]; tradeoffs: string[]; assumptions: string[];
};
export type IncidentView = {
  versionKey: string;
  title: string; summary: string; statusLabel: string; severityLabel: string; readinessLabel: string; ai: boolean; aiUnavailable: boolean;
  canManage: boolean; suspected: boolean; recovering: boolean; resolved: boolean; safety: boolean;
  stale: boolean; revisionMatches: boolean; canDecide: boolean; canResolve: boolean;
  sources: SourceLine[]; affected: {key: string; title: string; riskLabel: string}[]; known: SourceLine[];
  unknown: {key: string; question: string; askingLabel?: string}[];
  options: DecisionOption[]; changed?: string; resolutionEvidence: SourceLine[];
};
export type IncidentActions = {
  onApprove: (optionKey: string, reason?: string) => Promise<void>; onReject: () => Promise<void>;
  onRecheck: () => Promise<void>; onConfirm: () => Promise<void>; onDismiss: () => Promise<void>;
  onManual: () => void; onKnow: (unknownKey: string) => void; onAsk: (unknownKey: string) => void;
  onResolve: (input: {evidenceKey?: string; withoutEvidence: boolean; reason: string}) => Promise<void>;
};
function Sources({ items }: {items: SourceLine[]}) {
  return <>{items.map(item => <View key={item.key} style={s.stack}><Copy>{item.text}</Copy><Badge>{item.label}</Badge><Button label={en.evidence} onPress={item.onSource} variant="secondary" /></View>)}</>;
}
export function Incident({ model, actions, offline = false, demo = false }: {model: IncidentView; actions: IncidentActions; offline?: boolean; demo?: boolean}) {
  const [selected, setSelected] = useState<string>();
  const [reason, setReason] = useState('');
  const [evidenceKey, setEvidenceKey] = useState<string>();
  const [withoutEvidence, setWithoutEvidence] = useState(false);
  const [resolutionReason, setResolutionReason] = useState('');
  const action = useAcknowledgedAction(model.versionKey);
  const recheck = useAcknowledgedAction();
  const option = model.options.find(item => item.key === selected);
  const blocked = approvalBlock({stale: model.stale || action.stale, revisionMatches: model.revisionMatches,
    canApprove: model.canManage && model.canDecide && !!option?.canApprove && !model.safety, offline});
  const disabled = offline || action.pending || action.acknowledged || recheck.pending;
  return <><PageTitle eyebrow={en.decision} title={model.title} trailing={<Badge tone="warning">{model.severityLabel}</Badge>} />
    <View style={s.row}><Badge>{model.statusLabel}</Badge><Badge>{model.readinessLabel}</Badge>{model.ai && <Badge>{en.ai}</Badge>}</View>
    {model.safety && <Notice danger>{en.emergency}</Notice>}
    {model.recovering && <Notice>{en.recoveringCopy}</Notice>}{model.resolved && <Notice>{en.resolvedCopy}</Notice>}
    {(model.stale || !model.revisionMatches || action.stale) && <Notice danger>{en.stale}</Notice>}
    {model.aiUnavailable && <Notice>{en.aiUnavailable}</Notice>}
    <Card><Heading>{en.happened}</Heading><Copy>{model.summary}</Copy><Sources items={model.sources} /></Card>
    <Heading>{en.affected}</Heading>{model.affected.map(task => <Card key={task.key}><View style={s.between}><Heading>{task.title}</Heading><Badge tone="warning">{task.riskLabel}</Badge></View></Card>)}
    <Card><Heading>{en.known}</Heading><Sources items={model.known} /></Card>
    {model.unknown.length > 0 && <Card><Heading>{en.unknown}</Heading>{model.unknown.map(unknown => <View key={unknown.key} style={s.stack}>
      <Copy>{unknown.question}</Copy>{unknown.askingLabel && <Copy small>{unknown.askingLabel}</Copy>}
      {model.canManage && !model.safety && <><Button label={en.know} disabled={disabled} onPress={() => actions.onKnow(unknown.key)} variant="secondary" />
        <Button label={en.ask} disabled={disabled} onPress={() => actions.onAsk(unknown.key)} variant="secondary" /></>}
    </View>)}</Card>}
    {model.changed && <Card><Heading>{en.changed}</Heading><Copy>{model.changed}</Copy></Card>}
    {model.canManage && model.suspected && <View style={s.stack}><Button label={en.confirm} disabled={disabled} onPress={() => void action.run(actions.onConfirm)} />
      <Button label={en.dismiss} disabled={disabled} onPress={() => void action.run(actions.onDismiss)} variant="secondary" /></View>}
    {!model.safety && model.options.length > 0 && <><Heading>{en.options}</Heading>{model.options.map(item => <Card key={item.key}>
      <View style={s.row}><Badge>{item.validityLabel}</Badge>{item.ai && <Badge>{en.ai}</Badge>}{item.recommended && <Badge>{en.recommended}</Badge>}{!item.ai && <Badge>{en.notRanked}</Badge>}</View>
      {model.canManage ? <Choice label={item.title} selected={selected === item.key} disabled={disabled || model.stale || action.stale || !model.revisionMatches || !model.canDecide}
        onPress={() => { setSelected(item.key); setReason(''); }} /> : <Heading>{item.title}</Heading>}
      {item.actions.map(line => <Copy key={line}>{line}</Copy>)}<Heading>{en.checks}</Heading><Sources items={item.checks} />
      {item.tradeoffs.length > 0 && <><Copy small>{en.tradeoffs}</Copy>{item.tradeoffs.map(line => <Copy key={line}>{`· ${line}`}</Copy>)}</>}
      {item.assumptions.length > 0 && <><Copy small>{en.assumptions}</Copy>{item.assumptions.map(line => <Copy key={line}>{`· ${line}`}</Copy>)}</>}
    </Card>)}
      {model.canManage && <>{option?.requiresReason && <Field label={en.overrideReason} value={reason} onChangeText={setReason} multiline disabled={disabled} />}
        <Button testID="approve-proposal" label={option?.requiresReason ? en.approveAnyway : en.approve} pending={action.pending}
          disabled={disabled || !!blocked || (!!option?.requiresReason && !reason.trim())}
          onPress={() => { if (option && !blocked) void action.run(() => actions.onApprove(option.key, option.requiresReason ? reason.trim() : undefined)); }} />
        <Button label={en.reject} disabled={disabled || !model.canDecide || model.stale || action.stale || !model.revisionMatches} variant="secondary" onPress={() => void action.run(actions.onReject)} />
      </>}
    </>}
    {model.canManage && !model.resolved && <View style={s.stack}><Button label={en.manual} disabled={disabled} onPress={actions.onManual} variant="secondary" />
      <Button label={en.recheck} disabled={offline || action.pending} pending={recheck.pending} onPress={() => void recheck.run(actions.onRecheck)} variant="secondary" /></View>}
    {model.canManage && model.canResolve && !model.resolved && <Card><Heading>{en.resolutionEvidence}</Heading>
      {model.resolutionEvidence.map(item => <Choice key={item.key} label={item.text} selected={!withoutEvidence && evidenceKey === item.key} disabled={disabled}
        onPress={() => { setWithoutEvidence(false); setEvidenceKey(item.key); }}><Button label={en.evidence} onPress={item.onSource} variant="secondary" /></Choice>)}
      <Choice label={en.withoutEvidence} selected={withoutEvidence} disabled={disabled} onPress={() => { setWithoutEvidence(true); setEvidenceKey(undefined); }} />
      {withoutEvidence && <Field label={en.resolutionReason} value={resolutionReason} onChangeText={setResolutionReason} multiline disabled={disabled} />}
      <Button label={en.markResolved} disabled={disabled || (withoutEvidence ? !resolutionReason.trim() : !evidenceKey)} pending={action.pending}
        onPress={() => void action.run(() => actions.onResolve({evidenceKey, withoutEvidence, reason: resolutionReason.trim()}))} />
    </Card>}
    {recheck.error && <Notice danger>{recheck.error}</Notice>}{action.error && <Notice danger>{action.error}</Notice>}{action.acknowledged && <Notice>{demo ? en.demoAck : en.sent}</Notice>}
  </>;
}
