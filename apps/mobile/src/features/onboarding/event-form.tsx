import { useState } from 'react';
import { Button, Card, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { onboardingEn as t } from '@/strings/en';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import { Feedback, validWindow } from './shared';

// Form text only. The data adapter converts local times using timeZone and validates API input.
export type EventForm = { title: string; brief: string; venue: string; start: string; end: string; timeZone: string; teamSize: string; attendees: string; currency: string };
export function createEventForm(): EventForm {
  let timeZone = '';
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''; } catch { /* Leave editable when the device cannot report its zone. */ }
  return { title: '', brief: '', venue: '', start: '', end: '', timeZone, teamSize: '', attendees: '', currency: 'VND' };
}
export function validEvent(value: EventForm, maxMembers: number) {
  let validZone = true;
  try { new Intl.DateTimeFormat('en', { timeZone: value.timeZone }).format(); } catch { validZone = false; }
  return value.title.trim().length >= 3 && value.title.trim().length <= 80 && value.brief.trim().length >= 40 && value.brief.trim().length <= 4000 &&
    validWindow(value) && Date.parse(`${value.end}:00Z`) - Date.parse(`${value.start}:00Z`) <= 72 * 60 * 60 * 1000 && validZone && !!value.timeZone.trim() &&
    /^\d+$/.test(value.teamSize) && Number(value.teamSize) >= 2 && Number(value.teamSize) <= maxMembers &&
    (!value.attendees || /^\d+$/.test(value.attendees)) && /^[A-Z]{3}$/.test(value.currency);
}
export function EventFields({ value, onChange, disabled, timesEditable = true, planningFields = true }: {
  value: EventForm; onChange: (value: EventForm) => void; disabled?: boolean; timesEditable?: boolean; planningFields?: boolean;
}) {
  const field = (key: keyof EventForm, label: string, maxLength = 1000, multiline = false, locked = false) => <Field label={label} value={value[key]} maxLength={maxLength} multiline={multiline}
    disabled={disabled || locked} onChangeText={text => onChange({ ...value, [key]: text })} />;
  return <><Card><Heading>{t.basics}</Heading>{field('title', t.title, 80)}{field('brief', t.brief, 4000, true)}{field('venue', t.venue, 160)}</Card>
    <Card><Heading>{t.schedule}</Heading><Copy small>{t.timeFormat}</Copy>{field('start', t.start, 16, false, !timesEditable)}{field('end', t.end, 16, false, !timesEditable)}
      {field('timeZone', t.timezone, 80, false, !planningFields)}{!timesEditable ? <Copy small>{t.activeTimes}</Copy> : null}</Card>
    {planningFields ? <Card>{field('teamSize', t.teamSize, 4)}{field('attendees', t.attendees, 8)}{field('currency', t.currency, 3)}</Card> : null}</>;
}
export function CreateEvent({ initialValue, maxMembers, canCreate, onCreate, offline, demo }: {
  initialValue?: EventForm; maxMembers: number; canCreate: boolean; onCreate?: (value: EventForm) => Promise<void>; offline?: boolean; demo?: boolean;
}) {
  const [value, setValue] = useState(() => initialValue ?? createEventForm());
  const [attempted, setAttempted] = useState(false);
  const action = useAcknowledgedAction();
  return <><PageTitle title={t.createTitle} subtitle={t.createCopy} /><EventFields value={value} onChange={setValue} disabled={offline || action.pending || action.acknowledged} />
    {!canCreate ? <Notice>{t.createSignIn}</Notice> : null}{!onCreate ? <Copy small>{t.unavailable}</Copy> : null}
    {attempted && !validEvent(value, maxMembers) ? <Notice danger>{t.eventInvalid(maxMembers)}</Notice> : null}<Feedback action={action} demo={demo} />
    <Button label={t.create} pending={action.pending} disabled={!canCreate || !onCreate || offline || action.acknowledged} onPress={() => {
      setAttempted(true); if (validEvent(value, maxMembers) && onCreate) void action.run(() => onCreate(value));
    }} /></>;
}
