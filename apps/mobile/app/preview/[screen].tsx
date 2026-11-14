import { Redirect } from 'expo-router';

export default function PreviewRoute() {
  const enabled = process.env.EXPO_PUBLIC_APP_MODE === 'demo' || (__DEV__ && process.env.EXPO_PUBLIC_ENABLE_UI_PREVIEW === 'true');
  if (!enabled) return <Redirect href="/" />;
  // Metro substitutes an empty module for live release builds. A separately
  // labeled standalone UI preview may explicitly include fixtures.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Preview = require('../../src/features/preview/preview-shell').default;
  return <Preview />;
}
