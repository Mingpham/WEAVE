import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { Badge, Brand, Button, Card, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { onboardingEn as t , deviceEn } from '@/strings/en';

import { styles as s } from '@/theme';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import { Check, Confirm, Feedback, ProfileFields, validProfile, type Action, type EditableProfile, type Option } from './shared';
import { parseInvitationCode } from './invitation-code';

export type InviteSummary = { eventName: string; organizerName: string; consentVersion: string; timezone: string };
type Common = { offline?: boolean; demo?: boolean };

export function SignIn({ offline, demo, guestMembershipsNotMoved, sessionMessage, onGoogle, onGuest }: Common & {
  guestMembershipsNotMoved?: boolean; sessionMessage?: string; onGoogle?: Action; onGuest?: Action;
}) {
  const action = useAcknowledgedAction();
  const disabled = offline || action.pending || action.acknowledged;
  return <><Brand /><PageTitle title={t.signInTitle} subtitle={t.signInCopy} />
    <Card hero><Text style={[s.heading, s.heroTitle]}>{t.google}</Text><Text style={[s.body, s.onHero]}>{t.googleLink}</Text></Card>
    {sessionMessage ? <Notice danger>{sessionMessage}</Notice> : null}{guestMembershipsNotMoved ? <Notice>{t.membershipsNotMoved}</Notice> : null}
    <Button label={t.google} disabled={disabled || !onGoogle} pending={action.pending} onPress={() => { if (onGoogle) void action.run(onGoogle); }} />
    {!onGoogle ? <Copy small>{t.unavailable}</Copy> : null}
    <Card><Heading>{t.guest}</Heading><Copy>{t.guestCopy}</Copy><Button label={t.guest} variant="secondary" disabled={disabled || !onGuest}
      onPress={() => { if (onGuest) void action.run(onGuest); }} /></Card><Feedback action={action} demo={demo} /></>;
}

export function JoinCode({ initialCode = '', invite, offline, demo, onResolve, onScan, onContinue }: Common & {
  initialCode?: string; invite?: InviteSummary; onResolve?: (code: string) => Promise<void>; onScan?: () => Promise<string | null>; onContinue: () => void;
}) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [inputRevision, setInputRevision] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string>();
  const [scannedCode, setScannedCode] = useState(false);
  const busy = useRef(false);
  const action = useAcknowledgedAction(`${inputRevision}:${code}`);
  const valid = /^[A-HJ-KM-NP-Z2-9]{6}$/.test(code);
  function editCode(value: string) {
    setCode(value); setInputRevision(revision => revision + 1); setScannedCode(false); setScanError(undefined);
  }
  async function scan() {
    if (!onScan || busy.current) return;
    busy.current = true; setScanning(true); action.reset(); setScanError(undefined); setScannedCode(false);
    try {
      const result = await onScan();
      if (result !== null) {
        const parsed = parseInvitationCode(result);
        if (parsed) { editCode(parsed); setScannedCode(true); } else setScanError(deviceEn.invalidQr);
      }
    } catch { setScanError(deviceEn.scanFailed); }
    finally { busy.current = false; setScanning(false); }
  }
  async function resolve() {
    if (!onResolve || busy.current || !valid || offline) return;
    busy.current = true;
    try { await action.run(() => onResolve(code)); } finally { busy.current = false; }
  }
  return <><PageTitle eyebrow={t.step(1)} title={t.joinTitle} subtitle={t.joinCopy} /><Card>
    <Field label={t.code} value={code} maxLength={6} placeholder={t.codePlaceholder} disabled={action.pending || scanning} onChangeText={value => editCode(value.toUpperCase().replace(/\s/g, ''))} />
    <Copy small>{t.codeHint}</Copy><Button label={t.find} disabled={!valid || offline || !onResolve || scanning} pending={action.pending} onPress={() => void resolve()} />
    <Button label={t.scan} variant="secondary" disabled={action.pending || scanning || !onScan} onPress={() => void scan()} />
    {!onScan ? <Copy small>{t.qrUnavailable}</Copy> : null}{!onResolve ? <Copy small>{t.unavailable}</Copy> : null}</Card>
    {scanError ? <Notice danger>{scanError}</Notice> : null}{scannedCode && !action.acknowledged ? <Notice>{deviceEn.codeReady}</Notice> : null}
    <Feedback action={action} demo={demo} />{invite && action.acknowledged ? <Card hero><Text style={[s.heading, s.heroTitle]}>{invite.eventName}</Text>
      <Text style={[s.body, s.onHero]}>{`${t.organizer} · ${invite.organizerName}`}</Text><Button label={t.continue} variant="accent" disabled={offline} onPress={onContinue} /></Card> : null}</>;
}

