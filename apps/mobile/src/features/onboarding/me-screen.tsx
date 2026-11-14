import { useState, type ReactNode } from 'react';
import { Badge, Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { onboardingEn as t } from '@/strings/en';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import { Confirm, Feedback, ProfileFields, validProfile, type Action, type EditableProfile, type Option } from './shared';

export type MeView = { revision: string; profile: EditableProfile; roles: Option[]; timezone: string; presenceLabel: string;
  areas: Option[]; currentAreaKey?: string; closed: boolean; guest: boolean; canMarkHere: boolean; canMarkUnavailable: boolean; canLeave: boolean };
export function Me({ model, offline, demo, onSave, onHere, onUnavailable, onLeave, onSignOut, notifications }: {
  model: MeView; offline?: boolean; demo?: boolean; onSave?: (profile: EditableProfile, areaKey?: string) => Promise<void>;
  onHere?: Action; onUnavailable?: (reason: string) => Promise<void>; onLeave?: Action; onSignOut?: Action;
  notifications?: ReactNode;
}) {
  const [profile, setProfile] = useState(model.profile);
  const [area, setArea] = useState(model.currentAreaKey);
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [confirmation, setConfirmation] = useState<'leave' | 'signout' | 'unavailable'>();
  const action = useAcknowledgedAction(model.revision);
  const disabled = offline || model.closed || action.pending;
  return <><PageTitle title={t.meTitle} subtitle={t.meCopy} />{model.closed ? <Notice>{t.closedCopy}</Notice> : null}
    <Card><Heading>{t.presence}</Heading><Badge>{model.presenceLabel}</Badge><Copy small>{t.selfReported}</Copy>
      <Button label={t.here} disabled={disabled || !model.canMarkHere || !onHere} pending={action.pending} onPress={() => { if (onHere) void action.run(onHere); }} />
      <Button label={t.unavailableNow} variant="secondary" disabled={disabled || !model.canMarkUnavailable || !onUnavailable} onPress={() => { action.reset(); setConfirmation('unavailable'); }} /></Card>
    <Feedback action={action} demo={demo} />
    {confirmation ? <Confirm title={confirmation === 'leave' ? t.leave : confirmation === 'signout' ? t.signOut : t.unavailableNow}
      detail={confirmation === 'leave' ? t.leaveCopy : confirmation === 'signout' ? (model.guest ? t.guestSignOut : t.accountSignOut) : t.selfReported}
      pending={action.pending} disabled={offline || action.pending || (confirmation !== 'signout' && model.closed)} onCancel={() => setConfirmation(undefined)} onConfirm={() => {
        const send = confirmation === 'leave' ? onLeave : confirmation === 'signout' ? onSignOut : onUnavailable ? () => onUnavailable(reason) : undefined;
        if (send) void action.run(async () => { await send(); setConfirmation(undefined); });
      }}>{confirmation === 'unavailable' ? <Field label={t.unavailableReason} value={reason} onChangeText={setReason} disabled={action.pending} multiline /> : null}</Confirm> : null}
    <ProfileFields value={profile} onChange={value => { action.reset(); setProfile(value); }} roles={model.roles} timezone={model.timezone} disabled={disabled} />
    <Card><Heading>{t.area}</Heading><Choice label={t.noArea} selected={!area} disabled={disabled} onPress={() => setArea(undefined)} />
      {model.areas.map(option => <Choice key={option.key} label={option.label} selected={area === option.key} disabled={disabled} onPress={() => setArea(option.key)} />)}</Card>
    {attempted && !validProfile(profile) ? <Notice danger>{t.profileInvalid}</Notice> : null}
    <Button label={t.save} pending={action.pending} disabled={disabled || !onSave} onPress={() => { setAttempted(true); if (validProfile(profile) && onSave) void action.run(() => onSave(profile, area)); }} />
    {model.canLeave ? <Button label={t.leave} variant="danger" disabled={disabled || !onLeave} onPress={() => { action.reset(); setConfirmation('leave'); }} /> : null}
    {notifications}<Card><Heading>{t.account}</Heading>{model.guest ? <Copy small>{t.guestCopy}</Copy> : null}<Button label={t.signOut} variant="secondary" disabled={offline || action.pending || !onSignOut}
      onPress={() => { action.reset(); setConfirmation('signout'); }} /></Card></>;
}
