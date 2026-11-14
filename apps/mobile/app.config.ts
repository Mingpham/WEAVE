import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({config}: ConfigContext): ExpoConfig => {
  const preview = process.env.EXPO_PUBLIC_APP_MODE === 'demo';
  return {
    ...config,
    name: preview ? 'WEAVE UI Preview' : 'WEAVE',
    slug: 'weave',
    android: {...config.android, package: preview ? 'com.weave.mobile.preview' : 'com.weave.mobile'},
    plugins: [...(config.plugins ?? []), './plugins/with-local-release-signing.cjs'],
  };
};
