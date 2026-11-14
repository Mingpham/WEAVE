import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { Button, Copy, PageTitle } from '@/components/ui';
import { en } from '@/strings/en';

export default function ConnectionRoute() {
  return <Screen><PageTitle title={en.integrationTitle} /><Copy>{en.integrationCopy}</Copy>
    <Button label={en.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /></Screen>;
}
