// Mock para o serviço de notificações
const notificationsMock = {
  BACKGROUND_NOTIFICATION_TASK: 'BACKGROUND-NOTIFICATION-TASK',

  registerBackgroundNotificationsAsync: jest.fn().mockResolvedValue(undefined),

  registerForPushNotificationsAsync: jest.fn().mockImplementation(userId => {
    if (!require('expo-device').isDevice) {
      return Promise.resolve(undefined);
    }

    const permissionsStatus = require('expo-notifications')
      .getPermissionsAsync()
      .then(res => res.status);

    if (permissionsStatus === 'denied') {
      return Promise.resolve(undefined);
    }

    return Promise.resolve('ExponentPushToken[test-token]');
  }),

  sendPushNotification: jest.fn().mockResolvedValue(undefined),

  sendNewMessageNotification: jest.fn().mockResolvedValue(undefined),

  setupNotificationListeners: jest.fn().mockReturnValue({
    notificationListener: 'notification-listener',
    responseListener: 'response-listener',
  }),

  getLastNotificationToken: jest.fn().mockImplementation(() => {
    return require('@react-native-async-storage/async-storage').getItem(
      '@psiu_push_token'
    );
  }),

  registerPushToken: jest.fn().mockResolvedValue(undefined),
};

module.exports = notificationsMock;
