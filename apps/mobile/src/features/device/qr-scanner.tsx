import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen } from '@/components/screen';
import { Button, Card, Copy, Notice, PageTitle } from '@/components/ui';
import { deviceEn as t } from '@/strings/en';
import { radius, styles as s } from '@/theme';
import { parseInvitationCode } from '../onboarding/invitation-code';

// Mount only while the scanner modal is visible. Permission is never requested by an effect.
export function QrScanner({ onResult }: { onResult: (code: string | null) => void }) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [invalid, setInvalid] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [permissionError, setPermissionError] = useState(false);
  const scanned = useRef(false);
  const finished = useRef(false);
  const requesting = useRef(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      setActive(status === 'active');
      if (status === 'active') void getPermission().catch(() => setPermissionError(true));
    });
    return () => subscription.remove();
  }, [getPermission]);
  function finish(code: string | null) {
    if (finished.current) return;
    finished.current = true;
    scanned.current = true;
    onResult(code);
  }
  async function askPermission() {
    if (requesting.current) return;
    requesting.current = true; setPending(true); setPermissionError(false);
    try { await requestPermission(); } catch { setPermissionError(true); }
    finally { requesting.current = false; setPending(false); }
  }
  async function openSettings() {
    try { await Linking.openSettings(); } catch { setPermissionError(true); }
  }
  const denied = permission?.status === 'denied';
  return <Screen topInset><PageTitle title={t.scannerTitle} subtitle={t.scannerCopy} /><Copy small>{t.cameraWhy}</Copy>
    {!permission ? <Card><Copy>{t.permissionLoading}</Copy><Button label={t.retry} onPress={() => void getPermission().catch(() => setPermissionError(true))} /></Card> :
      !permission.granted ? <Card><Notice>{denied ? permission.canAskAgain ? t.permissionDenied : t.permissionBlocked : t.cameraWhy}</Notice>
        {permission.canAskAgain ? <Button label={pending ? t.permissionRequesting : denied ? t.retry : t.cameraPermission} disabled={pending} onPress={() => void askPermission()} /> :
          <Button label={t.openSettings} onPress={() => void openSettings()} />}</Card> : cameraError ?
        <Card><Notice danger>{t.cameraUnavailable}</Notice><Button label={t.retry} onPress={() => { setCameraError(false); setInvalid(false); scanned.current = false; setCameraKey(value => value + 1); }} /></Card> :
        <View style={[s.card, local.preview]}>{active ? <CameraView key={cameraKey} style={local.camera} facing="back" accessibilityLabel={t.cameraPreview}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onMountError={() => setCameraError(true)} onBarcodeScanned={invalid ? undefined : event => {
            if (scanned.current || finished.current) return;
            scanned.current = true;
            const code = parseInvitationCode(event.data);
            if (code) finish(code); else setInvalid(true);
          }} /> : null}</View>}
    {invalid ? <Card><Notice danger>{t.invalidQr}</Notice><Button label={t.scanAgain} onPress={() => { scanned.current = false; setInvalid(false); }} /></Card> : null}
    {permissionError ? <Notice danger>{t.cameraUnavailable}</Notice> : null}
    <Button label={t.manualEntry} variant="secondary" onPress={() => finish(null)} />
    <Button label={t.cancel} variant="secondary" onPress={() => finish(null)} />
  </Screen>;
}
const local = StyleSheet.create({ preview: { aspectRatio: 1, overflow: 'hidden', padding: 0 }, camera: { flex: 1, borderRadius: radius.lg } });
