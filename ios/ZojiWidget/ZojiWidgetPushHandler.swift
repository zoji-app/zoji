//
//  ZojiWidgetPushHandler.swift
//  ZojiWidget
//
//  WidgetKit Push Notifications (iOS 26+) — canal de refresh dedicado ao
//  widget, com orçamento separado do Background App Refresh do app. O iOS
//  chama pushTokenDidChange sempre que o token muda (widget adicionado à
//  tela de início, reinstalação, etc). Guardamos no App Group pra o app
//  (ZojiWidgetModule.getWidgetPushToken) ler e mandar pro backend.
//
import WidgetKit
import Foundation

@available(iOS 26.0, *)
struct ZojiWidgetPushHandler: WidgetPushHandler {
    private let appGroup      = "group.dev.de4araujo.zoji"
    private let pushTokenKey  = "zoji_widget_push_token"

    init() {}

    func pushTokenDidChange(_ pushInfo: WidgetPushInfo, widgets: [WidgetInfo]) {
        let hexToken = pushInfo.token.map { String(format: "%02x", $0) }.joined()
        UserDefaults(suiteName: appGroup)?.set(hexToken, forKey: pushTokenKey)
    }
}
