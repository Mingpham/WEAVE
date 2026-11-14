import { useState } from 'react';
import { Button, Card, Copy, Heading, Notice, PageTitle } from '@/components/ui';
import { isValidLocalDateTime, isValidTimeZone, LocalDateTimeField } from '@/components/local-date-time-field';
import { onboardingEn as t, onboardingFormEn as f } from '@/strings/en';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import { Feedback, FormField } from './shared';

// Form text only. The data adapter converts local times using timeZone and validates API input.
export type EventForm = { title: string; brief: string; venue: string; start: string; end: string; timeZone: string; teamSize: string; attendees: string; currency: string };
export function createEventForm(): EventForm {
  let timeZone = '';
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''; } catch { /* Leave editable when the device cannot report its zone. */ }
  return { title: '', brief: '', venue: '', start: '', end: '', timeZone, teamSize: '', attendees: '', currency: 'VND' };
}
function eventErrors(value: EventForm, maxMembers: number): Partial<Record<keyof EventForm, string>> {
  const errors: Partial<Record<keyof EventForm, string>> = {};
  if (value.title.trim().length < 3 || value.title.trim().length > 80) errors.title = f.titleError;
  if (value.brief.trim().length < 40 || value.brief.trim().length > 4000) errors.brief = f.briefError;
  if (value.venue.trim().length > 120) errors.venue = f.venueError;
  if (!isValidLocalDateTime(value.start)) errors.start = f.dateRequired;
  if (!isValidLocalDateTime(value.end)) errors.end = f.dateRequired;
  else if (isValidLocalDateTime(value.start) && value.end <= value.start) errors.end = f.endAfterStart;
  if (!isValidTimeZone(value.timeZone)) errors.timeZone = f.invalidTimezone;
  if (!/^\d+$/.test(value.teamSize) || !Number.isSafeInteger(Number(value.teamSize)) || Number(value.teamSize) < 2 || Number(value.teamSize) > maxMembers) errors.teamSize = f.teamError(maxMembers);
  if (value.attendees && (!/^\d+$/.test(value.attendees) || !Number.isSafeInteger(Number(value.attendees)))) errors.attendees = f.attendeesError;
  if (!/^[A-Z]{3}$/.test(value.currency)) errors.currency = f.currencyError;
  // The canonical adapter checks the 72-hour limit after resolving local values in timeZone.
  return errors;
}
export function validEvent(value: EventForm, maxMembers: number) { return Object.keys(eventErrors(value, maxMembers)).length === 0; }
export function EventFields({ value, onChange, disabled, timesEditable = true, planningFields = true, showErrors = false, maxMembers = Number.MAX_SAFE_INTEGER }: {
  value: EventForm; onChange: (value: EventForm) => void; disabled?: boolean; timesEditable?: boolean; planningFields?: boolean; showErrors?: boolean; maxMembers?: number;
}) {
  const errors = eventErrors(value, maxMembers);
  const change = (key: keyof EventForm, text: string) => onChange({ ...value, [key]: text });
  const common = { disabled, showError: showErrors };
  return <><Card><Heading>{t.basics}</Heading>
    <FormField {...common} label={t.title} value={value.title} maxLength={80} hint={f.titleHint} error={errors.title} onChangeText={text => change('title', text)} />
    <FormField {...common} label={t.brief} value={value.brief} maxLength={4000} multiline hint={f.briefHint} error={errors.brief} onChangeText={text => change('brief', text)} />
    <FormField {...common} label={t.venue} value={value.venue} maxLength={120} error={errors.venue} onChangeText={text => change('venue', text)} /></Card>
    <Card><Heading>{t.schedule}</Heading><FormField {...common} label={t.timezone} value={value.timeZone} maxLength={64} autoCapitalize="none"
      disabled={disabled || !planningFields} error={errors.timeZone} showError={showErrors || (!!value.timeZone && !!errors.timeZone)} onChangeText={text => change('timeZone', text)} />
      <LocalDateTimeField label={t.start} value={value.start} timezone={value.timeZone} disabled={disabled || !timesEditable} error={showErrors || !!value.start ? errors.start : undefined} onChange={text => change('start', text)} />
      <LocalDateTimeField label={t.end} value={value.end} timezone={value.timeZone} disabled={disabled || !timesEditable} error={showErrors || !!value.end ? errors.end : undefined} onChange={text => change('end', text)} />
      <Copy small>{f.duration}</Copy>{!timesEditable ? <Copy small>{t.activeTimes}</Copy> : null}</Card>
    {planningFields ? <Card><FormField {...common} label={t.teamSize} value={value.teamSize} maxLength={8} keyboardType="number-pad" hint={maxMembers !== Number.MAX_SAFE_INTEGER ? f.teamHint(maxMembers) : undefined}
      error={errors.teamSize} onChangeText={text => change('teamSize', text)} />
      <FormField {...common} label={t.attendees} value={value.attendees} maxLength={10} keyboardType="number-pad" error={errors.attendees} onChangeText={text => change('attendees', text)} />
      <FormField {...common} label={t.currency} value={value.currency} maxLength={3} autoCapitalize="characters" hint={f.currencyHint} error={errors.currency} onChangeText={text => change('currency', text.toUpperCase())} /></Card> : null}</>;
}
export function CreateEvent({ initialValue, maxMembers, canCreate, onCreate, onSignIn, offline, demo }: {
  initialValue?: EventForm; maxMembers: number; canCreate: boolean; onCreate?: (value: EventForm) => Promise<void>; onSignIn?: () => void; offline?: boolean; demo?: boolean;
}) {
  const [value, setValue] = useState(() => initialValue ?? createEventForm());
  const [attempted, setAttempted] = useState(false);
  const action = useAcknowledgedAction();
  return <><PageTitle title={t.createTitle} subtitle={t.createCopy} /><EventFields value={value} onChange={setValue} disabled={offline || action.pending || action.acknowledged} showErrors={attempted} maxMembers={maxMembers} />
    {!canCreate ? <><Notice>{t.createSignIn}</Notice>{onSignIn && <Button label={t.google} onPress={onSignIn} disabled={offline || action.pending} />}</> : null}{!onCreate ? <Copy small>{t.unavailable}</Copy> : null}
    {attempted && !validEvent(value, maxMembers) ? <Notice danger>{f.fixFields}</Notice> : null}<Feedback action={action} demo={demo} />
    <Button label={t.create} pending={action.pending} disabled={!canCreate || !onCreate || offline || action.acknowledged} onPress={() => {
      setAttempted(true); if (validEvent(value, maxMembers) && onCreate) void action.run(() => onCreate(value));
    }} /></>;
}
