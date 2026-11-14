import {Redirect, useLocalSearchParams, type Href} from 'expo-router';
import {Screen} from '@/components/screen';
import {useMobilePresentation} from '@/features/navigation/presentation';
export default function AuthCallback() {
  const presentation = useMobilePresentation();
  const {next, invite} = useLocalSearchParams<{next?: string; invite?: string}>();
  if (presentation?.session === 'loading') return <Screen state={{phase: 'loading', refresh: () => {}}} />;
  const destination = `/join${invite && /^[A-Z2-9]{6}$/.test(invite) ? `?code=${invite}` : ''}` as Href;
  return <Redirect href={presentation?.session === 'signed-in' ? next === 'join' ? destination : '/events' : '/auth'} />;
}
