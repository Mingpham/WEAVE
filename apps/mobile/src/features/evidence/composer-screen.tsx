import { useLayoutEffect, useRef } from 'react';
import { Image, View } from 'react-native';
import { Badge, Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { en } from '@/strings/en';
import { styles as s } from '@/theme';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';

export type LocalPhoto = { uri: string; width: number; height: number; bytes: number };
export type ComposerDraft = { text: string; photos: LocalPhoto[]; contextKey?: string; categoryKey?: string };
export type SelectionItem = { key: string; label: string };
export type ComposerProps = {
  draft: ComposerDraft; onChange: (draft: ComposerDraft) => void;
  onSend: (draft: ComposerDraft) => Promise<void>; onPickPhoto?: (camera: boolean) => Promise<LocalPhoto | null>;
  contexts: SelectionItem[]; categories?: SelectionItem[]; safetySelected?: boolean;
  offline?: boolean; report?: boolean; demo?: boolean; maxPhotos: number;
};
export function Composer({ draft, onChange, onSend, onPickPhoto, contexts, categories, safetySelected, offline, report, demo, maxPhotos }: ComposerProps) {
  const action = useAcknowledgedAction();
  const media = useAcknowledgedAction();
  const latestDraft = useRef(draft);
  useLayoutEffect(() => { latestDraft.current = draft; }, [draft]);
  const valid = (draft.text.trim().length > 0 || draft.photos.length > 0) && draft.text.length <= 1000;
  const pick = (camera: boolean) => void media.run(async () => {
    const photo = await onPickPhoto?.(camera);
    if (photo) {
      action.reset();
      const current = latestDraft.current;
      onChange({...current, photos: [...current.photos, photo].slice(0, maxPhotos)});
    }
  });
  return <><PageTitle eyebrow={report ? en.report : en.composer} title={report ? en.reportTitle : en.composer} subtitle={report ? en.reportCopy : en.composerCopy} />
    {categories && <View style={s.stack}><Heading>{en.issueType}</Heading>{categories.map(item => <Choice key={item.key} label={item.label} selected={draft.categoryKey === item.key}
      disabled={action.pending} onPress={() => { action.reset(); onChange({...draft, categoryKey: item.key}); }} />)}</View>}
    {safetySelected && <Notice danger>{en.emergency}</Notice>}
    {contexts.length > 0 && <View style={s.stack}><Heading>{en.context}</Heading><Choice label={en.noContext} selected={!draft.contextKey} disabled={action.pending} onPress={() => {action.reset(); onChange({...draft, contextKey: undefined});}} />
      {contexts.map(item => <Choice key={item.key} label={item.label} selected={draft.contextKey === item.key} disabled={action.pending} onPress={() => {action.reset(); onChange({...draft, contextKey: item.key});}} />)}</View>}
    <Field label={en.description} value={draft.text} placeholder={en.notePlaceholder} multiline disabled={action.pending}
      onChangeText={text => { action.reset(); onChange({...draft, text}); }} /><Copy small>{`${draft.text.length} / 1000`}</Copy>
    <Card><View style={s.between}><Heading>{en.photos}</Heading><Badge>{`${draft.photos.length} / ${maxPhotos}`}</Badge></View><Copy small>{en.photoConsent}</Copy>
      <View style={s.row}>{draft.photos.map((photo, index) => <View key={photo.uri} style={s.stack}><Image accessibilityLabel={`${en.photos} ${index + 1}`} source={{uri: photo.uri}} style={s.photo} />
        <Button label={`${en.removePhoto} ${index + 1}`} variant="secondary" disabled={action.pending || media.pending} onPress={() => {action.reset(); onChange({...draft, photos: draft.photos.filter((_, i) => i !== index)});}} /></View>)}</View>
      <Button label={en.addPhoto} onPress={() => pick(false)} pending={media.pending} disabled={!onPickPhoto || action.pending || draft.photos.length >= maxPhotos} variant="secondary" />
      <Button label={en.camera} onPress={() => pick(true)} disabled={!onPickPhoto || action.pending || media.pending || draft.photos.length >= maxPhotos} variant="secondary" />
      {!onPickPhoto && <Copy small>{en.photoUnavailable}</Copy>}{media.error && <Notice danger>{en.photoFailed}</Notice>}
    </Card><Copy small>{en.draftHint}</Copy>
    {action.error && <Notice danger>{en.notSent}{' · '}{action.error}</Notice>}
    {action.acknowledged && <Notice>{demo ? en.demoAck : en.sent}</Notice>}
    <Button label={action.error ? en.retry : report ? en.sendReport : en.send} pending={action.pending} disabled={offline || !valid || media.pending || action.acknowledged}
      onPress={() => void action.run(() => onSend(draft))} />
  </>;
}
