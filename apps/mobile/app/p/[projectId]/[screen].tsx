import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/screen';
import { ProductScreen, UnavailableScreen } from '@/features/navigation/product-screen';
import { parseEventScreen } from '@/features/navigation/routes';
export default function EventRoute() {
  const {projectId, screen: name, item} = useLocalSearchParams<{projectId?: string; screen?: string; item?: string}>();
  const screen = parseEventScreen(name);
  return projectId && screen ? <ProductScreen key={`${projectId}:${screen}:${item ?? ''}`} route={{projectId, screen, itemId: item}} />
    : <Screen><UnavailableScreen notFound /></Screen>;
}
