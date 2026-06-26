package net.matrixcapital.vitaforge.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// DTOs mirror the backend schemas (docs/MOBILE_API.md). Field names are
// camelCase with explicit @SerialName for the snake_case wire keys.

// ---- enums ----

@Serializable
enum class Sex {
    @SerialName("male") MALE,
    @SerialName("female") FEMALE,
}

@Serializable
enum class ActivityLevel {
    @SerialName("sedentary") SEDENTARY,
    @SerialName("light") LIGHT,
    @SerialName("moderate") MODERATE,
    @SerialName("high") HIGH,
    @SerialName("very_high") VERY_HIGH,
}

@Serializable
enum class GoalKind {
    @SerialName("lose") LOSE,
    @SerialName("maintain") MAINTAIN,
    @SerialName("gain") GAIN,
}

@Serializable
enum class Meal {
    @SerialName("breakfast") BREAKFAST,
    @SerialName("lunch") LUNCH,
    @SerialName("dinner") DINNER,
    @SerialName("snack") SNACK,
}

// ---- auth / identity ----

@Serializable
data class TokenPair(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("token_type") val tokenType: String = "bearer",
)

@Serializable
data class UserOut(
    val id: Int,
    val email: String,
    @SerialName("full_name") val fullName: String? = null,
    val role: String,
    @SerialName("email_verified") val emailVerified: Boolean = false,
) {
    val isAdmin: Boolean get() = role == "admin"
}

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    @SerialName("full_name") val fullName: String? = null,
)

@Serializable
data class LoginRequest(val email: String, val password: String)

// ---- profile ----

@Serializable
data class ProfileOut(
    val id: Int,
    @SerialName("user_id") val userId: Int,
    val sex: Sex,
    val age: Int,
    @SerialName("height_cm") val heightCm: Double,
    @SerialName("current_weight_kg") val currentWeightKg: Double,
    @SerialName("activity_level") val activityLevel: ActivityLevel,
    val goal: GoalKind,
    @SerialName("target_rate_kg_per_week") val targetRateKgPerWeek: Double,
    @SerialName("target_weight_kg") val targetWeightKg: Double? = null,
    @SerialName("protein_g_per_kg") val proteinGPerKg: Double? = null,
    @SerialName("protein_g_abs") val proteinGAbs: Double? = null,
    @SerialName("fat_g_per_kg") val fatGPerKg: Double? = null,
)

@Serializable
data class ProfileUpsert(
    val sex: Sex,
    val age: Int,
    @SerialName("height_cm") val heightCm: Double,
    @SerialName("current_weight_kg") val currentWeightKg: Double,
    @SerialName("activity_level") val activityLevel: ActivityLevel,
    val goal: GoalKind,
    @SerialName("target_rate_kg_per_week") val targetRateKgPerWeek: Double,
    @SerialName("target_weight_kg") val targetWeightKg: Double? = null,
)

// ---- nutrition ----

@Serializable
data class TargetOut(
    @SerialName("target_calories") val targetCalories: Double,
    @SerialName("protein_g") val proteinG: Double,
    @SerialName("fat_g") val fatG: Double,
    @SerialName("carb_g") val carbG: Double,
    @SerialName("maintenance_kcal") val maintenanceKcal: Double,
    @SerialName("maintenance_source") val maintenanceSource: String,
    val calibrated: Boolean,
    @SerialName("rate_clamped") val rateClamped: Boolean = false,
)

// ---- foods ----

@Serializable
data class PortionOut(val id: Int, val name: String, val grams: Double)

@Serializable
data class FoodOut(
    val id: Int,
    val source: String,
    val barcode: String? = null,
    val name: String,
    val brand: String? = null,
    @SerialName("kcal_100g") val kcal100g: Double,
    @SerialName("protein_100g") val protein100g: Double,
    @SerialName("fat_100g") val fat100g: Double,
    @SerialName("carb_100g") val carb100g: Double,
    val portions: List<PortionOut> = emptyList(),
)

// ---- diary ----

@Serializable
data class Nutrients(
    val kcal: Double,
    @SerialName("protein_g") val proteinG: Double,
    @SerialName("fat_g") val fatG: Double,
    @SerialName("carb_g") val carbG: Double,
)

@Serializable
data class RemainingOut(
    val calories: Double,
    @SerialName("protein_g") val proteinG: Double,
    @SerialName("fat_g") val fatG: Double,
    @SerialName("carb_g") val carbG: Double,
)

@Serializable
data class DiaryEntryOut(
    val id: Int,
    @SerialName("entry_date") val entryDate: String,
    val meal: Meal,
    @SerialName("food_id") val foodId: Int,
    @SerialName("food_name") val foodName: String,
    val grams: Double,
    val nutrients: Nutrients,
)

