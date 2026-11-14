import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Screen } from '@/components/screen';
import { Copy } from '@/components/ui';
import { en } from '@/strings/en';
import { colors } from '@/theme';

export default function Layout() {
  const [loaded, error] = useFonts({DMSans: DMSans_400Regular, DMSansBold: DMSans_700Bold, Manrope: Manrope_800ExtraBold});
  return <SafeAreaProvider><StatusBar style="dark" />{!loaded && !error ? <Screen><Copy>{en.loading}</Copy></Screen> :
    <Stack screenOptions={{headerStyle: {backgroundColor: colors.canvas}, headerTintColor: colors.forest, headerShadowVisible: false,
      headerTitleStyle: {fontFamily: 'Manrope'}, contentStyle: {backgroundColor: colors.canvas}, title: en.brand}}>
      <Stack.Screen name="index" options={{headerShown: false}} />
      <Stack.Screen name="events" options={{title: en.events}} />
      <Stack.Screen name="connection" options={{title: en.brand}} />
      <Stack.Screen name="preview/[screen]" options={{title: en.demo}} />
    </Stack>}</SafeAreaProvider>;
}
