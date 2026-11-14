import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { planningEn as p } from '@/strings/en';
import { styles as s } from '@/theme';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import type { PlanningItemKind, PlanningView } from './models';

export type PlanStudioProps = {
  model: PlanningView; offline?: boolean; onSend: (message: string) => Promise<void>;
  onFinalize: () => Promise<void>; onEdit: (key: string) => void; onAdd: (kind: PlanningItemKind) => void;
  onSource: (key: string) => void;
};
export function PlanStudio({ model, offline, onSend, onFinalize, onEdit, onAdd, onSource }: PlanStudioProps) {
  const [tab, setTab] = useState<'chat' | 'draft'>('draft');
  const [message, setMessage] = useState('');
  const action = useAcknowledgedAction(model.revision);
  const disabled = model.composing || action.pending || !model.canEdit;
  const send = (text: string) => void action.run(async () => { await onSend(text); setMessage(''); });
  const sections = [{kind: 'task', label: p.tasks, add: p.addTask}, {kind: 'resource', label: p.resources, add: p.addResource},
    {kind: 'area', label: p.areas, add: p.addArea}, {kind: 'role', label: p.roles, add: p.addRole}] as const;
  if (!model.canEdit) return <><PageTitle eyebrow={p.studio} title={p.studio} /><Notice>{p.permissions}</Notice></>;
  return <><PageTitle eyebrow={p.studio} title={p.studioTitle} subtitle={p.studioCopy} />
    <Card hero><Text style={[s.heading, s.heroTitle]}>{model.published ? p.activePlan : p.draftOnly}</Text><Text style={[s.body, s.onHero]}>{p.manualHint}</Text>
      <View style={s.row}><Badge>{`${model.items.filter(item => item.kind === 'task').length} ${p.taskCount}`}</Badge><Badge tone={model.gaps.length ? 'warning' : 'neutral'}>{`${model.gaps.length} ${p.gapCount}`}</Badge></View></Card>
    <View style={s.row}><Choice label={p.chat} selected={tab === 'chat'} onPress={() => setTab('chat')} /><Choice label={p.draft} selected={tab === 'draft'} onPress={() => setTab('draft')} /></View>
    {model.composing && <Notice>{p.composing}</Notice>}{!model.canEdit && <Notice>{p.permissions}</Notice>}
    {offline && <Notice>{p.offline}</Notice>}{model.aiFailed && <Notice danger>{p.aiUnavailable}</Notice>}
    {action.error && <Notice danger>{action.error}</Notice>}{action.stale && <Notice danger>{p.stale}</Notice>}
    {tab === 'chat' ? <>
      {model.messages.map(item => <Card key={item.key}><Badge>{item.ai ? p.ai : p.human}</Badge><Copy>{item.text}</Copy><Copy small>{`${p.source} · ${item.sourceLabel}`}</Copy>
        {!!item.changes?.length && <><Heading>{p.changeSummary}</Heading>{item.changes.map((change, index) => <Copy key={`${item.key}-${index}`}>{change}</Copy>)}</>}
        <Button label={p.viewSource} variant="secondary" onPress={() => onSource(`message:${item.key}`)} /></Card>)}
      {model.questions.map(question => <Card key={question.key}><Badge>{p.ai}</Badge><Heading>{question.text}</Heading><Copy small>{`${p.questionWhy} · ${question.why}`}</Copy>
        <Button label={p.viewSource} variant="secondary" onPress={() => onSource(`question:${question.key}`)} />
        {question.answers.map(answer => <Button key={answer} label={answer} variant="secondary" disabled={disabled || offline || !model.aiAvailable} onPress={() => send(answer)} />)}</Card>)}
      {!model.aiAvailable && <Notice>{p.aiLimit}</Notice>}
      <Field label={p.message} value={message} onChangeText={setMessage} multiline placeholder={p.messagePlaceholder} disabled={disabled || !model.aiAvailable} />
      <Button label={p.send} pending={action.pending} disabled={disabled || offline || !model.aiAvailable || !message.trim() || action.stale} onPress={() => send(message.trim())} />
    </> : <>
      {model.items.length === 0 && <Notice>{p.emptyDraft}</Notice>}
      {sections.map(section => <View key={section.kind} style={s.stack}><View style={s.between}><Heading>{section.label}</Heading><Badge>{model.items.filter(item => item.kind === section.kind).length}</Badge></View>
        {model.items.filter(item => item.kind === section.kind).map(item => <Card key={item.key}><View style={s.between}><Heading>{item.title}</Heading><Badge>{item.locked ? p.locked : item.ai ? p.ai : p.human}</Badge></View>
          <Copy>{item.detail}</Copy><Copy small>{`${p.source} · ${item.sourceLabel}`}</Copy><Button label={p.viewSource} variant="secondary" onPress={() => onSource(`item:${item.key}`)} /><Button label={`${p.edit} · ${item.title}`} variant="secondary" disabled={disabled} onPress={() => onEdit(item.key)} /></Card>)}
        <Button label={section.add} variant="secondary" disabled={disabled} onPress={() => onAdd(section.kind)} /></View>)}
    </>}
    {!model.published && <Button label={model.aiAvailable ? p.finalize : p.reviewManual} variant="accent" pending={action.pending} disabled={disabled || offline || !model.items.some(item => item.kind === 'task') || action.stale}
      onPress={() => void action.run(onFinalize)} />}
  </>;
}

