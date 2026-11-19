// ─── Mocks ──────────────────────────────────────────────────────────────────
// expo-notifications, expo-device, expo-task-manager are all handled by
// moduleNameMapper → expoMock.js. We only mock our own dependencies here.

jest.mock('../../src/services/authApi', () => ({
  authApi: { updateProfile: jest.fn().mockResolvedValue({}) },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Sobrescreve o mock genérico de expo-constants (moduleNameMapper) só neste
// arquivo — precisamos mutar appOwnership entre testes (ver guarda do
// Expo Go no Android, SDK 53+).
jest.mock('expo-constants', () => ({ appOwnership: null }));

// ─── Imports ─────────────────────────────────────────────────────────────────

const { Platform } = require('react-native');
// These are the expoMock.js objects that notifications.ts references at runtime:
const Notifications = require('expo-notifications');
const Device = require('expo-device');
const Constants = require('expo-constants');
const { authApi } = require('../../src/services/authApi');

const {
  configureNotificationHandler,
  registerForPushNotificationsAsync,
  registerBackgroundNotificationsAsync,
  setupNotificationListeners,
  registerPushToken,
} = require('../../src/services/notifications');

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Restore defaults after each test
  Platform.OS = 'ios';
  Device.isDevice = true;
  Constants.appOwnership = null;
});

// ─── configureNotificationHandler ───────────────────────────────────────────

describe('configureNotificationHandler', () => {
  it('calls setNotificationHandler once', () => {
    configureNotificationHandler();
    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });

  it('handler resolves with all display flags true', async () => {
    configureNotificationHandler();
    const [{ handleNotification }] =
      Notifications.setNotificationHandler.mock.calls[0];
    const opts = await handleNotification();
    expect(opts.shouldShowAlert).toBe(true);
    expect(opts.shouldPlaySound).toBe(true);
    expect(opts.shouldSetBadge).toBe(true);
    expect(opts.shouldShowBanner).toBe(true);
    expect(opts.shouldShowList).toBe(true);
  });
});

// ─── registerForPushNotificationsAsync — iOS ─────────────────────────────────

describe('registerForPushNotificationsAsync — iOS (physical device)', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
    Device.isDevice = true;
  });

  it('returns apns: prefixed token', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: 'APNS_TOKEN',
    });

    const token = await registerForPushNotificationsAsync('user-1');

    expect(token).toBe('apns:APNS_TOKEN');
  });

  it('a guarda do Expo Go não se aplica no iOS — continua tentando registrar', async () => {
    Constants.appOwnership = 'expo';
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: 'APNS_TOKEN',
    });

    const token = await registerForPushNotificationsAsync('user-1');

    expect(token).toBe('apns:APNS_TOKEN');
  });

  it('saves token to server via authApi.updateProfile', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: 'APNS_TOKEN',
    });

    await registerForPushNotificationsAsync('user-1');

    expect(authApi.updateProfile).toHaveBeenCalledWith({
      push_token: 'apns:APNS_TOKEN',
    });
  });

  it('does not create Android notification channels on iOS', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: 'TOKEN',
    });

    await registerForPushNotificationsAsync('user-1');

    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('returns null when permission is denied', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
    });

    const token = await registerForPushNotificationsAsync('user-1');

    expect(token).toBeNull();
    expect(authApi.updateProfile).not.toHaveBeenCalled();
  });

  it('returns null when getDevicePushTokenAsync returns no data', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({ data: null });

    const token = await registerForPushNotificationsAsync('user-1');

    expect(token).toBeNull();
  });

  it('returns null on simulator (Device.isDevice = false)', async () => {
    Device.isDevice = false;

    const token = await registerForPushNotificationsAsync('user-1');

    expect(token).toBeNull();
    expect(authApi.updateProfile).not.toHaveBeenCalled();
  });

  it('returns null and does not throw on unexpected error', async () => {
    Notifications.requestPermissionsAsync.mockRejectedValueOnce(
      new Error('Native crash')
    );

    const token = await registerForPushNotificationsAsync('user-1');

    expect(token).toBeNull();
  });
});

