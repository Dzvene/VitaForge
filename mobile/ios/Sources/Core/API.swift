import Foundation

/// Thin endpoint facade over `APIClient` so views never build paths by hand.
/// Paths/DTOs follow docs/MOBILE_API.md.
enum API {
    private static var client: APIClient { .shared }

    // Auth
    static func register(_ req: RegisterRequest) async throws -> UserOut {
        try await client.anonymous("/auth/register", body: req)
    }
    static func login(_ req: LoginRequest) async throws -> TokenPair {
        try await client.anonymous("/auth/login", body: req)
    }
    static func me() async throws -> UserOut { try await client.get("/auth/me") }

    // Profile / nutrition
    static func profile() async throws -> ProfileOut { try await client.get("/profile") }
    static func saveProfile(_ p: ProfileUpsert) async throws -> ProfileOut {
        try await client.put("/profile", body: p)
    }
    static func target() async throws -> TargetOut { try await client.get("/nutrition/target") }

    // Diary / coaching
    static func day(_ day: String) async throws -> DaySummary { try await client.get("/diary/\(day)") }
    static func dayGuidance(_ day: String) async throws -> DayGuidance {
        try await client.get("/coaching/day-guidance/\(day)")
    }
    static func recentFoods() async throws -> [FoodOut] { try await client.get("/diary/recent-foods") }
    static func addDiary(_ entry: DiaryAddIn) async throws -> DiaryEntryOut {
        try await client.post("/diary", body: entry)
    }
    static func deleteDiary(_ id: Int) async throws { try await client.send("/diary/\(id)", method: "DELETE") }

    // Weight
    static func logWeight(_ body: WeightLogIn) async throws {
        try await client.send("/weight", method: "POST", body: body)
    }
    static func weightSeries() async throws -> WeightSeries { try await client.get("/weight/series") }

    // Analytics
    static func trends() async throws -> TrendsOut { try await client.get("/analytics/trends") }

    // Recipes
    static func recipes() async throws -> [RecipeOut] { try await client.get("/recipes") }
    static func logRecipe(_ id: Int, _ body: RecipeLogIn) async throws {
        try await client.send("/recipes/\(id)/log", method: "POST", body: body)
    }
    static func deleteRecipe(_ id: Int) async throws { try await client.send("/recipes/\(id)", method: "DELETE") }

    // Calibration
    static func calibrationStatus() async throws -> CalibrationStatus { try await client.get("/calibration/status") }
    static func calibrationRecalc() async throws -> EstimateResult { try await client.post("/calibration/recalc") }
    static func calibrationSkip() async throws -> EstimateResult { try await client.post("/calibration/skip") }

    // Foods
    static func searchFoods(_ q: String) async throws -> [FoodOut] {
        try await client.get("/foods/search", query: ["q": q])
    }
    static func foodByBarcode(_ barcode: String) async throws -> FoodOut {
        try await client.get("/foods/barcode/\(barcode)")
    }
}
