import Foundation

/// Async networking layer. An `actor` so token refresh is single-flight: many
/// concurrent 401s coalesce onto one `/auth/refresh` (MOBILE_API.md). JSON is
/// snake_case on the wire; models stay camelCase via key strategies.
actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let tokens = KeychainTokenStore.shared
    private var refreshTask: Task<TokenPair, Error>?

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()

    init(session: URLSession = .shared) { self.session = session }

    // MARK: - Typed helpers

    func get<R: Decodable>(_ path: String, query: [String: String]? = nil) async throws -> R {
        try decoder.decode(R.self, from: await perform(path, method: "GET", body: nil, authed: true, query: query))
    }

    func post<B: Encodable, R: Decodable>(_ path: String, body: B) async throws -> R {
        try decoder.decode(R.self, from: await perform(path, method: "POST", body: try encoder.encode(body), authed: true, query: nil))
    }

    func put<B: Encodable, R: Decodable>(_ path: String, body: B) async throws -> R {
        try decoder.decode(R.self, from: await perform(path, method: "PUT", body: try encoder.encode(body), authed: true, query: nil))
    }

    /// POST/PUT/DELETE that returns no body (204) or whose body we ignore.
    @discardableResult
    func send<B: Encodable>(_ path: String, method: String, body: B) async throws -> Data {
        try await perform(path, method: method, body: try encoder.encode(body), authed: true, query: nil)
    }

    @discardableResult
    func send(_ path: String, method: String) async throws -> Data {
        try await perform(path, method: method, body: nil, authed: true, query: nil)
    }

    /// Unauthenticated call (guest preview, register, login).
    func anonymous<B: Encodable, R: Decodable>(_ path: String, method: String = "POST", body: B) async throws -> R {
        try decoder.decode(R.self, from: await perform(path, method: method, body: try encoder.encode(body), authed: false, query: nil))
    }

    // MARK: - Core

    private func perform(_ path: String, method: String, body: Data?, authed: Bool, query: [String: String]?) async throws -> Data {
        let request = buildRequest(path, method: method, body: body, query: query, accessToken: authed ? tokens.cached?.accessToken : nil)
        let (data, status) = try await raw(request)

        // One transparent refresh-and-retry on 401 for authed calls.
        if status == 401, authed {
            do {
                let pair = try await refreshTokens()
                let retry = buildRequest(path, method: method, body: body, query: query, accessToken: pair.accessToken)
                let (retryData, retryStatus) = try await raw(retry)
                guard (200..<300).contains(retryStatus) else {
                    throw APIError.server(status: retryStatus, detail: APIError.detail(from: retryData, status: retryStatus))
                }
                return retryData
            } catch {
                tokens.clear()
                throw APIError.unauthorized
            }
        }

        guard (200..<300).contains(status) else {
            throw APIError.server(status: status, detail: APIError.detail(from: data, status: status))
        }
        return data
    }

    private func raw(_ request: URLRequest) async throws -> (Data, Int) {
        do {
            let (data, response) = try await session.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            return (data, status)
        } catch {
            throw APIError.network(error)
        }
    }

    private func buildRequest(_ path: String, method: String, body: Data?, query: [String: String]?, accessToken: String?) -> URLRequest {
        var url = APIConfig.baseURL.appendingPathComponent(path.hasPrefix("/") ? String(path.dropFirst()) : path)
        if let query, var comps = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            comps.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
            url = comps.url ?? url
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(AppLanguage.current.rawValue, forHTTPHeaderField: "Accept-Language")
        if let accessToken { req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization") }
        req.httpBody = body
        return req
    }

    // MARK: - Refresh (single-flight)

    private func refreshTokens() async throws -> TokenPair {
        if let existing = refreshTask { return try await existing.value }
        let task = Task<TokenPair, Error> { [self] in try await doRefresh() }
        refreshTask = task
        defer { refreshTask = nil }
        return try await task.value
    }

    private func doRefresh() async throws -> TokenPair {
        guard let refresh = tokens.cached?.refreshToken else { throw APIError.unauthorized }
        let body = try encoder.encode(["refresh_token": refresh])
        let req = buildRequest("/auth/refresh", method: "POST", body: body, query: nil, accessToken: nil)
        let (data, status) = try await raw(req)
        guard (200..<300).contains(status) else { throw APIError.unauthorized }
        let pair = try decoder.decode(TokenPair.self, from: data)
        tokens.save(pair)
        return pair
    }
}
