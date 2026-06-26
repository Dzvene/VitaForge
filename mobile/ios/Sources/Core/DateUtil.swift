import Foundation

/// Diary/weight dates are `YYYY-MM-DD` local days with no tz shift (MOBILE_API.md).
enum DateUtil {
    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func today() -> String { dayFormatter.string(from: Date()) }

    static func string(from date: Date) -> String { dayFormatter.string(from: date) }
}
