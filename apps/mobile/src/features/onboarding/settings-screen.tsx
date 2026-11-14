import { useState } from 'react';
import { Badge, Button, Card, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { onboardingEn as t } from '@/strings/en';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import { EventFields, validEvent, type EventForm } from './event-form';
import { Confirm, Feedback, Toggle, type Action } from './shared';

// Form preferences; the integration layer maps these labels to canonical project settings.
export type SettingsForm = { event: EventForm; roles: string; ai: boolean; questions: boolean; recovery: boolean; photos: boolean; autoApprove: boolean };
export type SettingsView = { revision: string; form: SettingsForm; closed: boolean; timesEditable: boolean; maxMembers: number; unresolvedItems: string[] };
export function EventSettings({ model, offline, demo, onSave, onClose, onDelete }: {
  model: SettingsView; offline?: boolean; demo?: boolean; onSave?: (value: SettingsForm) => Promise<void>; onClose?: Action; onDelete?: Action;
}) {
  const [value, setValue] = useState(model.form);
  const [attempted, setAttempted] = useState(false);
  const [confirmation, setConfirmation] = useState<'close' | 'delete'>();
  const [deleteName, setDeleteName] = useState('');
  const action = useAcknowledgedAction(model.revision);
  const disabled = offline || model.closed || action.pending;
  const patch = (changes: Partial<SettingsForm>) => { action.reset(); setValue({ ...value, ...changes }); };
  return <><PageTitle title={t.settingsTitle} subtitle={t.settingsCopy} />{model.closed ? <><Badge>{t.closed}</Badge><Notice>{t.closedCopy}</Notice></> : null}
    <EventFields value={value.event} onChange={event => patch({ event })} disabled={disabled} timesEditable={model.timesEditable} planningFields={false} />
    <Card><Field label={t.roleTags} value={value.roles} disabled={disabled} onChangeText={roles => patch({ roles })} /><Copy small>{t.roleTagsHint}</Copy></Card>
    <Card><Heading>{t.assistance}</Heading><Toggle label={t.ai} detail={t.aiCopy} value={value.ai} disabled={disabled} onChange={ai => patch({ ai })} />
      <Toggle label={t.aiProbe} detail={t.aiProbeCopy} value={value.questions} disabled={disabled || !value.ai} onChange={questions => patch({ questions })} />
      <Toggle label={t.aiRecovery} detail={t.aiRecoveryCopy} value={value.recovery} disabled={disabled || !value.ai} onChange={recovery => patch({ recovery })} />
      <Toggle label={t.aiVision} detail={t.aiVisionCopy} value={value.photos} disabled={disabled || !value.ai} onChange={photos => patch({ photos })} /></Card>
    <Card><Toggle label={t.autoApprove} detail={t.autoApproveCopy} value={value.autoApprove} disabled={disabled} onChange={autoApprove => patch({ autoApprove })} /></Card>
    {attempted && !validEvent(value.event, model.maxMembers) ? <Notice danger>{t.eventInvalid(model.maxMembers)}</Notice> : null}<Feedback action={action} demo={demo} />
    <Button label={t.save} pending={action.pending} disabled={disabled || !onSave} onPress={() => {
      setAttempted(true); if (validEvent(value.event, model.maxMembers) && onSave) void action.run(() => onSave(value));
    }} />
    <Card><Heading>{t.lifecycle}</Heading><Button label={t.close} variant="secondary" disabled={disabled || !onClose} onPress={() => { action.reset(); setConfirmation('close'); }} />
      <Button label={t.delete} variant="danger" disabled={disabled || !onDelete} onPress={() => { action.reset(); setDeleteName(''); setConfirmation('delete'); }} /></Card>
    {confirmation === 'close' ? <Confirm title={model.unresolvedItems.length ? t.closeAnyway : t.close} detail={t.closeCopy} pending={action.pending} disabled={disabled || !onClose}
      onCancel={() => setConfirmation(undefined)} onConfirm={() => { if (onClose) void action.run(async () => { await onClose(); setConfirmation(undefined); }); }}>
      {model.unresolvedItems.length ? <><Heading>{t.unresolved}</Heading>{model.unresolvedItems.map((item, i) => <Copy key={i}>{item}</Copy>)}</> : null}</Confirm> : null}
    {confirmation === 'delete' ? <Confirm title={t.delete} detail={t.deleteCopy} pending={action.pending} disabled={disabled || deleteName !== model.form.event.title || !onDelete}
      onCancel={() => setConfirmation(undefined)} onConfirm={() => { if (onDelete) void action.run(onDelete); }}>
      <Copy>{model.form.event.title}</Copy><Field label={t.deleteName} value={deleteName} disabled={action.pending} onChangeText={setDeleteName} /></Confirm> : null}</>;
}
