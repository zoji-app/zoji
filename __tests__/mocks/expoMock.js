// Shared mock for expo-notifications, expo-device, and expo-task-manager.
// moduleNameMapper in jest.config.js points all three to this file.
// Do NOT call jest.mock() here — the mapper already handles routing so any
// internal jest.mock() call would override it and create a second, different
// object that source code gets while tests get module.exports (causing failures).

module.exports = {
  // Tells _interopRequireWildcard to return this object directly (not wrap it).
  // This ensures that `Device.isDevice = false` in a test propagates to
  // the source code's `import * as Device from 'expo-device'`.
  __esModule: true,

  // ── expo (general) ────────────────────────────────────────────────────────
  useFonts: () => [true, null],
  isRunningInExpoGo: jest.fn(() => false),

  // ── expo-notifications ────────────────────────────────────────────────────
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: 'ExponentPushToken[test]' })
  ),
  getDevicePushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: 'DEVICE_PUSH_TOKEN' })
  ),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  registerTaskAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },

  // ── expo-device ───────────────────────────────────────────────────────────
  isDevice: true,
  brand: 'Apple',
  manufacturer: 'Apple',
  modelName: 'iPhone',
  osName: 'iOS',
  osVersion: '17.0',

  // ── expo-task-manager ─────────────────────────────────────────────────────
  isTaskDefined: jest.fn(() => false),
  defineTask: jest.fn(),
};

// expo-navigation-bar is also mapped to this file via moduleNameMapper.
// No jest.mock() needed here — the mapper already routes to this module.
// Add navigation-bar functions here so they're available when that module is imported:
// (they're in module.exports above via setBackgroundColorAsync etc. if needed)