export function PlanReview({ model, offline, demo, onBack, onPublish, onResources, onSource }: {
  model: PlanningView; offline?: boolean; demo?: boolean; onBack: () => void; onPublish: () => Promise<void>; onResources: () => void;
  onSource: (key: string) => void;
}) {
  const action = useAcknowledgedAction(model.revision);
  const [confirm, setConfirm] = useState(false);
  const disabled = offline || action.pending || action.stale || model.composing || !model.canEdit || !model.finalized || model.published;
  if (!model.canEdit) return <><PageTitle title={p.review} /><Notice>{p.permissions}</Notice></>;
  return <><PageTitle eyebrow={p.review} title={p.reviewTitle} subtitle={p.reviewCopy} />
    <View style={s.metrics}>{([{kind: 'task', label: p.tasks}, {kind: 'resource', label: p.resources}, {kind: 'area', label: p.areas}] as const).map(metric =>
      <View key={metric.kind} style={s.metric}><Text style={s.title}>{model.items.filter(item => item.kind === metric.kind).length}</Text><Copy small>{metric.label}</Copy></View>)}</View>
    <Card><Heading>{p.timeline}</Heading><Copy small>{model.timeContext}</Copy>{model.timeline.map(item => <View key={item.key} style={s.stack}><View style={s.row}><Badge>{item.time}</Badge><Heading>{item.title}</Heading></View><Copy small>{item.area}</Copy><Button label={p.viewSource} variant="secondary" onPress={() => onSource(`item:${item.key}`)} /></View>)}</Card>
    <Card><View style={s.between}><Heading>{p.gaps}</Heading><Badge tone={model.gaps.length ? 'warning' : 'neutral'}>{model.gaps.length}</Badge></View>
      {model.gaps.length ? model.gaps.map((gap, i) => <View key={i} style={s.stack}><Notice>{gap}</Notice><Button label={p.viewSource} variant="secondary" onPress={() => onSource(`gap:${i}`)} /></View>) : <Copy>{p.noGaps}</Copy>}</Card>
    <Card><Badge>{p.ai}</Badge><Heading>{p.assumptions}</Heading>{model.assumptions.length ? <>{model.assumptions.map((item, i) => <Copy key={i}>{item}</Copy>)}<Button label={p.viewSource} variant="secondary" onPress={() => onSource('assumptions')} /></> : <Copy>{p.noAssumptions}</Copy>}</Card>
    {!model.finalized && !model.published && <Notice>{p.reviewRequired}</Notice>}{action.error && <Notice danger>{action.error}</Notice>}{action.stale && <Notice danger>{p.stale}</Notice>}
    {model.published ? <><Notice>{demo ? p.publishedDemo : p.published}</Notice><Button label={p.openResources} onPress={onResources} /></> : <>
      <Button label={p.backEditing} variant="secondary" disabled={action.pending} onPress={onBack} />
      {confirm ? <Card><Heading>{p.publishConfirm}</Heading><Copy>{p.publishCopy}</Copy><Button label={p.confirmPublish} disabled={disabled} pending={action.pending} onPress={() => void action.run(onPublish)} />
        <Button label={p.cancel} variant="secondary" disabled={action.pending} onPress={() => setConfirm(false)} /></Card>
        : <Button label={p.publish} variant="accent" disabled={disabled} onPress={() => setConfirm(true)} />}
    </>}
  </>;
}
