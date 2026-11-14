import { Redirect, router } from 'expo-router';
import { Screen } from '@/components/screen';
import { Welcome } from '@/features/events/event-screens';
import { useMobilePresentation } from '@/features/navigation/presentation';
export default function WelcomeRoute() {
  const presentation = useMobilePresentation();
  if (presentation?.session === 'signed-in') return <Redirect href="/events" />;
  return <Screen topInset state={presentation?.session === 'loading' ? {phase: 'loading', refresh: () => {}} : undefined}>
    <Welcome onJoin={() => router.push(presentation?.session === 'signed-in' ? '/join' : '/auth?next=join')} onOrganize={() => router.push('/auth')} /></Screen>;
}
