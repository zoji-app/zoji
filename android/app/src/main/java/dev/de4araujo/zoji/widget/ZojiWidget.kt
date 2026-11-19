package dev.de4araujo.zoji.widget

import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.ContentScale
import androidx.glance.layout.Row
import androidx.glance.layout.RowScope
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.*
import dev.de4araujo.zoji.R
import org.json.JSONObject

// ── Data models ────────────────────────────────────────────────────────────────

data class WidgetFriend(
    val userId: Int,
    val nickname: String,
    val statusEmoji: String,
    val profileEmoji: String,
)

data class WidgetPayload(
    val ownEmoji: String?,
    val friends: List<WidgetFriend>,
)

// ── Colors / sizes ─────────────────────────────────────────────────────────────

// Espelha as cores claro/escuro do app (theme/colors.ts). Por padrão o widget
// segue o tema do sistema; se o usuário fixar Claro/Escuro em Configurações
// (ThemeContext, via ZojiWidgetModule.setThemeMode), essa escolha manda.
data class WidgetPalette(
    val background: Color,
    val headerTitle: Color,
    val label: Color,
    val secondaryText: Color,
    val placeholder: Color,
)

private val lightPalette = WidgetPalette(
    background    = Color.White,
    headerTitle   = Color(0xB2000000),
    label         = Color(0xFF555555),
    secondaryText = Color(0xFF888888),
    placeholder   = Color(0x8C888888),
)

private val darkPalette = WidgetPalette(
    background    = Color(0xFF1C1C1E),
    headerTitle   = Color(0xCCF2F2F7),
    label         = Color(0xFFC7C7CC),
    secondaryText = Color(0xFF98989F),
    placeholder   = Color(0x8C98989F),
)

// Mesmo navy de zojiColors.cardBackground (theme/colors.ts) — idêntico ao
// já aprovado dentro do app, sem variação própria pro widget (ver
// ZojiWidget.swift: um teste com vermelho puro no iOS confirmou que a cor
// literal renderiza fiel, sem sombra/tinta do sistema por cima). Texto
// reaproveita o darkPalette (claro sobre fundo escuro funciona igual sobre
// navy).
private val zojiPalette = darkPalette.copy(background = Color(0xFF16224D))

private fun resolvePalette(context: Context): WidgetPalette {
    val mode = context
        .getSharedPreferences("zoji_widget", Context.MODE_PRIVATE)
        .getString("theme_mode", null)
    return when (mode) {
        "zoji"  -> zojiPalette
        "dark"  -> darkPalette
        "light" -> lightPalette
        else    -> {
            val isDark = (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
                Configuration.UI_MODE_NIGHT_YES
            if (isDark) darkPalette else lightPalette
        }
    }
}

// ── GlanceAppWidget ────────────────────────────────────────────────────────────

class ZojiWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        android.util.Log.d("ZojiWidget", "provideGlance start")
        val payload = try { loadPayload(context) } catch (e: Exception) {
            android.util.Log.e("ZojiWidget", "loadPayload error", e)
            null
        }
        android.util.Log.d("ZojiWidget", "payload=$payload")
        val palette = resolvePalette(context)
        try {
            provideContent { ZojiWidgetContent(payload, palette) }
        } catch (e: Exception) {
            android.util.Log.e("ZojiWidget", "provideContent error", e)
            provideContent {
                Box(modifier = GlanceModifier.fillMaxSize()) {
                    Text("Erro: ${e.javaClass.simpleName}")
                }
            }
        }
    }

    private fun loadPayload(context: Context): WidgetPayload? = try {
        val prefs = context.getSharedPreferences("zoji_widget", Context.MODE_PRIVATE)
        val json  = prefs.getString("zoji_widget_status", null) ?: return null
        val obj   = JSONObject(json)
        val ownEmoji = if (obj.isNull("ownEmoji")) null
                       else obj.optString("ownEmoji").ifEmpty { null }
        val arr   = obj.getJSONArray("friends")
        val friends = (0 until arr.length()).map {
            val f = arr.getJSONObject(it)
            WidgetFriend(
                userId       = f.getInt("userId"),
                nickname     = f.getString("nickname"),
                statusEmoji  = f.getString("statusEmoji"),
                profileEmoji = f.getString("profileEmoji"),
            )
        }
        WidgetPayload(ownEmoji = ownEmoji, friends = friends)
    } catch (_: Exception) { null }
}

// ── Widget content ─────────────────────────────────────────────────────────────
// ZStack: círculos preenchem a altura total, header (título + logo) em overlay no topo.
// Funciona para 0–4 amigos sem layouts separados.

