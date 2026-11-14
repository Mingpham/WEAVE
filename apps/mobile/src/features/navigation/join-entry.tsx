import { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { JoinCode } from '../onboarding/join-screens';
import { QrScanner } from '../device/qr-scanner';
import { parseInvitationCode } from '../onboarding/invitation-code';

// Code entry and local camera work without fabricating a resolved invitation.
export function JoinEntry({code}: {code?: string}) {
  const [open, setOpen] = useState(false);
  const pending = useRef<((code: string | null) => void) | undefined>(undefined);
  useEffect(() => () => {pending.current?.(null); pending.current = undefined;}, []);
  function finish(value: string | null) {const resolve = pending.current; pending.current = undefined; setOpen(false); resolve?.(value);}
  function scan() {
    if (pending.current) return Promise.resolve(null);
    return new Promise<string | null>(resolve => {pending.current = resolve; setOpen(true);});
  }
  return <><JoinCode key={code} initialCode={parseInvitationCode(code ?? '') ?? ''} onScan={scan} onContinue={() => {}} />
    <Modal visible={open} animationType="slide" onRequestClose={() => finish(null)}>{open ? <QrScanner onResult={finish} /> : null}</Modal></>;
}
