import WidgetKit
import SwiftUI

// MARK: - Data models

struct WidgetFriend: Codable, Identifiable {
    let userId: Int
    let nickname: String
    let statusEmoji: String
    let profileEmoji: String

    var id: Int { userId }
    var firstName: String { nickname.components(separatedBy: " ").first ?? nickname }
}

struct WidgetPayload: Codable {
    let ownEmoji: String?
    let friends: [WidgetFriend]
    var loggedOut: Bool? = nil
}

// MARK: - Timeline

struct ZojiStatusEntry: TimelineEntry {
    let date: Date
    let ownEmoji: String?
    let friends: [WidgetFriend]
    let isLoggedOut: Bool

    static let preview = ZojiStatusEntry(
        date: .now,
        ownEmoji: "😊",
        friends: [
            WidgetFriend(userId: 1, nickname: "Ana Silva",   statusEmoji: "🎉", profileEmoji: "😎"),
            WidgetFriend(userId: 2, nickname: "Bruno Lima",  statusEmoji: "🔥", profileEmoji: "🤩"),
            WidgetFriend(userId: 3, nickname: "Carol",       statusEmoji: "🌟", profileEmoji: "😄"),
            WidgetFriend(userId: 4, nickname: "Diego Costa", statusEmoji: "💪", profileEmoji: "😏"),
        ],
        isLoggedOut: false
    )

    static let empty     = ZojiStatusEntry(date: .now, ownEmoji: nil, friends: [], isLoggedOut: false)
    static let loggedOut = ZojiStatusEntry(date: .now, ownEmoji: nil, friends: [], isLoggedOut: true)
}

// MARK: - API response models (usados apenas pelo provider)

private struct APIStatusResponse: Decodable {
    struct OwnStatus: Decodable { let emoji: String }
    struct Friend: Decodable {
        let userId: Int
        let nickname: String?
        let profileEmoji: String?
        let statusEmoji: String
    }
    let own: OwnStatus?
    let friends: [Friend]
}

// MARK: - Provider

struct ZojiStatusProvider: TimelineProvider {
    private let appGroup      = "group.dev.de4araujo.zoji"
    private let dataKey       = "zoji_widget_status"
    private let credentialKey = "widget_refresh_token"
    private let apiBase       = "https://api.zoji.app"

    private var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    private var savedRefreshToken: String? {
        let t = defaults?.string(forKey: credentialKey)
        return (t?.isEmpty == false) ? t : nil
    }

    func placeholder(in context: Context) -> ZojiStatusEntry { .preview }

    func getSnapshot(in context: Context, completion: @escaping (ZojiStatusEntry) -> Void) {
        completion(context.isPreview ? .preview : loadCachedEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ZojiStatusEntry>) -> Void) {
        guard let refreshToken = savedRefreshToken else {
            // Sem token = deslogado; tenta de novo em 5 min caso o UserDefaults ainda não tenha sincronizado
            let next = Calendar.current.date(byAdding: .minute, value: 5, to: .now) ?? .now
            completion(Timeline(entries: [.loggedOut], policy: .after(next)))
            return
        }

        Task {
            let result = await fetchEntry(refreshToken: refreshToken)
            switch result {
            case .loggedOut:
                // Token inválido/revogado — não tenta mais até o app chamar saveCredentials
                let next = Calendar.current.date(byAdding: .minute, value: 15, to: .now) ?? .now
                completion(Timeline(entries: [.loggedOut], policy: .after(next)))
            case .data(let entry):
                let next = Calendar.current.date(byAdding: .minute, value: 15, to: .now) ?? .now
                completion(Timeline(entries: [entry], policy: .after(next)))
            case .networkError:
                // Falha de rede — usa cache se disponível, tenta em 5 min
                let entry = loadCachedEntry()
                let next  = Calendar.current.date(byAdding: .minute, value: 5, to: .now) ?? .now
                completion(Timeline(entries: [entry], policy: .after(next)))
            }
        }
    }

    // ── Fetch com distinção entre auth failure e erro de rede ────────────────

    private enum FetchResult { case loggedOut, data(ZojiStatusEntry), networkError }

