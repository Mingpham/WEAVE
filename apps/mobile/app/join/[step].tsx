import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/screen';
import { ProductScreen, UnavailableScreen } from '@/features/navigation/product-screen';
export default function JoinStepRoute() {
  const {step, code} = useLocalSearchParams<{step?: string; code?: string}>();
  return step === 'consent' || step === 'profile' ? <ProductScreen route={{screen: step === 'consent' ? 'join-consent' : 'join-profile', code}} />
    : <Screen><UnavailableScreen notFound /></Screen>;
}
