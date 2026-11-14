import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Badge, Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { en } from '@/strings/en';
import { styles as s } from '@/theme';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import type { LocalPhoto } from '../evidence/composer-screen';

export type ProbeView = { question: string; whyYou: string; deadlineLabel: string; choices: {key: string; label: string}[]; open: boolean; ai: boolean };
export function Probe({ model, offline, demo, onAnswer, onCannotCheck, onDecline, onPickPhoto, maxPhotos }: {
  model: ProbeView; offline?: boolean; demo?: boolean;
  onAnswer: (answer: {choiceKey?: string; text: string; photos: LocalPhoto[]}) => Promise<void>; onCannotCheck: () => Promise<void>; onDecline: () => Promise<void>;
  onPickPhoto?: (camera: boolean) => Promise<LocalPhoto | null>; maxPhotos: number;
}) {
  const [choiceKey, setChoiceKey] = useState<string>();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const action = useAcknowledgedAction();
  const media = useAcknowledgedAction();
  const disabled = offline || !model.open || action.pending || action.acknowledged || media.pending;
  const pick = (camera: boolean) => void media.run(async () => {
    const photo = await onPickPhoto?.(camera);
    if (photo) setPhotos(current => [...current, photo].slice(0, maxPhotos));
  });
  return <><PageTitle eyebrow={en.probe} title={en.probeTitle} />
    <Card hero>{model.ai && <Badge>{en.ai}</Badge>}<Text style={[s.title, s.heroTitle]}>{model.question}</Text>
      <Text style={[s.small, s.onHero]}>{en.whyYou}</Text><Text style={[s.body, s.onHero]}>{model.whyYou}</Text>
      <Text style={[s.small, s.accentText]}>{`${en.respondBy} · ${model.deadlineLabel}`}</Text></Card>
    {!model.open && <Notice>{en.expired}</Notice>}<Heading>{en.answer}</Heading>
    <View accessibilityRole="radiogroup" style={s.stack}>{model.choices.map(choice => <Choice key={choice.key} label={choice.label} selected={choiceKey === choice.key}
      disabled={disabled} onPress={() => setChoiceKey(choice.key)} />)}</View>
    <Field label={en.optionalNote} value={text} onChangeText={setText} multiline disabled={disabled} />
    <Card><Heading>{en.photos}</Heading><Copy small>{en.photoConsent}</Copy>
      <View style={s.row}>{photos.map((photo, index) => <View key={photo.uri} style={s.stack}><Image source={{uri: photo.uri}} accessibilityLabel={`${en.photos} ${index + 1}`} style={s.photo} />
        <Button label={`${en.removePhoto} ${index + 1}`} disabled={disabled} variant="secondary" onPress={() => setPhotos(current => current.filter((_, i) => i !== index))} /></View>)}</View>
      <Button label={en.addPhoto} onPress={() => pick(false)} disabled={disabled || !onPickPhoto || photos.length >= maxPhotos} pending={media.pending} variant="secondary" />
      <Button label={en.camera} onPress={() => pick(true)} disabled={disabled || !onPickPhoto || photos.length >= maxPhotos} variant="secondary" />
      {media.error && <Notice danger>{en.photoFailed}</Notice>}
    </Card>
    <Copy small>{en.probePrivacy}</Copy>{action.error && <Notice danger>{action.error}</Notice>}{action.acknowledged && <Notice>{demo ? en.demoAck : en.sent}</Notice>}
    <Button label={en.sendAnswer} disabled={disabled || (!choiceKey && !text.trim() && !photos.length)} pending={action.pending} onPress={() => void action.run(() => onAnswer({choiceKey, text, photos}))} />
    <Button label={en.cantCheck} disabled={disabled} variant="secondary" onPress={() => void action.run(onCannotCheck)} />
    <Button label={en.decline} disabled={disabled} variant="secondary" onPress={() => void action.run(onDecline)} />
  </>;
}
