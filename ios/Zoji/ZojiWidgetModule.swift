import Foundation
import WidgetKit

@objc(ZojiWidgetModule)
class ZojiWidgetModule: NSObject {

    private let appGroup      = "group.dev.de4araujo.zoji"
    private let dataKey       = "zoji_widget_status"
    private let credentialKey = "widget_refresh_token"
    private let widgetKind    = "ZojiStatusWidget"

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

    @objc
    static func requiresMainQueueSetup() -> Bool { false }
}
