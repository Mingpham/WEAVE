import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/screen';
import { Notice } from '@/components/ui';
import { JoinCode } from '@/features/onboarding/join-screens';
import { parseInvitationCode } from '@/features/onboarding/invitation-code';
import { en } from '@/strings/en';

// External invitation entry. Resolution/session creation are supplied by the team data layer.
// A real invitation never falls back to fixture data, even in the UI-preview binary.
export default function JoinRoute() {
  const {code} = useLocalSearchParams<{code?: string}>();
  const parsed = parseInvitationCode(code ?? '') ?? '';
  return <Screen><Notice>{en.integrationCopy}</Notice><JoinCode initialCode={parsed} onContinue={() => router.push('/connection')} /></Screen>;
}