// ─── registerForPushNotificationsAsync — Android ─────────────────────────────

describe('registerForPushNotificationsAsync — Android (physical device)', () => {
  beforeEach(() => {
    Platform.OS = 'android';
    Device.isDevice = true;
  });

  it('returns fcm: prefixed token', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: 'FCM_TOKEN',
    });

    const token = await registerForPushNotificationsAsync('user-1');

    expect(token).toBe('fcm:FCM_TOKEN');
  });

  it('returns null and skips getDevicePushTokenAsync inside Expo Go (SDK 53+ regressão)', async () => {
    Constants.appOwnership = 'expo';

    const token = await registerForPushNotificationsAsync('user-1');

    expect(token).toBeNull();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
    // Regressão: criar canal de notificação também rejeita com NPE dentro do
    // Expo Go no Android (ExpoNotificationChannelManager sem provider real) —
    // não faz sentido tentar de qualquer forma, já que push não vai funcionar.
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('creates zoji-messages channel with MAX importance', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: 'TOKEN',
    });

    await registerForPushNotificationsAsync('user-1');

    const channelIds = Notifications.setNotificationChannelAsync.mock.calls.map(
      ([id]) => id
    );
    expect(channelIds).toContain('zoji-messages');

    const messagesCall =
      Notifications.setNotificationChannelAsync.mock.calls.find(
        ([id]) => id === 'zoji-messages'
      );
    expect(messagesCall[1].importance).toBe(5); // AndroidImportance.MAX
    expect(messagesCall[1].enableVibrate).toBe(true);
    expect(messagesCall[1].showBadge).toBe(true);
  });

  it('creates zoji-contacts and default channels', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: 'TOKEN',
    });

    await registerForPushNotificationsAsync('user-1');

    const channelIds = Notifications.setNotificationChannelAsync.mock.calls.map(
      ([id]) => id
    );
    expect(channelIds).toContain('zoji-contacts');
    expect(channelIds).toContain('default');
  });

  it('saves fcm: token to server', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: 'FCM_TOKEN',
    });

    await registerForPushNotificationsAsync('user-1');

    expect(authApi.updateProfile).toHaveBeenCalledWith({
      push_token: 'fcm:FCM_TOKEN',
    });
  });
});

// ─── Token prefix contract ────────────────────────────────────────────────────
// Regression: ensures the apns:/fcm: prefixes are always correct.
// The backend strips these prefixes to route to APNs or FCM.

describe('token prefix contract', () => {
  beforeEach(() => {
    Device.isDevice = true;
  });

  it('iOS token always starts with "apns:"', async () => {
    Platform.OS = 'ios';
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: 'some-token',
    });

    const token = await registerForPushNotificationsAsync('user-1');
    expect(token).toMatch(/^apns:/);
  });

  it('Android token always starts with "fcm:"', async () => {
    Platform.OS = 'android';
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: 'some-token',
    });

    const token = await registerForPushNotificationsAsync('user-1');
    expect(token).toMatch(/^fcm:/);
  });

  it('token body after prefix equals raw device token exactly', async () => {
    Platform.OS = 'ios';
    const rawToken = 'exact_device_token_value_abc123';
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: rawToken,
    });

    const token = await registerForPushNotificationsAsync('user-1');
    expect(token).toBe(`apns:${rawToken}`);
  });
});

// ─── registerBackgroundNotificationsAsync ────────────────────────────────────

describe('registerBackgroundNotificationsAsync', () => {
  it('returns without registering any task in __DEV__ mode', async () => {
    // jest.setup.js sets global.__DEV__ = true
    const TaskManager = require('expo-task-manager');

    await registerBackgroundNotificationsAsync();

    expect(TaskManager.isTaskDefined).not.toHaveBeenCalled();
    expect(TaskManager.defineTask).not.toHaveBeenCalled();
    expect(Notifications.registerTaskAsync).not.toHaveBeenCalled();
  });
});

