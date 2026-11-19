package dev.de4araujo.zoji

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import dev.de4araujo.zoji.widget.ZojiWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import dev.de4araujo.zoji.widget.StatusRefreshWorker

class ZojiWidgetModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ZojiWidgetModule"

    @ReactMethod
    fun saveCredentials(refreshToken: String, apiBaseUrl: String) {
        reactContext.applicationContext
            .getSharedPreferences("zoji_widget", Context.MODE_PRIVATE)
            .edit()
            .putString("refresh_token", refreshToken)
            .putString("api_base_url", apiBaseUrl)
            .apply()
    }

    // "system" | "light" | "dark" — espelha a escolha do usuário em
    // Configurações (ThemeContext) pro widget, que por padrão só segue o
    // tema do sistema. "system" (ou ausente) mantém esse comportamento.
    @ReactMethod
    fun setThemeMode(mode: String) {
        val context = reactContext.applicationContext
        context.getSharedPreferences("zoji_widget", Context.MODE_PRIVATE)
            .edit()
            .putString("theme_mode", mode)
            .commit()  // synchronous — mesmo motivo de updateStatus()/clearStatus():
                        // o update() logo abaixo precisa ler o valor já persistido,
                        // não uma escrita apply() ainda em voo (achado em teste manual
                        // — a cor do widget não acompanhava a troca de tema).

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val ids = GlanceAppWidgetManager(context).getGlanceIds(ZojiWidget::class.java)
                ids.forEach { ZojiWidget().update(context, it) }
            } catch (e: Exception) {
                android.util.Log.e("ZojiWidget", "setThemeMode update failed", e)
            }
        }
    }

    @ReactMethod
    fun clearStatus() {
        val context = reactContext.applicationContext
        context.getSharedPreferences("zoji_widget", Context.MODE_PRIVATE)
            .edit()
            .remove("zoji_widget_status")
            .remove("refresh_token")
            .commit()  // synchronous — widget must read cleared data, not stale cache

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val ids = GlanceAppWidgetManager(context).getGlanceIds(ZojiWidget::class.java)
                ids.forEach { ZojiWidget().update(context, it) }
            } catch (e: Exception) {
                android.util.Log.e("ZojiWidget", "clearStatus update failed", e)
            }
        }
    }

    @ReactMethod
    fun updateStatus(jsonString: String) {
        val context = reactContext.applicationContext
        context.getSharedPreferences("zoji_widget", Context.MODE_PRIVATE)
            .edit()
            .putString("zoji_widget_status", jsonString)
            .commit()  // synchronous — ensures data is persisted before Glance reads it

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val ids = GlanceAppWidgetManager(context)
                    .getGlanceIds(ZojiWidget::class.java)
                ids.forEach { ZojiWidget().update(context, it) }
                android.util.Log.d("ZojiWidget", "updated ${ids.size} widget(s)")
            } catch (e: Exception) {
                android.util.Log.e("ZojiWidget", "update failed", e)
            }
        }
    }
}
