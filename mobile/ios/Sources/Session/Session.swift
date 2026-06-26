import Foundation

/// App-wide auth + routing state. Drives `RootView`.
@MainActor
final class Session: ObservableObject {
    enum Route: Equatable {
        case loading
        case unauthenticated
        case onboarding
        case ready
    }

    @Published var route: Route = .loading
    @Published var user: UserOut?
    @Published var language: AppLanguage = AppLanguage.current

    /// On launch: if we hold tokens, resolve the user + whether onboarding is done.
    func bootstrap() async {
        guard KeychainTokenStore.shared.hasTokens else {
            route = .unauthenticated
            return
        }
        do {
            user = try await API.me()
            await resolveProfileRoute()
        } catch {
            // Tokens invalid / refresh failed.
            KeychainTokenStore.shared.clear()
            route = .unauthenticated
        }
    }

    func login(email: String, password: String) async throws {
        let pair = try await API.login(LoginRequest(email: email, password: password))
        KeychainTokenStore.shared.save(pair)
        user = try await API.me()
        await resolveProfileRoute()
    }

    func register(email: String, password: String, fullName: String?) async throws {
        _ = try await API.register(RegisterRequest(email: email, password: password, fullName: fullName))
        try await login(email: email, password: password)
    }

    /// 404 on GET /profile means onboarding isn't done yet (MOBILE_API.md).
    func resolveProfileRoute() async {
        do {
            _ = try await API.profile()
            route = .ready
        } catch APIError.server(let status, _) where status == 404 {
            route = .onboarding
        } catch {
            // Transient network error — let them in; screens load/retry their own data.
            route = .ready
        }
    }

    func finishOnboarding() { route = .ready }

    func setLanguage(_ lang: AppLanguage) {
        AppLanguage.current = lang
        language = lang
    }

    func logout() {
        KeychainTokenStore.shared.clear()
        user = nil
        route = .unauthenticated
    }
}
