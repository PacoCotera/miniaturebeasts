const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// The signed art is read straight from the game repo's art folder (never copied or drawn here).
const repoRoot = path.resolve(__dirname, '../..');

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = {
  watchFolders: [path.join(repoRoot, 'art')],
  resolver: { nodeModulesPaths: [path.join(__dirname, 'node_modules')] },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
