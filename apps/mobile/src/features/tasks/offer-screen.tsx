import { Text } from 'react-native';
import { Badge, Button, Card, Copy, Heading, Notice, PageTitle } from '@/components/ui';
import { en } from '@/strings/en';
import { styles as s } from '@/theme';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import { useExpired } from '../shared/use-expired';

export type OfferView = { title: string; detail: string; incidentContext?: string; criteria: string[]; dueLabel: string; respondByLabel: string; allowanceLabel?: string; open: boolean; expiresAt?: string; versionKey?: string; closedReason?: string };
export function Offer({ model, offline, demo, onAccept, onDecline }: {model: OfferView; offline?: boolean; demo?: boolean; onAccept: () => Promise<void>; onDecline: () => Promise<void>}) {
  const action = useAcknowledgedAction(model.versionKey);
  const expired = useExpired(model.expiresAt);
  const closed = !model.open || expired;
  const disabled = offline || closed || action.pending || action.acknowledged || action.stale;
  return <><PageTitle eyebrow={model.incidentContext ? en.recoveryOffer : en.offer} title={en.offerTitle} />
    <Card hero><Badge>{en.offer}</Badge><Text style={[s.title, s.heroTitle]}>{model.title}</Text><Text style={[s.body, s.onHero]}>{model.detail}</Text>
      <Text style={[s.small, s.accentText]}>{`${en.respondBy} · ${model.respondByLabel}`}</Text></Card>
    {model.incidentContext && <Notice>{model.incidentContext}</Notice>}
    <Card><Heading>{en.criteria}</Heading>{model.criteria.map(criterion => <Copy key={criterion}>{`· ${criterion}`}</Copy>)}
      <Copy small>{`${en.due} · ${model.dueLabel}`}</Copy>{model.allowanceLabel && <Copy small>{`${en.stipend} · ${model.allowanceLabel}`}</Copy>}</Card>
    <Copy small>{en.offerConsent}</Copy>{closed && <Notice>{model.closedReason ?? en.expired}</Notice>}
    {action.error && <Notice danger>{action.error}</Notice>}{action.acknowledged && <Notice>{demo ? en.demoAck : en.sent}</Notice>}
    <Button label={en.accept} pending={action.pending} disabled={disabled} onPress={() => void action.run(onAccept)} variant="accent" />
    <Button label={en.decline} disabled={disabled} onPress={() => void action.run(onDecline)} variant="secondary" />
  </>;
}
