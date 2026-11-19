package dev.de4araujo.zoji

import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.google.firebase.messaging.RemoteMessage
import dev.de4araujo.zoji.widget.StatusRefreshWorker
import expo.modules.notifications.service.ExpoFirebaseMessagingService

/**
 * Estende ExpoFirebaseMessagingService para interceptar data-only FCM messages (app morto).
 * Registrado no manifest com priority=1 (maior que o -1 do Expo), então recebe a mensagem
 * primeiro. Chama super para não quebrar o fluxo de notificações do Expo.
 */
class ZojiFirebaseMessagingService : ExpoFirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        if (message.data["type"] == "STATUS_UPDATED") {
            WorkManager.getInstance(applicationContext)
                .enqueue(OneTimeWorkRequestBuilder<StatusRefreshWorker>().build())
        }
    }
}