// ─── setupNotificationListeners ──────────────────────────────────────────────

describe('setupNotificationListeners', () => {
  it('registers both received and response listeners', () => {
    const receivedCb = jest.fn();
    const responseCb = jest.fn();

    setupNotificationListeners(receivedCb, responseCb);

    expect(Notifications.addNotificationReceivedListener).toHaveBeenCalledTimes(
      1
    );
    expect(
      Notifications.addNotificationResponseReceivedListener
    ).toHaveBeenCalledTimes(1);
  });

  it('returns a cleanup function that removes both subscriptions', () => {
    const mockRemoveA = jest.fn();
    const mockRemoveB = jest.fn();
    Notifications.addNotificationReceivedListener.mockReturnValueOnce({
      remove: mockRemoveA,
    });
    Notifications.addNotificationResponseReceivedListener.mockReturnValueOnce({
      remove: mockRemoveB,
    });

    const cleanup = setupNotificationListeners(jest.fn(), jest.fn());
    cleanup();

    expect(mockRemoveA).toHaveBeenCalledTimes(1);
    expect(mockRemoveB).toHaveBeenCalledTimes(1);
  });

  it('invokes received callback with the notification object', () => {
    const receivedCb = jest.fn();
    setupNotificationListeners(receivedCb, jest.fn());

    const listenerFn =
      Notifications.addNotificationReceivedListener.mock.calls[0][0];
    const fakeNotification = {
      request: { identifier: 'id-1', content: { title: '👋', body: '' } },
    };
    listenerFn(fakeNotification);

    expect(receivedCb).toHaveBeenCalledWith(fakeNotification);
  });

  it('invokes response callback with the response object', () => {
    const responseCb = jest.fn();
    setupNotificationListeners(jest.fn(), responseCb);

    const listenerFn =
      Notifications.addNotificationResponseReceivedListener.mock.calls[0][0];
    const fakeResponse = {
      notification: {
        request: { identifier: 'id-2', content: { title: '💬', body: '' } },
      },
    };
    listenerFn(fakeResponse);

    expect(responseCb).toHaveBeenCalledWith(fakeResponse);
  });

  it('returns a no-op cleanup when listener registration throws', () => {
    Notifications.addNotificationReceivedListener.mockImplementationOnce(() => {
      throw new Error('Native error');
    });

    const cleanup = setupNotificationListeners(jest.fn(), jest.fn());
    expect(() => cleanup()).not.toThrow();
  });

  it('does not propagate errors thrown inside the received callback', () => {
    const crashingCb = jest.fn().mockImplementation(() => {
      throw new Error('callback crash');
    });
    setupNotificationListeners(crashingCb, jest.fn());

    const listenerFn =
      Notifications.addNotificationReceivedListener.mock.calls[0][0];
    expect(() =>
      listenerFn({
        request: { identifier: 'x', content: { title: '', body: '' } },
      })
    ).not.toThrow();
  });
});

// ─── registerPushToken ────────────────────────────────────────────────────────

describe('registerPushToken', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
    Device.isDevice = true;
  });

  it('returns true when registration succeeds', async () => {
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
    });
    Notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: 'TOKEN',
    });

    const result = await registerPushToken('user-42');
    expect(result).toBe(true);
  });

  it('returns true even when inner registration fails (errors are absorbed)', async () => {
    // registerForPushNotificationsAsync catches all errors and returns null.
    // registerPushToken does `await registerForPushNotificationsAsync()` and then
    // returns true — it does not check the return value.
    Notifications.requestPermissionsAsync.mockRejectedValueOnce(
      new Error('fail')
    );

    const result = await registerPushToken('user-42');
    expect(result).toBe(true);
  });
});