@Serializable
data class DaySummary(
    @SerialName("entry_date") val entryDate: String,
    val eaten: Nutrients,
    val target: RemainingOut,
    val remaining: RemainingOut,
    val entries: List<DiaryEntryOut>,
)

@Serializable
data class DiaryAddIn(
    @SerialName("entry_date") val entryDate: String,
    val meal: Meal,
    @SerialName("food_id") val foodId: Int,
    val grams: Double,
)

// ---- weight ----

@Serializable
data class WeightLogIn(
    @SerialName("logged_on") val loggedOn: String,
    @SerialName("weight_kg") val weightKg: Double,
)

@Serializable
data class WeightPoint(
    @SerialName("logged_on") val loggedOn: String,
    @SerialName("weight_kg") val weightKg: Double,
    @SerialName("trend_kg") val trendKg: Double,
)

@Serializable
data class WeightSeries(
    val points: List<WeightPoint>,
    @SerialName("latest_trend_kg") val latestTrendKg: Double? = null,
)

// ---- calibration ----

@Serializable
data class CalibrationStatus(
    val phase: String,
    @SerialName("started_on") val startedOn: String,
    @SerialName("window_days") val windowDays: Int,
    @SerialName("clean_days_collected") val cleanDaysCollected: Int,
    @SerialName("days_remaining") val daysRemaining: Int,
    @SerialName("ready_to_estimate") val readyToEstimate: Boolean,
    @SerialName("last_real_tdee") val lastRealTdee: Double? = null,
)

@Serializable
data class EstimateResult(
    val ok: Boolean,
    val reason: String? = null,
    @SerialName("real_tdee") val realTdee: Double? = null,
    @SerialName("avg_daily_intake") val avgDailyIntake: Double? = null,
    @SerialName("trend_change_kg") val trendChangeKg: Double? = null,
    val days: Int? = null,
    @SerialName("target_calories") val targetCalories: Double? = null,
)

// ---- analytics / trends ----

@Serializable
data class MacroAverages(
    val kcal: Double,
    @SerialName("protein_g") val proteinG: Double,
    @SerialName("fat_g") val fatG: Double,
    @SerialName("carb_g") val carbG: Double,
)

@Serializable
data class PeriodSummary(
    val range: String,
    val start: String,
    val end: String,
    @SerialName("days_total") val daysTotal: Int,
    @SerialName("days_logged") val daysLogged: Int,
    @SerialName("logging_adherence_pct") val loggingAdherencePct: Double,
    val avg: MacroAverages? = null,
    @SerialName("on_target_days") val onTargetDays: Int,
    @SerialName("on_target_pct") val onTargetPct: Double? = null,
    @SerialName("avg_kcal_delta") val avgKcalDelta: Double? = null,
    @SerialName("weight_change_kg") val weightChangeKg: Double? = null,
    @SerialName("weekly_rate_kg") val weeklyRateKg: Double? = null,
)

@Serializable
data class PaceOut(
    val goal: String,
    @SerialName("target_rate_kg_per_week") val targetRateKgPerWeek: Double,
    @SerialName("actual_rate_kg_per_week") val actualRateKgPerWeek: Double? = null,
    @SerialName("on_pace_pct") val onPacePct: Double? = null,
)

@Serializable
data class GoalOut(
    val status: String,
    @SerialName("target_weight_kg") val targetWeightKg: Double? = null,
    @SerialName("start_weight_kg") val startWeightKg: Double? = null,
    @SerialName("current_weight_kg") val currentWeightKg: Double? = null,
    @SerialName("remaining_kg") val remainingKg: Double? = null,
    @SerialName("progress_pct") val progressPct: Double? = null,
    @SerialName("eta_weeks") val etaWeeks: Double? = null,
    @SerialName("eta_date") val etaDate: String? = null,
)

@Serializable
data class TrendsOut(
    @SerialName("target_kcal") val targetKcal: Double,
    @SerialName("target_protein_g") val targetProteinG: Double,
    @SerialName("target_fat_g") val targetFatG: Double,
    @SerialName("target_carb_g") val targetCarbG: Double,
    val week: PeriodSummary,
    val month: PeriodSummary,
    val pace: PaceOut? = null,
    val goal: GoalOut,
)

// ---- recipes ----

@Serializable
data class RecipeComponentOut(
    @SerialName("food_id") val foodId: Int,
    @SerialName("food_name") val foodName: String,
    val grams: Double,
    val nutrients: Nutrients,
)

@Serializable
data class RecipeOut(
    val id: Int,
    val name: String,
    val totals: Nutrients,
    val components: List<RecipeComponentOut>,
)

@Serializable
data class RecipeLogIn(
    @SerialName("entry_date") val entryDate: String,
    val meal: Meal,
)

// ---- coaching ----

@Serializable
data class GuidanceItem(val kind: String, val message: String)

@Serializable
data class DayGuidance(val items: List<GuidanceItem>)
