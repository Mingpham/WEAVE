const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
const fixtureRoot = path.resolve(__dirname, '../../tests/fixtures/mobile');
// Temporary standalone package until Mingpham lands the pnpm workspace.
config.watchFolders = [fixtureRoot];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const allowFixtures = context.dev || process.env.EXPO_PUBLIC_APP_MODE === 'demo';
  // A runtime __DEV__ guard alone does not remove modules from Metro's graph.
  if (!allowFixtures && moduleName.endsWith('/features/preview/preview-shell')) {
    return {type: 'sourceFile', filePath: path.resolve(__dirname, 'src/features/preview/preview-disabled.tsx')};
  }
  const resolved = context.resolveRequest(context, moduleName, platform);
  if (!allowFixtures && resolved.type === 'sourceFile' && resolved.filePath.startsWith(fixtureRoot + path.sep)) {
    throw new Error('UI fixtures must never be included in release bundles.');
  }
  return resolved;
};
module.exports = withNativeWind(config, { input: './global.css' });