@Composable
fun ZojiWidgetContent(payload: WidgetPayload?, palette: WidgetPalette) {
    if (payload == null) {
        ZojiWidgetLoggedOut(palette)
        return
    }
    val friends    = payload.friends.take(4)
    val totalItems = 1 + friends.size
    val widgetSize = LocalSize.current
    val availableHeight = (widgetSize.height.value - 24f).coerceAtLeast(44f)
    val availableWidth  = (widgetSize.width.value  - 12f) / totalItems.toFloat()
    val cSize = minOf(availableWidth * 0.88f, availableHeight).coerceIn(44f, 120f).dp

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(palette.background))
            .cornerRadius(16.dp),
    ) {
        // Layer 1 (fundo): círculos centralizados com padding no topo para o header
        Row(
            modifier          = GlanceModifier
                .fillMaxSize()
                .padding(top = 18.dp, start = 6.dp, end = 6.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            EmojiCircle(
                emoji    = payload.ownEmoji,
                label    = "Você",
                size     = cSize,
                deepLink = "zoji://",
                palette  = palette,
            )
            for (friend in friends) {
                EmojiCircle(
                    emoji    = friend.statusEmoji,
                    label    = friend.nickname,
                    size     = cSize,
                    deepLink = friendDeepLink(friend),
                    palette  = palette,
                )
            }
            if (friends.isEmpty()) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier         = GlanceModifier.defaultWeight(),
                ) {
                    Text(
                        text  = "Nenhum amigo\ncom status ativo",
                        style = TextStyle(
                            fontSize  = 10.sp,
                            color     = ColorProvider(palette.secondaryText),
                            textAlign = TextAlign.Center,
                        ),
                    )
                }
            }
        }

        // Layer 2 (frente): header em overlay — título à esquerda, logo à direita
        Row(
            modifier          = GlanceModifier
                .fillMaxWidth()
                .padding(top = 2.dp, start = 12.dp, end = 0.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text     = "Status Zoji",
                style    = TextStyle(
                    fontSize   = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color      = ColorProvider(palette.headerTitle),
                ),
                modifier = GlanceModifier.defaultWeight(),
            )
            Image(
                provider           = ImageProvider(R.drawable.zoji_logo),
                contentDescription = "Zoji",
                contentScale       = ContentScale.Crop,
                modifier           = GlanceModifier.size(50.dp).cornerRadius(12.dp),
            )
        }
    }
}

// ── Logged-out state ───────────────────────────────────────────────────────────

@Composable
private fun ZojiWidgetLoggedOut(palette: WidgetPalette) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(palette.background))
            .cornerRadius(16.dp),
    ) {
        // Center: logo + message
        Box(
            contentAlignment = Alignment.Center,
            modifier         = GlanceModifier.fillMaxSize().padding(top = 20.dp),
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Image(
                    provider           = ImageProvider(R.drawable.zoji_logo),
                    contentDescription = "Zoji",
                    contentScale       = ContentScale.Crop,
                    modifier           = GlanceModifier.size(40.dp).cornerRadius(10.dp),
                )
                Text(
                    text  = "Faça login no app\npara ver os status",
                    style = TextStyle(
                        fontSize  = 11.sp,
                        color     = ColorProvider(palette.secondaryText),
                        textAlign = TextAlign.Center,
                    ),
                    modifier = GlanceModifier.padding(top = 6.dp),
                )
            }
        }
        // Header overlay
        Row(
            modifier          = GlanceModifier
                .fillMaxWidth()
                .padding(top = 2.dp, start = 12.dp, end = 0.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text     = "Status Zoji",
                style    = TextStyle(
                    fontSize   = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color      = ColorProvider(palette.headerTitle),
                ),
                modifier = GlanceModifier.defaultWeight(),
            )
            Image(
                provider           = ImageProvider(R.drawable.zoji_logo),
                contentDescription = "Zoji",
                contentScale       = ContentScale.Crop,
                modifier           = GlanceModifier.size(50.dp).cornerRadius(12.dp),
            )
        }
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

private fun friendDeepLink(friend: WidgetFriend) =
    "zoji://open-chat" +
    "?userId=${friend.userId}" +
    "&nickname=${Uri.encode(friend.nickname)}" +
    "&profileEmoji=${Uri.encode(friend.profileEmoji)}"

@Composable
fun RowScope.EmojiCircle(
    emoji: String?,
    label: String,
    size: Dp,
    deepLink: String,
    palette: WidgetPalette,
) {
    val emojiFont = (size.value * 0.68f).sp
    val labelFont = if (size.value < 70f) 10.sp else 12.sp

    val action = actionStartActivity(
        Intent(Intent.ACTION_VIEW, Uri.parse(deepLink))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier            = GlanceModifier.defaultWeight().clickable(action),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier         = GlanceModifier.size(size),
        ) {
            if (emoji != null) {
                Text(text = emoji, style = TextStyle(fontSize = emojiFont))
            } else {
                Text(
                    text  = "+",
                    style = TextStyle(
                        fontSize = (size.value * 0.28f).sp,
                        color    = ColorProvider(palette.placeholder),
                    ),
                )
            }
        }
        Text(
            text     = label,
            style    = TextStyle(
                fontSize   = labelFont,
                fontWeight = FontWeight.Medium,
                color      = ColorProvider(palette.label),
                textAlign  = TextAlign.Center,
            ),
            maxLines = 2,
            modifier = GlanceModifier.padding(top = 3.dp),
        )
    }
}
