import Foundation

/// Backend host + API prefix. The production API is the single source of truth
/// (see docs/MOBILE_API.md). Override `baseURL` via an env scheme for staging.
enum APIConfig {
    static let baseURL = URL(string: "https://api.vita-forge.app/api/v1")!
    static let healthURL = URL(string: "https://api.vita-forge.app/health")!
}
