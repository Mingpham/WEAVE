import { useState, type ComponentProps } from 'react';
import { Image, Text, View } from 'react-native';
import { Badge, Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { en } from '@/strings/en';
import { styles as s } from '@/theme';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import type { LocalPhoto } from '../evidence/composer-screen';
import { useExpired } from '../shared/use-expired';

export type ProbeView = { question: string; whyYou: string; deadlineLabel: string; choices: {key: string; label: string}[]; open: boolean; ai: boolean; expiresAt?: string; versionKey?: string; allowPhoto?: boolean; closedReason?: string };
export function Probe({ model, offline, demo, direct = false, onAnswer, onCannotCheck, onDecline, onPickPhoto, maxPhotos }: {
  model: ProbeView; offline?: boolean; demo?: boolean; direct?: boolean;
  onAnswer: (answer: {choiceKey?: string; text: string; photos: LocalPhoto[]}) => Promise<void>; onCannotCheck?: () => Promise<void>; onDecline?: () => Promise<void>;
  onPickPhoto?: (camera: boolean) => Promise<LocalPhoto | null>; maxPhotos: number;
}) {
  const [choiceKey, setChoiceKey] = useState<string>();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const action = useAcknowledgedAction(model.versionKey);
  const media = useAcknowledgedAction();
  const expired = useExpired(model.expiresAt);
  const closed = !model.open || expired;
  const disabled = offline || closed || action.pending || action.acknowledged || media.pending || action.stale;
  const pick = (camera: boolean) => void media.run(async () => {
    const photo = await onPickPhoto?.(camera);
    if (photo) setPhotos(current => [...current, photo].slice(0, maxPhotos));
  });
  return <><PageTitle eyebrow={direct ? en.know : en.probe} title={direct ? en.directAnswerTitle : en.probeTitle} />
    <Card hero>{model.ai && <Badge>{en.ai}</Badge>}<Text style={[s.title, s.heroTitle]}>{model.question}</Text>
      {!direct && <Text style={[s.small, s.onHero]}>{en.whyYou}</Text>}<Text style={[s.body, s.onHero]}>{model.whyYou}</Text>
      {!direct && <Text style={[s.small, s.accentText]}>{`${en.respondBy} · ${model.deadlineLabel}`}</Text>}</Card>
    {direct && <Notice>{en.directAnswerCopy}</Notice>}
    {closed && <Notice>{model.closedReason ?? en.expired}</Notice>}<Heading>{en.answer}</Heading>
    <View accessibilityRole="radiogroup" style={s.stack}>{model.choices.map(choice => <Choice key={choice.key} label={choice.label} selected={choiceKey === choice.key}
      disabled={disabled} onPress={() => setChoiceKey(choice.key)} />)}</View>
    <Field label={en.optionalNote} value={text} onChangeText={setText} multiline disabled={disabled} />
    {model.allowPhoto !== false && <Card><Heading>{en.photos}</Heading><Copy small>{en.photoConsent}</Copy>
      <View style={s.row}>{photos.map((photo, index) => <View key={photo.uri} style={s.stack}><Image source={{uri: photo.uri}} accessibilityLabel={`${en.photos} ${index + 1}`} style={s.photo} />
        <Button label={`${en.removePhoto} ${index + 1}`} disabled={disabled} variant="secondary" onPress={() => setPhotos(current => current.filter((_, i) => i !== index))} /></View>)}</View>
      <Button label={en.addPhoto} onPress={() => pick(false)} disabled={disabled || !onPickPhoto || photos.length >= maxPhotos} pending={media.pending} variant="secondary" />
      <Button label={en.camera} onPress={() => pick(true)} disabled={disabled || !onPickPhoto || photos.length >= maxPhotos} variant="secondary" />
      {media.error && <Notice danger>{en.photoFailed}</Notice>}
    </Card>}
    <Copy small>{en.probePrivacy}</Copy>{action.error && <Notice danger>{action.error}</Notice>}{action.acknowledged && <Notice>{demo ? en.demoAck : en.sent}</Notice>}
    <Button label={action.error ? en.retry : en.sendAnswer} disabled={disabled || (!choiceKey && !text.trim() && !(model.allowPhoto !== false && photos.length))} pending={action.pending} onPress={() => void action.run(() => onAnswer({choiceKey, text, photos: model.allowPhoto === false ? [] : photos}))} />
    {!direct && <><Button label={en.cantCheck} disabled={disabled || !onCannotCheck} variant="secondary" onPress={() => onCannotCheck && void action.run(onCannotCheck)} />
    <Button label={en.decline} disabled={disabled || !onDecline} variant="secondary" onPress={() => onDecline && void action.run(onDecline)} /></>}
  </>;
}

export function DirectAnswer(props: Omit<ComponentProps<typeof Probe>, 'direct' | 'onCannotCheck' | 'onDecline'>) {
  return <Probe {...props} direct />;
}
