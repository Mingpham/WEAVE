import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({config}: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: 'WEAVE',
    slug: 'weave',
    android: {...config.android, package: 'com.weave.mobile'},
    plugins: [...(config.plugins ?? []), './plugins/with-local-release-signing.cjs', './plugins/with-native-build-inputs.cjs'],
  };
};
