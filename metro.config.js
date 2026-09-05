const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite runs as WebAssembly on web, which Metro does not bundle by default.
// Native builds ignore this; it exists so the app can be exercised in a browser.
config.resolver.assetExts.push('wasm');

module.exports = config;