    private func fetchEntry(refreshToken: String) async -> FetchResult {
        guard let url = URL(string: "\(apiBase)/auth/refresh") else { return .networkError }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.timeoutInterval = 10
        req.httpBody = try? JSONEncoder().encode(["refresh_token": refreshToken])

        guard let (data, resp) = try? await URLSession.shared.data(for: req) else { return .networkError }
        let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 { return .loggedOut }
        guard let accessToken = (try? JSONDecoder().decode([String: String].self, from: data))?["access_token"]
        else { return .networkError }

        guard let statusURL = URL(string: "\(apiBase)/status/friends") else { return .networkError }
        var sreq = URLRequest(url: statusURL)
        sreq.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        sreq.timeoutInterval = 10
        guard let (sdata, sresp) = try? await URLSession.shared.data(for: sreq) else { return .networkError }
        if (sresp as? HTTPURLResponse)?.statusCode == 401 { return .loggedOut }
        guard let apiResp = try? JSONDecoder().decode(APIStatusResponse.self, from: sdata) else { return .networkError }

        let friends = apiResp.friends.map {
            WidgetFriend(userId: $0.userId, nickname: $0.nickname ?? "", statusEmoji: $0.statusEmoji, profileEmoji: $0.profileEmoji ?? "")
        }
        let payload = WidgetPayload(ownEmoji: apiResp.own?.emoji, friends: friends)

        // Atualiza cache
        if let encoded = try? JSONEncoder().encode(payload) {
            defaults?.set(encoded, forKey: dataKey)
        }
        return .data(ZojiStatusEntry(date: .now, ownEmoji: payload.ownEmoji, friends: payload.friends, isLoggedOut: false))
    }

    // ── Cache local ──────────────────────────────────────────────────────────

    private func loadCachedEntry() -> ZojiStatusEntry {
        guard
            let data    = defaults?.data(forKey: dataKey),
            let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data),
            payload.loggedOut != true
        else { return .empty }
        return ZojiStatusEntry(date: .now, ownEmoji: payload.ownEmoji, friends: payload.friends, isLoggedOut: false)
    }
}

// MARK: - Theme

// Espelha a escolha do usuário em Configurações (ThemeContext, via
// ZojiWidgetModule.setThemeMode) — "system"/ausente mantém o widget
// seguindo o tema do sistema, como sempre funcionou. "zoji" é visualmente
// escuro (mesmo texto claro que o modo escuro), mas com fundo navy próprio
// em vez do material adaptativo do sistema — ver widgetContainerBackground.
private func widgetThemeModeRaw() -> String? {
    UserDefaults(suiteName: "group.dev.de4araujo.zoji")?
        .string(forKey: "zoji_widget_theme_mode")
}

private func widgetPreferredColorScheme() -> ColorScheme? {
    switch widgetThemeModeRaw() {
    case "light":        return .light
    case "dark", "zoji": return .dark
    default:             return nil
    }
}

// Mesmo navy de zojiColors.cardBackground (theme/colors.ts) — idêntico ao
// já aprovado dentro do app, sem variação própria pro widget (um teste com
// vermelho puro confirmou que a cor literal renderiza fiel, sem nenhuma
// sombra/tinta do sistema por cima — a "cor errada" de antes era mesmo só
// o hex escolhido, não um bug de renderização).
private let zojiNavyBackground = Color(red: 0x16 / 255.0, green: 0x22 / 255.0, blue: 0x4D / 255.0)
// = darkColors.cardBackground (theme/colors.ts).
private let darkCardBackground = Color(red: 0x1C / 255.0, green: 0x1C / 255.0, blue: 0x1E / 255.0)

// ".background" (material do sistema) e preferredColorScheme() NÃO
// controlam esse material — ele segue a aparência real do aparelho,
// ignorando a escolha do usuário no app (achado em teste manual: trocar
// pra "Claro" no app não deixava o widget branco, só quando o sistema
// virava claro sozinho mais tarde). Por isso "light"/"dark"/"zoji" usam
// cor literal; só "system"/ausente usa o material do sistema de propósito
// — é o único caso em que faz sentido seguir o aparelho de verdade.
private func widgetContainerBackground() -> AnyShapeStyle {
    switch widgetThemeModeRaw() {
    case "light": return AnyShapeStyle(Color.white)
    case "dark":  return AnyShapeStyle(darkCardBackground)
    case "zoji":  return AnyShapeStyle(zojiNavyBackground)
    default:      return AnyShapeStyle(.background)
    }
}

private func widgetPlainBackground() -> Color {
    switch widgetThemeModeRaw() {
    case "light": return Color.white
    case "dark":  return darkCardBackground
    case "zoji":  return zojiNavyBackground
    default:      return Color(.systemBackground)
    }
}

// Mesmo problema do fundo: Color(.label)/.secondary/.gray são dinâmicas e
// seguem a aparência REAL do aparelho, não o preferredColorScheme() — texto
// branco sobre fundo branco no modo "Claro" com o aparelho em escuro
// (achado em teste manual). "system"/ausente mantém as cores dinâmicas de
// propósito (aí sim deve seguir o aparelho).
private func widgetHeaderTitleColor() -> Color {
    switch widgetThemeModeRaw() {
    case "light":          return Color.black.opacity(0.7)
    case "dark", "zoji":   return Color.white.opacity(0.85)
    default:               return Color(.label).opacity(0.7)
    }
}

