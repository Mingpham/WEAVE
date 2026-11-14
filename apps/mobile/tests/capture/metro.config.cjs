const path = require('node:path');
const fs = require('node:fs');
const {getDefaultConfig} = require('expo/metro-config');
const {withNativeWind} = require('nativewind/metro');
const mobile = path.resolve(__dirname, '../..');
const repo = path.resolve(mobile, '../..');
const rootModules = path.join(repo, 'node_modules');
const config = getDefaultConfig(__dirname);
config.watchFolders = [mobile, path.join(repo, 'tests/fixtures/mobile'), path.join(repo, 'packages'), ...(fs.existsSync(rootModules) ? [rootModules] : [])];
config.resolver.nodeModulesPaths = [path.join(mobile, 'node_modules')];
const escaped = mobile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [new RegExp('^' + escaped + '[/\\\\](?:\\.cache|artifacts|android|dist)[/\\\\]')];
// This is a separate, fixture-only capture entry. Product Metro keeps its fixture guard unchanged.
module.exports = withNativeWind(config, {input: path.join(mobile, 'global.css'), configPath: path.join(__dirname, 'tailwind.config.cjs')});
