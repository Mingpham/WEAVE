import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { Welcome } from '@/features/events/event-screens';

export default function WelcomeRoute() {
  const enabled = process.env.EXPO_PUBLIC_APP_MODE === 'demo' || (__DEV__ && process.env.EXPO_PUBLIC_ENABLE_UI_PREVIEW === 'true');
  const demo = process.env.EXPO_PUBLIC_APP_MODE === 'demo';
  return <Screen topInset demo={demo}><Welcome onJoin={() => router.push(demo ? '/preview/auth' : '/connection')} onOrganize={() => router.push(demo ? '/preview/auth' : '/connection')}
    onPreview={enabled ? () => router.push('/preview/events') : undefined} /></Screen>;
}
