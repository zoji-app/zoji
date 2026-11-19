package dev.de4araujo.zoji.widget

import android.content.Context
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class StatusRefreshWorker(
    private val appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val prefs = appContext.getSharedPreferences("zoji_widget", Context.MODE_PRIVATE)
        val refreshToken = prefs.getString("refresh_token", null) ?: return Result.success()
        val apiBase      = prefs.getString("api_base_url", "https://api.zoji.app")!!

        return try {
            val accessToken = fetchNewAccessToken(apiBase, refreshToken) ?: return Result.success()
            val widgetJson  = fetchAndMapStatus(apiBase, accessToken)   ?: return Result.success()

            // Re-verifica token antes de escrever — evita sobrescrever clearStatus() em race condition
            if (prefs.getString("refresh_token", null) == null) return Result.success()

            prefs.edit().putString("zoji_widget_status", widgetJson).commit()

            val manager = GlanceAppWidgetManager(appContext)
            manager.getGlanceIds(ZojiWidget::class.java).forEach {
                ZojiWidget().update(appContext, it)
            }
            android.util.Log.d("StatusRefreshWorker", "widget updated via background push")
            Result.success()
        } catch (e: Exception) {
            android.util.Log.e("StatusRefreshWorker", "refresh failed", e)
            Result.success()
        }
    }

    private fun fetchNewAccessToken(base: String, refreshToken: String): String? {
        val conn = (URL("$base/auth/refresh").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            connectTimeout = 10_000
            readTimeout    = 10_000
            doOutput       = true
        }
        conn.outputStream.use { it.write("""{"refresh_token":"$refreshToken"}""".toByteArray()) }
        if (conn.responseCode != 200) return null
        return JSONObject(conn.inputStream.bufferedReader().readText()).optString("access_token").ifEmpty { null }
    }

    private fun fetchAndMapStatus(base: String, token: String): String? {
        val conn = (URL("$base/status/friends").openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            setRequestProperty("Authorization", "Bearer $token")
            connectTimeout = 10_000
            readTimeout    = 10_000
        }
        if (conn.responseCode != 200) return null
        val root = JSONObject(conn.inputStream.bufferedReader().readText())

        val widgetObj     = JSONObject()
        val ownEmoji      = root.optJSONObject("own")?.optString("emoji")
        widgetObj.put("ownEmoji", if (ownEmoji.isNullOrEmpty()) JSONObject.NULL else ownEmoji)

        val apiFriends    = root.optJSONArray("friends") ?: JSONArray()
        val widgetFriends = JSONArray()
        for (i in 0 until apiFriends.length()) {
            val f  = apiFriends.getJSONObject(i)
            val wf = JSONObject()
            wf.put("userId",      f.getInt("userId"))
            wf.put("nickname",    f.optString("nickname",    ""))
            wf.put("statusEmoji", f.optString("statusEmoji", ""))
            wf.put("profileEmoji",f.optString("profileEmoji",""))
            widgetFriends.put(wf)
        }
        widgetObj.put("friends", widgetFriends)
        return widgetObj.toString()
    }
}
