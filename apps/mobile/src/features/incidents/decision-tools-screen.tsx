import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { en , decisionEn as copy } from '@/strings/en';

import { styles as s } from '@/theme';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import type { SelectionItem } from '../evidence/composer-screen';

export type NewIncidentDraft = {title: string; description: string; typeKey?: string; subjectKey?: string; affectedKeys: string[]; blocking: boolean};
export function NewIncident({ types, subjects, tasks, offline, onCreate, demo }: {
  types: SelectionItem[]; subjects: SelectionItem[]; tasks: SelectionItem[]; offline?: boolean; demo?: boolean;
  onCreate?: (draft: NewIncidentDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<NewIncidentDraft>({title: '', description: '', affectedKeys: [], blocking: false});
  const action = useAcknowledgedAction();
  const update = (next: Partial<NewIncidentDraft>) => {action.reset(); setDraft(current => ({...current, ...next}));};
  return <><PageTitle eyebrow={en.newIncident} title={copy.newTitle} subtitle={copy.newSubtitle} />
    <Field label={copy.title} value={draft.title} onChangeText={title => update({title})} disabled={action.pending} maxLength={200} />
    <Field label={copy.description} value={draft.description} onChangeText={description => update({description})} disabled={action.pending} multiline />
    <Heading>{copy.type}</Heading>{types.map(item => <Choice key={item.key} label={item.label} selected={draft.typeKey === item.key} disabled={action.pending} onPress={() => update({typeKey: item.key})} />)}
    <Heading>{copy.subject}</Heading>{subjects.map(item => <Choice key={item.key} label={item.label} selected={draft.subjectKey === item.key} disabled={action.pending} onPress={() => update({subjectKey: item.key})} />)}
    <Heading>{copy.affected}</Heading>{tasks.map(item => <Choice key={item.key} label={item.label} selected={draft.affectedKeys.includes(item.key)} disabled={action.pending}
      onPress={() => update({affectedKeys: draft.affectedKeys.includes(item.key) ? draft.affectedKeys.filter(key => key !== item.key) : [...draft.affectedKeys, item.key]})} />)}
    <Choice label={copy.blocking} selected={draft.blocking} disabled={action.pending} onPress={() => update({blocking: !draft.blocking})} />
    {!onCreate && <Notice>{en.unavailableAction}</Notice>}{action.error && <Notice danger>{action.error}</Notice>}{action.acknowledged && <Notice>{demo ? en.demoAck : en.sent}</Notice>}
    <Button label={copy.create} pending={action.pending} disabled={offline || !onCreate || !draft.title.trim() || !draft.typeKey || action.acknowledged} onPress={() => onCreate && void action.run(() => onCreate(draft))} />
  </>;
}

export type ManualActionField = {key: string; label: string; choices?: SelectionItem[]; required?: boolean};
export type ManualActionKind = {key: string; label: string; fields: ManualActionField[]};
export type ManualActionDraft = {localKey: string; kindKey: string; values: Record<string, string>};
export type ManualCheckView = {checks: {key: string; message: string; failed: boolean; uncertain: boolean}[]; canApply: boolean};
export function ManualDecision({ kinds, maxActions, versionKey, offline, demo, onCheck, onApply }: {
  kinds: ManualActionKind[]; maxActions: number; versionKey: string; offline?: boolean; demo?: boolean;
  onCheck?: (actions: ManualActionDraft[]) => Promise<ManualCheckView>;
  onApply?: (actions: ManualActionDraft[], note: string) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<ManualActionDraft[]>([]);
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState<{versionKey: string; fingerprint: string; result: ManualCheckView}>();
  const [confirming, setConfirming] = useState(false);
  const sequence = useRef(0);
  const operating = useRef(false);
  const exclusively = async (operation: () => Promise<void>) => {
    if (operating.current) return;
    operating.current = true;
    try {await operation();} finally {operating.current = false;}
  };
  const action = useAcknowledgedAction(versionKey);
  const checkAction = useAcknowledgedAction(versionKey);
  const busy = action.pending || checkAction.pending;
  const fingerprint = JSON.stringify(drafts);
  const result = !checkAction.stale && !action.stale && checked?.versionKey === versionKey && checked.fingerprint === fingerprint ? checked.result : undefined;
  const uncertain = result?.checks.some(check => check.uncertain);
  const complete = drafts.length > 0 && drafts.every(draft => {
    const kind = kinds.find(item => item.key === draft.kindKey);
    return !!kind && kind.fields.every(field => !field.required || !!draft.values[field.key]?.trim());
  });
  const change = (next: ManualActionDraft[]) => {setDrafts(next); setConfirming(false); action.reset();};
  return <><PageTitle eyebrow={en.manual} title={copy.manual} subtitle={copy.manualCopy} /><Copy small>{copy.actionCount(drafts.length, maxActions)}</Copy>
    {drafts.map((draft, index) => <Card key={draft.localKey}><Heading>{`${copy.action} ${index + 1}`}</Heading>
      {kinds.map(kind => <Choice key={kind.key} label={kind.label} selected={draft.kindKey === kind.key} disabled={busy}
        onPress={() => change(drafts.map(item => item.localKey === draft.localKey ? {...item, kindKey: kind.key, values: {}} : item))} />)}
      {kinds.find(item => item.key === draft.kindKey)?.fields.map(field => <View key={field.key} style={s.stack}>
        {field.choices ? <><Copy>{field.label}</Copy>{field.choices.map(choice => <Choice key={choice.key} label={choice.label} selected={draft.values[field.key] === choice.key} disabled={busy}
          onPress={() => change(drafts.map(item => item.localKey === draft.localKey ? {...item, values: {...item.values, [field.key]: choice.key}} : item))} />)}</>
          : <Field label={field.label} value={draft.values[field.key] ?? ''} disabled={busy} onChangeText={value => change(drafts.map(item => item.localKey === draft.localKey ? {...item, values: {...item.values, [field.key]: value}} : item))} />}
      </View>)}
      <Button label={copy.removeAction} disabled={busy} variant="secondary" onPress={() => change(drafts.filter(item => item.localKey !== draft.localKey))} />
    </Card>)}
    <Button label={copy.addAction} disabled={busy || drafts.length >= maxActions} variant="secondary" onPress={() => change([...drafts, {localKey: String(++sequence.current), kindKey: kinds[0]?.key ?? '', values: {}}])} />
    {!drafts.length && <Copy>{copy.noActions}</Copy>}
    <Button label={copy.check} pending={checkAction.pending} disabled={offline || busy || !complete || !onCheck} onPress={() => onCheck && void exclusively(() => checkAction.run(async () => {
      setChecked(undefined); setConfirming(false);
      const result = await onCheck(drafts); setChecked({versionKey, fingerprint, result});
    }))} />
    {result ? <Card><Heading>{copy.checked}</Heading>{result.checks.map(check => <Notice key={check.key} danger={check.failed}>{`${check.failed ? '×' : check.uncertain ? '?' : '✓'} ${check.message}`}</Notice>)}
      {!result.canApply && <Notice danger>{copy.failed}</Notice>}{uncertain && <Notice>{copy.unknown}</Notice>}</Card> : <Copy small>{copy.needsCheck}</Copy>}
    <Field label={copy.reason} value={note} onChangeText={setNote} disabled={busy} multiline />
    {(action.error || checkAction.error) && <Notice danger>{action.error ?? checkAction.error}</Notice>}{action.acknowledged && <Notice>{demo ? en.demoAck : en.sent}</Notice>}
    {!onCheck || !onApply ? <Notice>{en.unavailableAction}</Notice> : null}
    {confirming ? <Card><Heading>{copy.confirmation}</Heading><Copy>{copy.confirmationCopy}</Copy>
      <Button label={copy.apply} pending={action.pending} disabled={offline || busy || !result?.canApply || action.acknowledged || (uncertain && !note.trim()) || !onApply}
        onPress={() => onApply && void exclusively(() => action.run(() => onApply(drafts, note)))} /><Button label={copy.cancel} disabled={busy} variant="secondary" onPress={() => setConfirming(false)} /></Card>
      : <Button label={copy.apply} disabled={offline || busy || !result?.canApply || action.acknowledged || (uncertain && !note.trim()) || !onApply} onPress={() => setConfirming(true)} />}
  </>;
}

export function AskProbe({ recipients, questionContext, offline, demo, onSend }: {recipients: SelectionItem[]; questionContext: string; offline?: boolean; demo?: boolean;
  onSend?: (input: {recipientKey: string; question: string; allowPhoto: boolean}) => Promise<void>;
}) {
  const [recipientKey, setRecipientKey] = useState('');
  const [question, setQuestion] = useState('');
  const [allowPhoto, setAllowPhoto] = useState(false);
  const action = useAcknowledgedAction();
  return <><PageTitle eyebrow={en.ask} title={copy.waiting} subtitle={copy.waitingCopy} /><Notice>{questionContext}</Notice><Heading>{copy.recipient}</Heading>
    {recipients.map(item => <Choice key={item.key} label={item.label} selected={recipientKey === item.key} disabled={action.pending} onPress={() => {action.reset(); setRecipientKey(item.key);}} />)}
    <Field label={copy.question} value={question} maxLength={200} multiline disabled={action.pending} onChangeText={text => {action.reset(); setQuestion(text);}} />
    <Choice label={copy.allowPhoto} selected={allowPhoto} disabled={action.pending} onPress={() => {action.reset(); setAllowPhoto(!allowPhoto);}} />
    {action.error && <Notice danger>{action.error}</Notice>}{action.acknowledged && <Notice>{demo ? en.demoAck : en.sent}</Notice>}{!onSend && <Notice>{en.unavailableAction}</Notice>}
    <Button label={copy.send} pending={action.pending} disabled={offline || !onSend || !recipientKey || !question.trim() || action.acknowledged}
      onPress={() => onSend && void action.run(() => onSend({recipientKey, question, allowPhoto}))} />
  </>;
}
