import { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
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
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(12);
  const [messageCount, setMessageCount] = useState(12);
  const action = useAcknowledgedAction(model.revision);
  const disabled = model.composing || action.pending || !model.canEdit || action.stale;
  const send = (text: string) => {Keyboard.dismiss(); void action.run(async () => { await onSend(text); setMessage(''); });};
  const matching = model.items.filter(item => `${item.title} ${item.detail}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
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
      {model.messages.length > messageCount && <Button label={p.olderMessages} variant="secondary" onPress={() => setMessageCount(count => count + 12)} />}
      {model.messages.slice(-messageCount).map(item => <Card key={item.key}><Badge>{item.ai ? p.ai : p.human}</Badge><Copy>{item.text}</Copy><Copy small>{`${p.source} · ${item.sourceLabel}`}</Copy>
        {!!item.changes?.length && <><Heading>{p.changeSummary}</Heading>{item.changes.map((change, index) => <Copy key={`${item.key}-${index}`}>{change}</Copy>)}</>}
        <Button label={p.viewSource} variant="secondary" onPress={() => onSource(`message:${item.key}`)} /></Card>)}
      {model.questions.map(question => <Card key={question.key}><Badge>{p.ai}</Badge><Heading>{question.text}</Heading><Copy small>{`${p.questionWhy} · ${question.why}`}</Copy>
        <Button label={p.viewSource} variant="secondary" onPress={() => onSource(`question:${question.key}`)} />
        {question.answers.map(answer => <Button key={answer} label={answer} variant="secondary" disabled={disabled || offline || !model.aiAvailable} onPress={() => send(answer)} />)}</Card>)}
      {!model.aiAvailable && <Notice>{p.aiLimit}</Notice>}
      <Button label={p.manualEdit} variant="secondary" disabled={model.composing || action.pending} onPress={() => {Keyboard.dismiss(); setTab('draft');}} />
      <Field label={p.message} value={message} onChangeText={setMessage} multiline placeholder={p.messagePlaceholder} disabled={disabled || !model.aiAvailable} />
      <Button label={p.send} pending={action.pending} disabled={disabled || offline || !model.aiAvailable || !message.trim() || action.stale} onPress={() => send(message.trim())} />
    </> : <>
      {model.items.length === 0 ? <Card><Copy>{p.emptyDraft}</Copy><Button label={p.firstTask} disabled={disabled} onPress={() => onAdd('task')} /><Button label={p.startArea} disabled={disabled} variant="secondary" onPress={() => onAdd('area')} /></Card>
        : <Field label={`${p.search} · ${p.draft}`} value={query} onChangeText={text => {setQuery(text); setVisible(12);}} />}
      {!!query && <Button label={p.clearSearch} variant="secondary" onPress={() => {setQuery(''); setVisible(12);}} />}
      {!!query && matching.length === 0 && <Notice>{p.noMatches}</Notice>}
      {sections.map(section => <View key={section.kind} style={s.stack}><View style={s.between}><Heading>{section.label}</Heading><Badge>{model.items.filter(item => item.kind === section.kind).length}</Badge></View>
        {matching.filter(item => item.kind === section.kind).slice(0, visible).map(item => <Card key={item.key}><View style={s.between}><Heading>{item.title}</Heading><Badge>{item.locked ? p.locked : item.ai ? p.ai : p.human}</Badge></View>
          <Copy>{item.detail}</Copy><Copy small>{`${p.source} · ${item.sourceLabel}`}</Copy><Button label={p.viewSource} variant="secondary" onPress={() => onSource(`item:${item.key}`)} /><Button label={`${p.edit} · ${item.title}`} variant="secondary" disabled={disabled} onPress={() => onEdit(item.key)} /></Card>)}
        {matching.filter(item => item.kind === section.kind).length > visible && <Button label={p.showMore} variant="secondary" onPress={() => setVisible(count => count + 12)} />}
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
  const [confirmationRevision, setConfirmationRevision] = useState<string>();
  const [visible, setVisible] = useState(12);
  const hasTasks = model.items.some(item => item.kind === 'task');
  const published = model.published || action.acknowledged;
  const disabled = offline || action.pending || action.stale || model.composing || !model.canEdit || !model.finalized || published || !hasTasks;
  if (!model.canEdit) return <><PageTitle title={p.review} /><Notice>{p.permissions}</Notice></>;
  return <><PageTitle eyebrow={p.review} title={p.reviewTitle} subtitle={p.reviewCopy} />
    {offline && <Notice>{p.offlineReview}</Notice>}{!hasTasks && <Notice>{p.noTasksReview}</Notice>}
    <View style={s.metrics}>{([{kind: 'task', label: p.tasks}, {kind: 'resource', label: p.resources}, {kind: 'area', label: p.areas}] as const).map(metric =>
      <View key={metric.kind} style={s.metric}><Text style={s.title}>{model.items.filter(item => item.kind === metric.kind).length}</Text><Copy small>{metric.label}</Copy></View>)}</View>
    <Card><Heading>{p.timeline}</Heading><Copy small>{model.timeContext}</Copy>{model.timeline.slice(0, visible).map(item => <View key={item.key} style={s.stack}><View style={s.row}><Badge>{item.time}</Badge><Heading>{item.title}</Heading></View><Copy small>{item.area}</Copy><Button label={p.viewSource} variant="secondary" onPress={() => onSource(`item:${item.key}`)} /></View>)}
      {model.timeline.length > visible && <Button label={p.showMore} variant="secondary" onPress={() => setVisible(count => count + 12)} />}</Card>
    <Card><View style={s.between}><Heading>{p.gaps}</Heading><Badge tone={model.gaps.length ? 'warning' : 'neutral'}>{model.gaps.length}</Badge></View>
      {model.gaps.length ? model.gaps.map((gap, i) => <View key={i} style={s.stack}><Notice>{gap}</Notice><Button label={p.viewSource} variant="secondary" onPress={() => onSource(`gap:${i}`)} /></View>) : <Copy>{p.noGaps}</Copy>}</Card>
    <Card><Badge>{p.ai}</Badge><Heading>{p.assumptions}</Heading>{model.assumptions.length ? <>{model.assumptions.map((item, i) => <Copy key={i}>{item}</Copy>)}<Button label={p.viewSource} variant="secondary" onPress={() => onSource('assumptions')} /></> : <Copy>{p.noAssumptions}</Copy>}</Card>
    {!model.finalized && !model.published && <Notice>{p.reviewRequired}</Notice>}{action.error && <Notice danger>{action.error}</Notice>}{action.stale && <Notice danger>{p.stale}</Notice>}
    {published ? <><Notice>{demo ? p.publishedDemo : p.published}</Notice><Button label={p.openResources} onPress={onResources} /></> : <>
      <Button label={p.backEditing} variant="secondary" disabled={action.pending} onPress={onBack} />
      {confirmationRevision === model.revision ? <Card><Heading>{p.publishConfirm}</Heading><Copy>{p.publishCopy}</Copy><Button label={p.confirmPublish} disabled={disabled} pending={action.pending} onPress={() => void action.run(onPublish)} />
        <Button label={p.cancel} variant="secondary" disabled={action.pending} onPress={() => setConfirmationRevision(undefined)} /></Card>
        : <Button label={p.publish} variant="accent" disabled={disabled} onPress={() => setConfirmationRevision(model.revision)} />}
    </>}
  </>;
}
