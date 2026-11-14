import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import type { NotificationPermissionsStatus } from 'expo-notifications';
import { Badge, Button, Card, Copy, Heading, Notice } from '@/components/ui';
import { deviceEn as t } from '@/strings/en';

export type NotificationAccess = { mode: 'ask' | 'denied' | 'granted' | 'quiet' | 'temporary'; canAskAgain: boolean };
export type NotificationPermissionAdapter = {
  supported: boolean; get: () => Promise<NotificationAccess>; request: () => Promise<NotificationAccess>; openSettings: () => Promise<void>;
};
export const eventNotificationChannel = 'weave-event-updates';

async function toView(permission: NotificationPermissionsStatus): Promise<NotificationAccess> {
  const { IosAuthorizationStatus } = await import('expo-notifications');
  const status = permission.ios?.status;
  const mode = status === IosAuthorizationStatus.PROVISIONAL ? 'quiet' : status === IosAuthorizationStatus.EPHEMERAL ? 'temporary' :
    permission.granted || status === IosAuthorizationStatus.AUTHORIZED ? 'granted' : permission.status === 'denied' ? 'denied' : 'ask';
  return { mode, canAskAgain: permission.canAskAgain };
}

// Device permissions only: no token lookup, notification scheduling, push registration, or service calls.
export const nativeNotificationPermissionAdapter: NotificationPermissionAdapter = {
  supported: (Platform.OS === 'android' || Platform.OS === 'ios') && !isRunningInExpoGo(),
  async get() {
    const notifications = await import('expo-notifications');
    return toView(await notifications.getPermissionsAsync());
  },
  async request() {
    const notifications = await import('expo-notifications');
    if (Platform.OS === 'android') {
      await notifications.setNotificationChannelAsync(eventNotificationChannel, {
        name: t.notificationsChannel, importance: notifications.AndroidImportance.DEFAULT,
      });
    }
    return toView(await notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }));
  },
  openSettings: () => Linking.openSettings(),
};

export function NotificationPermissions({ adapter = nativeNotificationPermissionAdapter, demo = false }: {
  adapter?: NotificationPermissionAdapter; demo?: boolean;
}) {
  const [access, setAccess] = useState<NotificationAccess>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const sequence = useRef(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    async function refresh() {
      if (!adapter.supported || busy.current) return;
      const revision = ++sequence.current;
      try {
        const value = await adapter.get();
        if (mounted.current && revision === sequence.current) { setAccess(value); setError(false); }
      } catch { if (mounted.current && revision === sequence.current) setError(true); }
    }
    void refresh();
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') void refresh(); });
    return () => { mounted.current = false; subscription.remove(); };
  }, [adapter]);
  async function run(request: boolean) {
    if (!adapter.supported || busy.current) return;
    busy.current = true; const revision = ++sequence.current; setPending(true); setError(false);
    try {
      const value = await (request ? adapter.request() : adapter.get());
      if (mounted.current && revision === sequence.current) setAccess(value);
    } catch { if (mounted.current && revision === sequence.current) setError(true); }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  }
  async function settings() {
    try { await adapter.openSettings(); } catch { if (mounted.current) setError(true); }
  }
  const allowed = access?.mode === 'granted' || access?.mode === 'quiet' || access?.mode === 'temporary';
  const label = access?.mode === 'granted' ? t.notificationsGranted : access?.mode === 'quiet' ? t.notificationsQuiet :
    access?.mode === 'temporary' ? t.notificationsTemporary : access?.mode === 'denied' ? t.notificationsDenied : t.notificationsUndetermined;
  return <Card><Heading>{t.notificationsTitle}</Heading><Copy>{t.notificationsCopy}</Copy>
    {demo ? <Copy small>{t.notificationsDemo}</Copy> : null}<Copy small>{t.notificationsDevice}</Copy>
    {!adapter.supported ? <Notice>{isRunningInExpoGo() ? t.notificationsExpoGo : t.notificationsDevice}</Notice> : <>
      {access ? <Badge tone={access.mode === 'denied' ? 'warning' : 'neutral'}>{label}</Badge> : !error ? <Copy>{t.notificationsChecking}</Copy> : null}
      {access?.mode === 'denied' ? <Copy small>{t.notificationsDeniedCopy}</Copy> : null}
      {error ? <><Notice danger>{t.notificationsError}</Notice><Button label={t.retry} disabled={pending} onPress={() => void run(false)} /></> : null}
      {access && !allowed && access.canAskAgain ? <Button label={pending ? t.notificationsRequesting : t.notificationsAllow} disabled={pending} onPress={() => void run(true)} /> : null}
      {access && (allowed || !access.canAskAgain || access.mode === 'denied') ? <Button label={t.openSettings} variant="secondary" disabled={pending} onPress={() => void settings()} /> : null}
    </>}
    <Notice>{t.notificationsRegistration}</Notice>
  </Card>;
}
