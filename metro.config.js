const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .js and .json to specifically help resolve modules that omit extensions in node_modules
config.resolver.sourceExts.push('js', 'json', 'ts', 'tsx');

module.exports = config;
