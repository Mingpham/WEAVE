import { useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Copy, Notice } from '@/components/ui';
import { styles as s } from '@/theme';
import { workEn as w } from '@/strings/en';
import { errorMessage } from '@/strings/errors';
import { useAcknowledgedAction } from '@/features/shared/use-acknowledged-action';

export function Tick({label, checked, onChange, disabled = false, accessibilityLabel}: {label: string; checked: boolean; onChange: () => void; disabled?: boolean; accessibilityLabel?: string}) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{checked, disabled}}
    disabled={disabled} onPress={onChange} style={[s.choice, checked && s.selected, disabled && s.disabled]}>
    <Text style={s.body}>{checked ? '☑ ' : '☐ '}{label}</Text>
  </Pressable>;
}

export function ActionFeedback({error, stale, acknowledged, demo}: {error?: string; stale?: boolean; acknowledged?: boolean; demo?: boolean}) {
  return <>{stale && <Notice danger>{w.stale}</Notice>}{error && <Notice danger>{error}</Notice>}
    {acknowledged && <Notice>{demo ? w.demoAcknowledgement : w.acknowledgement}</Notice>}</>;
}

export function SourceLink({onOpen, unavailableReason, onRetry, offline}: {
  onOpen?: () => void; unavailableReason?: string; onRetry?: () => Promise<void>; offline?: boolean;
}) {
  const retry = useAcknowledgedAction();
  const unavailable = !!unavailableReason || !onOpen;
  return <>{unavailable && <Notice>{unavailableReason ?? w.sourceUnavailable}</Notice>}
    {onOpen && <Button label={w.source} onPress={onOpen} disabled={!!unavailableReason || retry.pending} variant="secondary" />}
    {unavailable && onRetry && <View accessibilityState={{busy: retry.pending}}><Button label={retry.pending ? w.refreshing : w.retrySource} disabled={offline || retry.pending} onPress={() => void retry.run(onRetry)} variant="secondary" /></View>}
    {unavailable && retry.error && <Notice danger>{retry.error}</Notice>}</>;
}

export type EvidencePhoto = {key: string; uri: string; label: string; expired?: boolean; unavailableMessage?: string; onRefresh?: () => Promise<void>};
export function PhotoGallery({photos, offline = false}: {photos: EvidencePhoto[]; offline?: boolean}) {
  const [selectedKey, setSelectedKey] = useState<string>();
  const selected = photos.find(photo => photo.key === selectedKey);
  return <><View style={s.row}>{photos.map(photo => <Pressable key={photo.key} accessibilityRole="button"
    accessibilityLabel={`${w.openPhoto}: ${photo.label}`} onPress={() => setSelectedKey(photo.key)} style={s.stack}>
    {photo.expired ? <View style={s.photo}><Copy small>{w.photoExpired}</Copy></View> : <Image source={{uri: photo.uri}} style={s.photo} accessibilityLabel={photo.label} />}
    <Copy small>{photo.label}</Copy>
  </Pressable>)}</View>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelectedKey(undefined)}>
      {selected && <PhotoViewer key={selected.key} photo={selected} offline={offline} onClose={() => setSelectedKey(undefined)} />}
    </Modal>
  </>;
}

function PhotoViewer({photo, offline, onClose}: {photo: EvidencePhoto; offline: boolean; onClose: () => void}) {
  const [zoom, setZoom] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string>();
  const pending = useRef(false);
  const requestKey = `${photo.uri}-${attempt}`;
  const unavailable = photo.expired || failed === requestKey;
  async function retry() {
    if (pending.current || offline) return;
    pending.current = true; setRefreshing(true); setRefreshError(undefined);
    try {await photo.onRefresh?.(); setAttempt(value => value + 1);}
    catch (error) {setRefreshError(errorMessage(error));}
    finally {pending.current = false; setRefreshing(false);}
  }
  return <SafeAreaView style={s.fill}><View style={s.content}>
    <Button label={w.closePhoto} onPress={onClose} variant="secondary" /><Copy>{photo.label}</Copy>
    {!unavailable && <Button label={zoom ? w.zoomOut : w.zoomIn} onPress={() => setZoom(!zoom)} variant="secondary" />}
    {unavailable ? <><Notice danger>{photo.unavailableMessage ?? (photo.expired ? w.photoExpired : w.photoError)}</Notice>
      <View accessibilityState={{busy: refreshing}}><Button label={refreshing ? w.refreshing : photo.onRefresh ? w.refreshPhoto : w.retryPhoto} disabled={offline || refreshing || (photo.expired && !photo.onRefresh)} onPress={() => void retry()} variant="secondary" /></View>
      {photo.expired && !photo.onRefresh && <Copy small>{w.photoRefreshUnavailable}</Copy>}</>
      : loaded !== requestKey && <View accessibilityLiveRegion="polite" accessibilityState={{busy: true}}><Copy>{w.photoLoading}</Copy></View>}
    {unavailable && refreshError && <Notice danger>{refreshError}</Notice>}
  </View>{!photo.expired && <ScrollView contentContainerStyle={{flexGrow: 1}}><ScrollView horizontal contentContainerStyle={{flexGrow: 1}}>
    <Image key={requestKey} source={{uri: photo.uri}} accessibilityLabel={photo.label} resizeMode="contain"
      onLoad={() => setLoaded(requestKey)} onError={() => setFailed(requestKey)}
      style={{width: zoom ? 900 : 340, height: zoom ? 1200 : 480, alignSelf: 'center'}} />
  </ScrollView></ScrollView>}</SafeAreaView>;
}
