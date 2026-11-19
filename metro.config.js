// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Adicionar extensão .cjs para compatibilidade com Firebase
config.resolver.sourceExts.push('cjs');

// Desabilitar package exports para corrigir problema com Firebase Auth no Expo SDK 53
// Ref: https://github.com/expo/expo/discussions/36551
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
