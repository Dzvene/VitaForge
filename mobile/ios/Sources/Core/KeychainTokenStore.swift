import Foundation
import Security

/// JWT pair persisted in the iOS Keychain (MOBILE_API.md: store tokens in the
/// platform keychain, not UserDefaults). Access token TTL 60 min, refresh 30 d.
struct TokenPair: Codable, Equatable {
    let accessToken: String
    let refreshToken: String
    let tokenType: String
}

final class KeychainTokenStore {
    static let shared = KeychainTokenStore()

    private let service = "net.matrixcapital.vitaforge.tokens"
    private let account = "jwt"

    private(set) var cached: TokenPair?

    init() { cached = read() }

    var hasTokens: Bool { cached != nil }

    func save(_ pair: TokenPair) {
        cached = pair
        guard let data = try? JSONEncoder().encode(pair) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        let attrs: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
        let status = SecItemUpdate(query as CFDictionary, attrs as CFDictionary)
        if status == errSecItemNotFound {
            SecItemAdd(query.merging(attrs) { _, new in new } as CFDictionary, nil)
        }
    }

    func clear() {
        cached = nil
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }

    private func read() -> TokenPair? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let pair = try? JSONDecoder().decode(TokenPair.self, from: data) else {
            return nil
        }
        return pair
    }
}
