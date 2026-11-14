import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Modal } from 'react-native';
import { onboardingDemo, onboardingDemoActions, onboardingEmptyProfile, onboardingEvent, onboardingInvite, onboardingRoles } from '../../../../../tests/fixtures/mobile/onboarding';
import { CreateEvent } from './event-form';
import { JoinCode, JoinConsent, JoinProfile, SignIn, Waiting } from './join-screens';
import { Me } from './me-screen';
import { People } from './people-screen';
import { EventSettings } from './settings-screen';
import { QrScanner } from '../device/qr-scanner';
import { NotificationPermissions } from '../device/notifications';

// Only mounted from the explicitly labeled development preview shell.
export function OnboardingPreview({ screen, navigate, offline }: { screen: string; navigate: (screen: string) => void; offline: boolean }) {
  const state = useSyncExternalStore(onboardingDemo.subscribe, onboardingDemo.snapshot, onboardingDemo.snapshot);
  const [scannerOpen, setScannerOpen] = useState(false);
  const scanResult = useRef<((code: string | null) => void) | undefined>(undefined);
  useEffect(() => () => { scanResult.current?.(null); scanResult.current = undefined; setScannerOpen(false); }, [screen]);
  function finishScan(code: string | null) {
    const settle = scanResult.current;
    scanResult.current = undefined; setScannerOpen(false); settle?.(code);
  }
  function scan(): Promise<string | null> {
    if (scanResult.current) return Promise.resolve(null);
    return new Promise(resolve => { scanResult.current = resolve; setScannerOpen(true); });
  }
  const actions = onboardingDemoActions(navigate, offline);
  const common = { offline, demo: true };
  if (screen === 'auth') return <SignIn {...common} onGoogle={actions.google} onGuest={actions.guest} />;
  if (screen === 'join-code') return <><JoinCode {...common} initialCode={state.people.invite?.code} invite={state.resolved ? onboardingInvite : undefined} onResolve={actions.resolve} onContinue={actions.continueJoin} onScan={scan} />
    <Modal visible={scannerOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => finishScan(null)}>{scannerOpen ? <QrScanner onResult={finishScan} /> : null}</Modal></>;
  if (screen === 'join-consent') return <JoinConsent invite={onboardingInvite} onContinue={actions.agree} />;
  if (screen === 'join-profile') return <JoinProfile {...common} invite={onboardingInvite} roles={onboardingRoles} initialProfile={onboardingEmptyProfile} consentAccepted={state.consentAccepted} onJoin={actions.join} />;
  if (screen === 'waiting') return <Waiting {...common} eventName={onboardingInvite.eventName} onCancel={actions.cancelRequest} />;
  if (screen === 'create-event') return <CreateEvent {...common} initialValue={onboardingEvent} maxMembers={50} canCreate onCreate={actions.create} />;
  if (screen === 'people') return <People {...common} model={state.people} onApprove={actions.approve} onReject={actions.reject} onRemove={actions.remove} onRegenerate={actions.regenerate} onDisableInvite={actions.disableInvite} />;
  if (screen === 'settings') return <EventSettings {...common} model={state.settings} onSave={actions.saveSettings} onClose={actions.close} onDelete={actions.delete} />;
  if (screen === 'me') return <Me {...common} model={state.me} onSave={actions.saveMe} onHere={actions.here} onUnavailable={actions.unavailable} onLeave={actions.leave} onSignOut={actions.signOut} notifications={<NotificationPermissions demo />} />;
  return null;
}
