import { useRef, useState } from 'react';
import { Share, Text, View, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Badge, Button, Card, Copy, Heading, Notice, PageTitle } from '@/components/ui';
import { onboardingEn as t , deviceEn } from '@/strings/en';

import { colors, space, styles as s } from '@/theme';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import { Confirm, Feedback, type Action } from './shared';
import { invitationUri, parseInvitationCode } from './invitation-code';

export type PersonView = { key: string; nickname: string; roleLabels: string[]; presenceLabel: string; areaLabel: string; taskCount: number; removable: boolean };
export type PeopleView = { revision: string; closed: boolean; requests: { key: string; nickname: string; roleLabels: string[]; availabilityLabel: string }[];
  members: PersonView[]; invite?: { code: string; expiresLabel: string } };
type Confirmation = { title: string; detail: string; send: Action };
export function People({ model, offline, demo, onApprove, onReject, onRemove, onRegenerate, onDisableInvite }: {
  model: PeopleView; offline?: boolean; demo?: boolean;
  onApprove?: (key: string) => Promise<void>; onReject?: (key: string) => Promise<void>; onRemove?: (key: string) => Promise<void>;
  onRegenerate?: Action; onDisableInvite?: Action;
}) {
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(false);
  const shareBusy = useRef(false);
  const action = useAcknowledgedAction(model.revision);
  const disabled = offline || model.closed || action.pending;
  async function shareInvite() {
    if (!model.invite || shareBusy.current || !parseInvitationCode(model.invite.code)) return;
    shareBusy.current = true; setSharing(true); setShareError(false);
    try {
      const message = deviceEn.shareMessage(model.invite.code, invitationUri(model.invite.code));
      // The OS result is not a server acknowledgement. Android does not reliably report dismissal.
      await Share.share({ title: deviceEn.shareTitle, message: demo ? `${deviceEn.demoShare}\n\n${message}` : message });
    } catch { setShareError(true); }
    finally { shareBusy.current = false; setSharing(false); }
  }
  const confirm = (title: string, detail: string, send: Action) => { action.reset(); setConfirmation({ title, detail, send }); };
  return <><PageTitle title={t.peopleTitle} subtitle={t.peopleCopy} />{model.closed ? <Notice>{t.closedCopy}</Notice> : null}
    <Card hero><Text style={[s.heading, s.heroTitle]}>{t.inviteTitle}</Text><Text style={[s.body, s.onHero]}>{t.inviteCopy}</Text>
      {model.invite ? <><Text selectable style={[s.display, s.accentText]}>{model.invite.code}</Text><Text style={[s.small, s.onHero]}>{`${t.inviteExpires} · ${model.invite.expiresLabel}`}</Text>
        <InvitationQr key={model.invite.code} code={model.invite.code} />
        <Button label={t.share} variant="accent" disabled={disabled || sharing || !parseInvitationCode(model.invite.code)} onPress={() => void shareInvite()} />
        {shareError ? <Notice danger>{deviceEn.shareFailed}</Notice> : null}</> : <Text style={[s.body, s.onHero]}>{t.noInvite}</Text>}
    </Card><View style={s.stack}><Button label={t.regenerate} variant="secondary" disabled={disabled || !onRegenerate} onPress={() => {
      if (onRegenerate) confirm(t.regenerate, t.regenerateCopy, onRegenerate);
    }} />{model.invite ? <Button label={t.disableInvite} variant="secondary" disabled={disabled || !onDisableInvite} onPress={() => {
      if (onDisableInvite) confirm(t.disableInvite, t.disableCopy, onDisableInvite);
    }} /> : null}</View>
    <Feedback action={action} demo={demo} />{confirmation ? <Confirm title={confirmation.title} detail={confirmation.detail} pending={action.pending} disabled={disabled}
      onCancel={() => setConfirmation(undefined)} onConfirm={() => void action.run(async () => { await confirmation.send(); setConfirmation(undefined); })} /> : null}
    <Heading>{t.requests}</Heading>{model.requests.length === 0 ? <Card><Heading>{t.noRequests}</Heading><Copy>{t.noRequestsCopy}</Copy></Card> : model.requests.map(person =>
      <Card key={person.key}><Heading>{person.nickname}</Heading><Copy>{person.roleLabels.join(' · ')}</Copy><Copy small>{person.availabilityLabel}</Copy>
        <Button label={t.approve} disabled={disabled || !onApprove} onPress={() => { if (onApprove) void action.run(() => onApprove(person.key)); }} />
        <Button label={t.reject} variant="secondary" disabled={disabled || !onReject} onPress={() => { if (onReject) confirm(t.reject, t.rejectCopy, () => onReject(person.key)); }} /></Card>)}
    <Heading>{t.members}</Heading>{model.members.length === 0 ? <Card><Copy>{t.noMembers}</Copy></Card> : model.members.map(person =>
      <Card key={person.key}><View style={s.between}><Heading>{person.nickname}</Heading><Badge>{person.presenceLabel}</Badge></View><Copy>{person.roleLabels.join(' · ')}</Copy>
        <Copy small>{person.areaLabel}</Copy><Copy small>{t.tasks(person.taskCount)}</Copy>{person.removable ? <Button label={t.remove} variant="secondary" disabled={disabled || !onRemove}
          onPress={() => { if (onRemove) confirm(t.remove, `${person.nickname}: ${t.removeCopy}`, () => onRemove(person.key)); }} /> : null}</Card>)}</>;
}

function InvitationQr({ code }: { code: string }) {
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState(false);
  if (failed || !parseInvitationCode(code)) return <Copy>{deviceEn.invalidQr}</Copy>;
  return <View accessible accessibilityRole="image" accessibilityLabel={deviceEn.qrLabel(code)} style={s.row}>
    <QRCode value={invitationUri(code)} size={Math.max(96, Math.min(224, width - space.xl * 6))} color={colors.ink} backgroundColor={colors.card}
      quietZone={space.md} onError={() => setFailed(true)} />
  </View>;
}
