const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
// These folders contain toolchains and package stores, never app source.
const existingBlocks = config.resolver.blockList;
const escapedRoot = __dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  ...(Array.isArray(existingBlocks) ? existingBlocks : existingBlocks ? [existingBlocks] : []),
  new RegExp('^' + escapedRoot + '[/\\\\](?:\\.cache|\\.expo|dist|dist-demo|artifacts)[/\\\\]'),
];
const fixtureRoot = path.resolve(__dirname, '../../tests/fixtures/mobile');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolved = context.resolveRequest(context, moduleName, platform);
  if (resolved.type === 'sourceFile' && resolved.filePath.startsWith(fixtureRoot + path.sep)) {
    throw new Error('Test fixtures cannot be imported by the product app.');
  }
  return resolved;
};
module.exports = withNativeWind(config, { input: './global.css' });
