import Foundation

/// The app's UI language, sent as `Accept-Language` on every request so the
/// server returns coaching copy + key errors in en/ru/de (MOBILE_API.md).
enum AppLanguage: String, CaseIterable, Identifiable {
    case en, ru, de
    var id: String { rawValue }

    var display: String {
        switch self {
        case .en: return "English"
        case .ru: return "Русский"
        case .de: return "Deutsch"
        }
    }

    private static let key = "vf_lang"

    /// Persisted choice, defaulting to the device language when supported.
    static var current: AppLanguage {
        get {
            if let raw = UserDefaults.standard.string(forKey: key),
               let lang = AppLanguage(rawValue: raw) {
                return lang
            }
            let device = Locale.preferredLanguages.first?.prefix(2).lowercased() ?? "en"
            return AppLanguage(rawValue: String(device)) ?? .en
        }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: key) }
    }
}
