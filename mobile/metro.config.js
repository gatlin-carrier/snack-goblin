const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const sharedDir = path.resolve(projectRoot, '../shared');

const config = getDefaultConfig(projectRoot);

// Allow Metro to resolve modules from the shared/ sibling directory
config.watchFolders = [sharedDir];

module.exports = withNativeWind(config, { input: './global.css' });
