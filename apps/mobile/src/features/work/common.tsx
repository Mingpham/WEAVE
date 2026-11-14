import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Copy, Notice } from '@/components/ui';
import { styles as s } from '@/theme';
import { workEn as w } from '@/strings/en';

export function Tick({label, checked, onChange, disabled = false}: {label: string; checked: boolean; onChange: () => void; disabled?: boolean}) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked, disabled}}
    disabled={disabled} onPress={onChange} style={[s.choice, checked && s.selected, disabled && s.disabled]}>
    <Text style={s.body}>{checked ? '☑ ' : '☐ '}{label}</Text>
  </Pressable>;
}

export function ActionFeedback({error, stale, acknowledged, demo}: {error?: string; stale?: boolean; acknowledged?: boolean; demo?: boolean}) {
  return <>{stale && <Notice danger>{w.stale}</Notice>}{error && <Notice danger>{error}</Notice>}
    {acknowledged && <Notice>{demo ? w.demoAcknowledgement : w.acknowledgement}</Notice>}</>;
}

export type EvidencePhoto = {key: string; uri: string; label: string};
export function PhotoGallery({photos}: {photos: EvidencePhoto[]}) {
  const [selected, setSelected] = useState<EvidencePhoto>();
  const [zoom, setZoom] = useState(false);
  const [failed, setFailed] = useState(false);
  return <><View style={s.row}>{photos.map(photo => <Pressable key={photo.key} accessibilityRole="button"
    accessibilityLabel={`${w.openPhoto}: ${photo.label}`} onPress={() => {setFailed(false); setZoom(false); setSelected(photo);}} style={s.stack}>
    <Image source={{uri: photo.uri}} style={s.photo} accessibilityLabel={photo.label} /><Copy small>{photo.label}</Copy>
  </Pressable>)}</View>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(undefined)}>
      <SafeAreaView style={s.fill}><View style={s.content}>
        <Button label={w.closePhoto} onPress={() => setSelected(undefined)} variant="secondary" />
        {selected && <Copy>{selected.label}</Copy>}
        <Button label={zoom ? w.zoomOut : w.zoomIn} onPress={() => setZoom(!zoom)} variant="secondary" />
      </View><ScrollView contentContainerStyle={{flexGrow: 1}}><ScrollView horizontal contentContainerStyle={{flexGrow: 1}}>
        {selected && <Image source={{uri: selected.uri}} accessibilityLabel={selected.label} resizeMode="contain"
          onError={() => setFailed(true)} style={{width: zoom ? 900 : 340, height: zoom ? 1200 : 480, alignSelf: 'center'}} />}
      </ScrollView></ScrollView>{failed && <Notice danger>{w.photoError}</Notice>}</SafeAreaView>
    </Modal>
  </>;
}
