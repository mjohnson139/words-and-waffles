// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'e2e/artifacts/*'],
  },
  {
    // Pure modules must stay pure: no React, no React Native, no Expo.
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-native', 'react-native-*', 'expo', 'expo-*', '@react-native-*/*'] },
      ],
    },
  },
]);
