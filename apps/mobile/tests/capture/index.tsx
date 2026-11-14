import '../../global.css';
import {registerRootComponent} from 'expo';
import {Text, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useFonts} from 'expo-font';
import {DMSans_400Regular} from '@expo-google-fonts/dm-sans/400Regular';
import {DMSans_700Bold} from '@expo-google-fonts/dm-sans/700Bold';
import {Manrope_800ExtraBold} from '@expo-google-fonts/manrope/800ExtraBold';
import {Screen} from '@/components/screen';
import {colors} from '@/theme';
import {captureScenes} from '../../../../tests/fixtures/mobile/capture-scenes';
import {recordCaptureScenes} from '../../../../tests/fixtures/mobile/record-captures';

const scenes = [...captureScenes, ...recordCaptureScenes].sort((a,b) => a.id.localeCompare(b.id));
function CaptureApp() {
  const [loaded, error] = useFonts({DMSans:DMSans_400Regular,DMSansBold:DMSans_700Bold,Manrope:Manrope_800ExtraBold});
  const requested = new URLSearchParams(window.location.search).get('screen') ?? '01';
  const scene = scenes.find(item => item.id === requested);
  return <SafeAreaProvider><View style={{flex:1,backgroundColor:colors.canvas}}>
    {loaded || error ? <><View testID="capture-ready" style={{paddingHorizontal:24,paddingVertical:12,backgroundColor:colors.forest}}>
      <Text style={{fontFamily:'DMSansBold',fontSize:11,color:colors.sea}}>UI CAPTURE · FIXTURE DATA</Text>
      <Text style={{fontFamily:'DMSans',fontSize:12,color:colors.card}}>{scene ? `SCR-${scene.id} · ${scene.name}` : 'Unknown screen'}</Text>
    </View><Screen key={requested} topInset>{scene?.render() ?? <Text>Unknown screenshot scene.</Text>}</Screen></> : <Text>Loading fonts</Text>}
  </View></SafeAreaProvider>;
}
registerRootComponent(CaptureApp);
