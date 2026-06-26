import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case server(status: Int, detail: String)
    case network(Error)
    case decoding(Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Your session expired. Please sign in again."
        case let .server(_, detail):
            return detail
        case let .network(error):
            return error.localizedDescription
        case .decoding:
            return "Unexpected response from the server."
        }
    }

    /// Pull a human message out of a FastAPI error body: `{ "detail": "…" }` or
    /// the `[{ "msg": … }]` validation array.
    static func detail(from data: Data, status: Int) -> String {
        if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let s = obj["detail"] as? String { return s }
            if let arr = obj["detail"] as? [[String: Any]],
               let msg = arr.first?["msg"] as? String { return msg }
        }
        return "Request failed (\(status))."
    }
}