export function JoinConsent({ invite, onContinue }: { invite: InviteSummary; onContinue: () => void }) {
  const [agreed, setAgreed] = useState(false);
  return <><PageTitle eyebrow={t.step(2)} title={t.consentTitle} subtitle={t.consentCopy} /><Badge>{invite.eventName}</Badge>
    <Card><Copy>{t.consentData}</Copy><Copy>{t.consentAudience}</Copy><Copy>{t.consentAi}</Copy><Copy>{t.consentLocation}</Copy><Copy>{t.consentChoice}</Copy>
      <Copy small>{`${t.consentVersion} · ${invite.consentVersion}`}</Copy></Card>
    <Check label={t.agree} checked={agreed} onPress={() => setAgreed(!agreed)} />
    <Button label={t.continue} disabled={!agreed} onPress={onContinue} /></>;
}

export function JoinProfile({ invite, roles, initialProfile, consentAccepted, offline, demo, onJoin }: Common & {
  invite: InviteSummary; roles: Option[]; initialProfile: EditableProfile; consentAccepted: boolean;
  onJoin?: (profile: EditableProfile, consentVersion: string) => Promise<void>;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [attempted, setAttempted] = useState(false);
  const action = useAcknowledgedAction();
  const disabled = offline || action.pending || action.acknowledged;
  return <><PageTitle eyebrow={t.step(3)} title={t.profileTitle} subtitle={t.profileCopy} /><Badge>{invite.eventName}</Badge>
    <ProfileFields value={profile} onChange={setProfile} roles={roles} timezone={invite.timezone} disabled={disabled} />
    {!consentAccepted ? <Notice>{t.consentRequired}</Notice> : null}{attempted && !validProfile(profile) ? <Notice danger>{t.profileInvalid}</Notice> : null}
    <Feedback action={action} demo={demo} />{!onJoin ? <Copy small>{t.unavailable}</Copy> : null}
    <Button label={t.requestJoin} disabled={disabled || !onJoin || !consentAccepted} pending={action.pending} onPress={() => {
      setAttempted(true); if (validProfile(profile) && consentAccepted && onJoin) void action.run(() => onJoin({ ...profile, nickname: profile.nickname.trim() }, invite.consentVersion));
    }} /></>;
}

export function Waiting({ eventName, offline, demo, onCancel }: Common & { eventName: string; onCancel?: Action }) {
  const [confirming, setConfirming] = useState(false);
  const action = useAcknowledgedAction();
  return <><PageTitle title={t.waitingTitle} subtitle={eventName} /><Card hero><Text style={[s.heading, s.heroTitle]}>{t.waiting}</Text>
    <Text style={[s.body, s.onHero]}>{t.waitingCopy}</Text></Card><Notice>{t.waitingPrivacy}</Notice><Feedback action={action} demo={demo} />
    {confirming ? <Confirm title={t.cancelRequest} detail={t.cancelRequestCopy} pending={action.pending} disabled={offline || action.acknowledged || !onCancel}
      onCancel={() => setConfirming(false)} onConfirm={() => { if (onCancel) void action.run(onCancel); }} /> :
      <Button label={t.cancelRequest} variant="secondary" disabled={offline || !onCancel || action.acknowledged} onPress={() => setConfirming(true)} />}</>;
}
