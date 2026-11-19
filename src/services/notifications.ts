import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import { logger } from '../utils/logger';
import { authApi } from './authApi';
import { refreshAccessToken } from './apiClient';
import { statusApi } from './statusApi';
import { syncWidgetStatus } from './widgetService';

export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

// Deve ser definido no escopo do módulo (não dentro de função) para que o iOS
// consiga chamar o handler quando o app está em background ou suspenso.
TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  async ({ data, error }: { data: any; error: any }) => {
    if (error) {
      logger.error('[BgTask] Erro na tarefa em background:', error);
      return;
    }
    if (!data) return;

    const { notification } = data as {
      notification: Notifications.Notification;
    };
    const body = notification?.request?.content?.data as Record<
      string,
      unknown
    > | null;

    if (body?.type === 'STATUS_UPDATED') {
      try {
        // O token em memória é perdido quando o processo é suspenso — renova via refresh token
        await refreshAccessToken();
        const statusData = await statusApi.getFriends();
        syncWidgetStatus(statusData.own, statusData.friends);
        logger.debug('[BgTask] Widget atualizado via push silencioso');
      } catch (e) {
        logger.error('[BgTask] Erro ao atualizar widget:', e);
      }
    }
  }
);

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerBackgroundNotificationsAsync() {
  try {
    if (__DEV__) {
      logger.debug(
        '[BgTask] Dev mode — saltando registro de tarefa em background.'
      );
      return;
    }

    logger.debug('[BgTask] Registrando tarefa de notificação em background...');
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    logger.debug('[BgTask] Tarefa registrada com sucesso');
  } catch (error) {
    logger.error('[BgTask] Erro ao registrar tarefa em background:', error);
  }
}

// Registrar para notificações push
export async function registerForPushNotificationsAsync(_userId: string) {
  try {
    // SDK 53+: push remoto no Android foi removido do Expo Go (só funciona
    // em dev build ou produção). Além de getDevicePushTokenAsync() lançar um
    // erro fatal lá dentro especificamente no Android, até a criação de canal
    // de notificação (setNotificationChannelAsync) rejeita com NPE nesse
    // ambiente — então pulamos o bloco inteiro antes de tentar qualquer coisa.
    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
      logger.debug(
        '[Notifications] Expo Go no Android não suporta push remoto (SDK 53+) — pulando registro.'
      );
      return null;
    }

    if (Platform.OS === 'android') {
      // Canal principal — deve corresponder ao channel_id enviado pelo backend FCM
      await Notifications.setNotificationChannelAsync('zoji-messages', {
        name: 'Mensagens Zoji',
        description: 'Notificações de novas mensagens',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });
      await Notifications.setNotificationChannelAsync('zoji-contacts', {
        name: 'Solicitações de Contato',
        description: 'Notificações de solicitações de contato',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
      // Canal genérico mantido por compatibilidade
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Zoji',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });
    }

    if (!Device.isDevice) return null;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      logger.warn(`[Notifications] Permissão negada (status=${status})`);
      return null;
    }

    const deviceToken = await Notifications.getDevicePushTokenAsync();
    if (!deviceToken?.data) {
      logger.error('[Notifications] getDevicePushTokenAsync retornou vazio');
      return null;
    }

    const token =
      Platform.OS === 'ios'
        ? `apns:${deviceToken.data}`
        : `fcm:${deviceToken.data}`;

    logger.debug(`[Notifications] Token obtido: ${token.substring(0, 30)}...`);
    const appVersion =
      Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null;
    await authApi.updateProfile({
      push_token: token,
      ...(appVersion ? { app_version: appVersion } : {}),
    });
    logger.debug('[Notifications] Push token salvo no servidor');
    return token;
  } catch (error) {
    logger.error('[Notifications] Erro ao registrar token:', error);
    return null;
  }
}

// Configurar listeners de notificação
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  logger.debug('[Notifications] Configurando listeners de notificação');

  try {
    // Listener para notificações recebidas em primeiro plano
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      notification => {
        logger.debug(
          '[Notifications] Notificação recebida em primeiro plano:',
          notification.request.identifier,
          notification.request.content.title,
          notification.request.content.body
        );

        try {
          onNotificationReceived(notification);
        } catch (callbackError) {
          logger.error(
            '[Notifications] Erro no callback de notificação recebida:',
            callbackError
          );
        }
      }
    );

    // Listener para respostas às notificações (quando o usuário clica)
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(response => {
        logger.debug(
          '[Notifications] Resposta à notificação recebida:',
          response.notification.request.identifier,
          response.notification.request.content.title
        );

        try {
          onNotificationResponse(response);
        } catch (callbackError) {
          logger.error(
            '[Notifications] Erro no callback de resposta à notificação:',
            callbackError
          );
        }
      });

    logger.debug(
      '[Notifications] Listeners de notificação configurados com sucesso'
    );

    // Retornar função para desinscrever os listeners
    return () => {
      logger.debug('[Notifications] Removendo listeners de notificação');
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  } catch (error) {
    logger.error(
      '[Notifications] Erro ao configurar listeners de notificação:',
      error as Error
    );
    // Retornar uma função vazia para evitar erros
    return () => {};
  }
}

export async function registerPushToken(userId: string, _context = 'geral') {
  try {
    await registerForPushNotificationsAsync(userId);
    return true;
  } catch (error) {
    logger.error('[Notifications] Erro ao registrar token:', error as Error);
    return false;
  }
}
