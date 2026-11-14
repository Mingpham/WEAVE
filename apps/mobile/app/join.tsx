import { useLocalSearchParams } from 'expo-router';
import { ProductScreen } from '@/features/navigation/product-screen';
export default function JoinRoute() {
  const {code} = useLocalSearchParams<{code?: string}>();
  return <ProductScreen route={{screen: 'join-code', code}} />;
}
