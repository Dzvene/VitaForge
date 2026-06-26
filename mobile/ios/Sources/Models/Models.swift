import Foundation

// DTOs mirror the backend schemas (docs/MOBILE_API.md). JSON is snake_case; the
// shared decoder uses `.convertFromSnakeCase`, so property names are camelCase
// and numeric-suffixed keys collapse (kcal_100g → kcal100g).

// MARK: - Auth / identity

struct UserOut: Codable, Identifiable, Equatable {
    let id: Int
    let email: String
    let fullName: String?
    let role: String
    let emailVerified: Bool

    var isAdmin: Bool { role == "admin" }
}

struct RegisterRequest: Encodable {
    let email: String
    let password: String
    let fullName: String?
}

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

// MARK: - Profile

struct ProfileOut: Codable, Equatable {
    let id: Int
    let userId: Int
    let sex: Sex
    let age: Int
    let heightCm: Double
    let currentWeightKg: Double
    let activityLevel: ActivityLevel
    let goal: GoalKind
    let targetRateKgPerWeek: Double
    let targetWeightKg: Double?
    let proteinGPerKg: Double?
    let proteinGAbs: Double?
    let fatGPerKg: Double?
}

/// Onboarding / settings upsert. Nil optionals are omitted by the synthesized
/// encoder, so unset macro overrides aren't sent.
struct ProfileUpsert: Encodable {
    var sex: Sex
    var age: Int
    var heightCm: Double
    var currentWeightKg: Double
    var activityLevel: ActivityLevel
    var goal: GoalKind
    var targetRateKgPerWeek: Double
    var targetWeightKg: Double?
}

// MARK: - Nutrition (Norm/Target)

struct TargetOut: Codable, Equatable {
    let targetCalories: Double
    let proteinG: Double
    let fatG: Double
    let carbG: Double
    let maintenanceKcal: Double
    let maintenanceSource: String   // "formula" | "calibrated"
    let calibrated: Bool
    let rateClamped: Bool
}

// MARK: - Foods

struct PortionOut: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let grams: Double
}

struct FoodOut: Codable, Identifiable, Equatable {
    let id: Int
    let source: String
    let barcode: String?
    let name: String
    let brand: String?
    let kcal100g: Double
    let protein100g: Double
    let fat100g: Double
    let carb100g: Double
    let portions: [PortionOut]
}

// MARK: - Diary

struct Nutrients: Codable, Equatable {
    let kcal: Double
    let proteinG: Double
    let fatG: Double
    let carbG: Double
}

struct RemainingOut: Codable, Equatable {
    let calories: Double
    let proteinG: Double
    let fatG: Double
    let carbG: Double
}

struct DiaryEntryOut: Codable, Identifiable, Equatable {
    let id: Int
    let entryDate: String
    let meal: Meal
    let foodId: Int
    let foodName: String
    let grams: Double
    let nutrients: Nutrients
}

struct DaySummary: Codable, Equatable {
    let entryDate: String
    let eaten: Nutrients
    let target: RemainingOut
    let remaining: RemainingOut
    let entries: [DiaryEntryOut]
}

struct DiaryAddIn: Encodable {
    let entryDate: String
    let meal: Meal
    let foodId: Int
    let grams: Double
}

// MARK: - Weight

struct WeightLogIn: Encodable {
    let loggedOn: String
    let weightKg: Double
}

struct WeightPoint: Codable, Identifiable, Equatable {
    let loggedOn: String
    let weightKg: Double
    let trendKg: Double
    var id: String { loggedOn }
}

struct WeightSeries: Codable, Equatable {
    let points: [WeightPoint]
    let latestTrendKg: Double?
}

// MARK: - Calibration

struct CalibrationStatus: Codable, Equatable {
    let phase: String                 // "calibrating" | "completed"
    let startedOn: String
    let windowDays: Int
    let cleanDaysCollected: Int
    let daysRemaining: Int
    let readyToEstimate: Bool
    let lastRealTdee: Double?
}

struct EstimateResult: Codable, Equatable {
    let ok: Bool
    let reason: String?
    let realTdee: Double?
    let avgDailyIntake: Double?
    let trendChangeKg: Double?
    let days: Int?
    let targetCalories: Double?
}

// MARK: - Analytics / trends

struct MacroAverages: Codable, Equatable {
    let kcal: Double
    let proteinG: Double
    let fatG: Double
    let carbG: Double
}

struct PeriodSummary: Codable, Equatable {
    let range: String              // "week" | "month"
    let start: String
    let end: String
    let daysTotal: Int
    let daysLogged: Int
    let loggingAdherencePct: Double
    let avg: MacroAverages?
    let onTargetDays: Int
    let onTargetPct: Double?
    let avgKcalDelta: Double?
    let weightChangeKg: Double?
    let weeklyRateKg: Double?
}

struct PaceOut: Codable, Equatable {
    let goal: String
    let targetRateKgPerWeek: Double
    let actualRateKgPerWeek: Double?
    let onPacePct: Double?
}

struct GoalOut: Codable, Equatable {
    let status: String             // no_target|no_data|reached|on_track|off_track|stalled
    let targetWeightKg: Double?
    let startWeightKg: Double?
    let currentWeightKg: Double?
    let remainingKg: Double?
    let progressPct: Double?
    let etaWeeks: Double?
    let etaDate: String?
}

struct TrendsOut: Codable, Equatable {
    let targetKcal: Double
    let targetProteinG: Double
    let targetFatG: Double
    let targetCarbG: Double
    let week: PeriodSummary
    let month: PeriodSummary
    let pace: PaceOut?
    let goal: GoalOut
}

// MARK: - Recipes

struct RecipeComponentOut: Codable, Identifiable, Equatable {
    let foodId: Int
    let foodName: String
    let grams: Double
    let nutrients: Nutrients
    var id: Int { foodId }
}

struct RecipeOut: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let totals: Nutrients
    let components: [RecipeComponentOut]
}

struct RecipeLogIn: Encodable {
    let entryDate: String
    let meal: Meal
}

// MARK: - Coaching

struct GuidanceItem: Codable, Identifiable, Equatable {
    let kind: String
    let message: String
    var id: String { kind + message }
}

struct DayGuidance: Codable, Equatable {
    let items: [GuidanceItem]
}