private func widgetSecondaryTextColor() -> Color {
    switch widgetThemeModeRaw() {
    case "light":          return Color.black.opacity(0.55)
    case "dark", "zoji":   return Color.white.opacity(0.6)
    default:               return .secondary
    }
}

private func widgetPlaceholderColor() -> Color {
    switch widgetThemeModeRaw() {
    case "light":          return Color.gray.opacity(0.55)
    case "dark", "zoji":   return Color.white.opacity(0.4)
    default:               return Color.gray.opacity(0.55)
    }
}

// MARK: - Helpers

private let primaryColor = Color(red: 0, green: 193/255, blue: 222/255)
private let logoSize: CGFloat = 54

private func circleSize(totalItems: Int) -> CGFloat {
    switch totalItems {
    case 1:  return 120
    case 2:  return 100
    case 3:  return 82
    case 4:  return 68
    default: return 56
    }
}

// MARK: - Zoji logo

private struct ZojiLogoView: View {
    var body: some View {
        Image("ZojiLogo")
            .resizable()
            .scaledToFill()
            .frame(width: logoSize, height: logoSize)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

// MARK: - Status circle view

struct StatusCircleView: View {
    let emoji: String?
    let label: String
    let borderColor: Color
    let size: CGFloat
    var showLabel: Bool = true

    private var emojiFont: CGFloat { size * 0.68 }
    private var labelFont: CGFloat { size < 70 ? 10 : 12 }

    var body: some View {
        VStack(spacing: 3) {
            ZStack {
                if let e = emoji {
                    Text(e).font(.system(size: emojiFont))
                } else {
                    Image(systemName: "plus")
                        .font(.system(size: size * 0.28, weight: .semibold))
                        .foregroundColor(widgetPlaceholderColor())
                }
            }
            .frame(width: size, height: size)
            if showLabel {
                Text(label)
                    .font(.system(size: labelFont, weight: .medium))
                    .foregroundColor(widgetSecondaryTextColor())
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Widget view

struct ZojiStatusWidgetView: View {
    let entry: ZojiStatusEntry

    private func chatURL(_ friend: WidgetFriend) -> URL {
        var c = URLComponents()
        c.scheme = "zoji"
        c.host   = "open-chat"
        c.queryItems = [
            URLQueryItem(name: "userId",       value: String(friend.userId)),
            URLQueryItem(name: "nickname",     value: friend.nickname),
            URLQueryItem(name: "profileEmoji", value: friend.profileEmoji),
        ]
        return c.url ?? URL(string: "zoji://")!
    }

    var body: some View {
        if entry.isLoggedOut {
            loggedOutLayout
        } else {
            let visible = Array(entry.friends.prefix(4))
            if visible.count == 4 {
                fourLayout(friends: visible)
            } else {
                standardLayout(friends: visible)
            }
        }
    }

    @ViewBuilder
    private var loggedOutLayout: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 6) {
                Spacer()
                ZojiLogoView()
                Text("Faça login no app\npara ver os status")
                    .font(.system(size: 12))
                    .foregroundColor(widgetSecondaryTextColor())
                    .multilineTextAlignment(.center)
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.top, 18)

            HStack(alignment: .center, spacing: 0) {
                Text("Status Zoji")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(widgetHeaderTitleColor())
                    .padding(.leading, 17)
                Spacer()
                ZojiLogoView()
                    .padding(.trailing, 2)
            }
            .frame(maxWidth: .infinity)
        }
    }

    // ≤3 friends: all in a row, logo overlays top-right (above last emoji)
    @ViewBuilder
    private func standardLayout(friends: [WidgetFriend]) -> some View {
        let cSize = circleSize(totalItems: 1 + friends.count)

        ZStack(alignment: .top) {
            HStack(spacing: 0) {
                Link(destination: URL(string: "zoji://")!) {
                    StatusCircleView(
                        emoji: entry.ownEmoji,
                        label: "Você",
                        borderColor: entry.ownEmoji != nil ? .purple : Color.gray.opacity(0.35),
                        size: cSize
                    )
                }
                ForEach(friends) { friend in
                    Link(destination: chatURL(friend)) {
                        StatusCircleView(
                            emoji: friend.statusEmoji,
                            label: friend.nickname,
                            borderColor: primaryColor,
                            size: cSize
                        )
                    }
                }
                if friends.isEmpty {
                    Text("Nenhum amigo\ncom status ativo")
                        .font(.system(size: 11))
                        .foregroundColor(widgetSecondaryTextColor())
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(10)
            .offset(y: 8)
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Header overlay: title left + logo right
            HStack(alignment: .center, spacing: 0) {
                Text("Status Zoji")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(widgetHeaderTitleColor())
                    .padding(.leading, 17)
                Spacer()
                ZojiLogoView()
                    .padding(.top, 0)
                    .padding(.trailing, 2)
            }
            .frame(maxWidth: .infinity)
        }
    }

    // 4 friends: Você + logo in header, 4 friends in row below
    @ViewBuilder
    private func fourLayout(friends: [WidgetFriend]) -> some View {
        let cSize = circleSize(totalItems: 4)

        VStack(spacing: 4) {
            // Header: Você circle (left) + title centered + logo right
            HStack(alignment: .center, spacing: 0) {
                Link(destination: URL(string: "zoji://")!) {
                    ZStack {
                        if let emoji = entry.ownEmoji {
                            Text(emoji).font(.system(size: 44 * 0.62))
                        } else {
                            Image(systemName: "plus")
                                .font(.system(size: 44 * 0.28, weight: .semibold))
                                .foregroundColor(widgetPlaceholderColor())
                        }
                    }
                    .frame(width: 44, height: 44)
                }
                .offset(x: 5, y: 5)
                Spacer()
                ZojiLogoView()
                    .offset(y: 2)
            }
            .overlay(
                Text("Status Zoji")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(widgetHeaderTitleColor()),
                alignment: .center
            )
            .padding(.horizontal, 2)
            .padding(.top, -2)

            // Friends row — 5pt higher when Você is in the header
            HStack(spacing: 0) {
                ForEach(friends) { friend in
                    Link(destination: chatURL(friend)) {
                        StatusCircleView(
                            emoji: friend.statusEmoji,
                            label: friend.nickname,
                            borderColor: primaryColor,
                            size: cSize
                        )
                    }
                }
            }
            .padding(.horizontal, 8)
            .offset(y: -5)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Widget
//
// Widget.body não usa result builder (diferente de View/@ViewBuilder), então um
// if/else dentro de um único body precisa que os dois ramos tenham o mesmo tipo
// concreto — .pushHandler(...) muda esse tipo. Por isso o branching por versão
// do iOS é feito no nível do WidgetBundle (ZojiWidgetBundle.swift), que aceita
// if #available via WidgetBundleBuilder, com dois Widgets distintos aqui.

private let zojiWidgetKind = "ZojiStatusWidget"

private func zojiStatusConfiguration() -> some WidgetConfiguration {
    StaticConfiguration(kind: zojiWidgetKind, provider: ZojiStatusProvider()) { entry in
        // preferredColorScheme precisa vir ANTES de containerBackground/background:
        // esses dois resolvem a cor do "background"/systemBackground usando o
        // environment do conteúdo que envolvem, então o override de tema só
        // funciona se estiver por dentro (aplicado ao conteúdo), não por fora
        // (envolvendo o resultado já materializado).
        if #available(iOSApplicationExtension 17.0, *) {
            ZojiStatusWidgetView(entry: entry)
                .preferredColorScheme(widgetPreferredColorScheme())
                .containerBackground(widgetContainerBackground(), for: .widget)
        } else {
            ZojiStatusWidgetView(entry: entry)
                .preferredColorScheme(widgetPreferredColorScheme())
                .background(widgetPlainBackground())
        }
    }
    .configurationDisplayName("Status dos Amigos")
    .description("Veja os status ativos dos seus amigos no Zoji.")
    .supportedFamilies([.systemMedium])
    .contentMarginsDisabled()
}

struct ZojiStatusWidget: Widget {
    var body: some WidgetConfiguration {
        zojiStatusConfiguration()
    }
}

// Push dedicado do WidgetKit (iOS 26+) — orçamento de refresh separado do
// Background App Refresh do app, usado pra atualizar o widget quase na hora
// quando o status muda (inclusive vindo de fora do app, ex: agente MCP).
@available(iOS 26.0, *)
struct ZojiStatusWidgetPush: Widget {
    var body: some WidgetConfiguration {
        zojiStatusConfiguration()
            .pushHandler(ZojiWidgetPushHandler.self)
    }
}

// MARK: - Preview

@available(iOS 17.0, *)
#Preview(as: .systemMedium) {
    ZojiStatusWidget()
} timeline: {
    ZojiStatusEntry.preview
    ZojiStatusEntry.empty
}
