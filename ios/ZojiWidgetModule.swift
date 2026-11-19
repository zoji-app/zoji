import Foundation
import WidgetKit
import React

@objc(ZojiWidgetModule)
class ZojiWidgetModule: NSObject {

    private let appGroup       = "group.dev.de4araujo.zoji"
    private let dataKey        = "zoji_widget_status"
    private let credentialKey  = "widget_refresh_token"
    private let widgetKind     = "ZojiStatusWidget"
    private let widgetPushKey  = "zoji_widget_push_token"
    private let themeModeKey   = "zoji_widget_theme_mode"

    private var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    @objc
    func saveCredentials(_ refreshToken: String) {
        defaults?.set(refreshToken, forKey: credentialKey)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    @objc
    func updateStatus(_ jsonString: String) {
        guard let data = jsonString.data(using: .utf8) else { return }
        defaults?.set(data, forKey: dataKey)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
        }
    }

    // "system" | "light" | "dark" — espelha a escolha do usuário em
    // Configurações (ThemeContext) pro widget, que por padrão só segue o
    // tema do sistema. "system" (ou ausente) faz o widget continuar
    // seguindo o sistema, igual antes dessa opção existir.
    @objc
    func setThemeMode(_ mode: String) {
        defaults?.set(mode, forKey: themeModeKey)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
        }
    }

    @objc
    func refreshWidget() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
        }
    }

    @objc
    func clearStatus() {
        defaults?.removeObject(forKey: credentialKey)
        defaults?.removeObject(forKey: dataKey)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    // Lê o token de push dedicado do WidgetKit (iOS 26+), escrito pelo
    // ZojiWidgetPushHandler na extensão via App Group. nil se ainda não
    // chegou (device < iOS 26, ou o SO ainda não entregou o token).
    @objc
    func getWidgetPushToken(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(defaults?.string(forKey: widgetPushKey))
    }

    @objc
    static func requiresMainQueueSetup() -> Bool { false }
}
