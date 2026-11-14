import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { MyEvents } from '@/features/events/event-screens';
import { Notice } from '@/components/ui';
import { en } from '@/strings/en';

export default function EventsRoute() {
  return <Screen><Notice>{en.integrationCopy}</Notice><MyEvents events={[]} onJoin={() => router.push('/connection')}
    onCreate={() => router.push('/connection')} onSignOut={() => router.push('/connection')} /></Screen>;
}
