package net.matrixcapital.vitaforge.data

import net.matrixcapital.vitaforge.core.Services
import net.matrixcapital.vitaforge.model.CalibrationStatus
import net.matrixcapital.vitaforge.model.ChangePasswordIn
import net.matrixcapital.vitaforge.model.CopyResult
import net.matrixcapital.vitaforge.model.DayGuidance
import net.matrixcapital.vitaforge.model.DaySummary
import net.matrixcapital.vitaforge.model.DeleteAccountIn
import net.matrixcapital.vitaforge.model.DiaryAddIn
import net.matrixcapital.vitaforge.model.DiaryEntryOut
import net.matrixcapital.vitaforge.model.DiaryUpdateIn
import net.matrixcapital.vitaforge.model.EstimateResult
import net.matrixcapital.vitaforge.model.FoodCreate
import net.matrixcapital.vitaforge.model.FoodOut
import net.matrixcapital.vitaforge.model.ForgotPasswordIn
import net.matrixcapital.vitaforge.model.Hint
import net.matrixcapital.vitaforge.model.LoginRequest
import net.matrixcapital.vitaforge.model.ProfileOut
import net.matrixcapital.vitaforge.model.ProfileUpsert
import net.matrixcapital.vitaforge.model.RecipeCreate
import net.matrixcapital.vitaforge.model.RecipeLogIn
import net.matrixcapital.vitaforge.model.RecipeOut
import net.matrixcapital.vitaforge.model.RegisterRequest
import net.matrixcapital.vitaforge.model.ReminderConfig
import net.matrixcapital.vitaforge.model.ReminderPrefs
import net.matrixcapital.vitaforge.model.ResetPasswordIn
import net.matrixcapital.vitaforge.model.StatusOut
import net.matrixcapital.vitaforge.model.TargetOut
import net.matrixcapital.vitaforge.model.TokenPair
import net.matrixcapital.vitaforge.model.TrendsOut
import net.matrixcapital.vitaforge.model.UpdateAccountIn
import net.matrixcapital.vitaforge.model.UserOut
import net.matrixcapital.vitaforge.model.VerifyEmailIn
import net.matrixcapital.vitaforge.model.Warning
import net.matrixcapital.vitaforge.model.WeightLogIn
import net.matrixcapital.vitaforge.model.WeightSeries

/** Endpoint facade (paths/DTOs mirror the web `lib/api/endpoints.ts`). */
object Api {
    private val client get() = Services.api

    // ---- auth / account ----
    suspend fun register(req: RegisterRequest): UserOut = client.anonymous("/auth/register", req)
    suspend fun login(req: LoginRequest): TokenPair = client.anonymous("/auth/login", req)
    suspend fun me(): UserOut = client.get("/auth/me")
    suspend fun updateAccount(body: UpdateAccountIn): UserOut = client.patch("/auth/me", body)
    suspend fun forgotPassword(email: String): StatusOut =
        client.anonymous("/auth/forgot-password", ForgotPasswordIn(email))
    suspend fun resetPassword(token: String, newPassword: String): StatusOut =
        client.anonymous("/auth/reset-password", ResetPasswordIn(token, newPassword))
    suspend fun verifyEmail(token: String): StatusOut =
        client.anonymous("/auth/verify-email", VerifyEmailIn(token))
    suspend fun resendVerification(): StatusOut = client.postEmpty("/auth/resend-verification")
    suspend fun changePassword(current: String, next: String): StatusOut =
        client.post("/auth/change-password", ChangePasswordIn(current, next))
    suspend fun exportData(): String = client.getRaw("/account/export")
    suspend fun exportCsv(dataset: String): String =
        client.getRaw("/account/export.csv", mapOf("dataset" to dataset))
    suspend fun deleteAccount(password: String) =
        client.submit("/account/delete", "POST", DeleteAccountIn(password))

    // ---- profile / nutrition ----
    suspend fun profile(): ProfileOut = client.get("/profile")
    suspend fun saveProfile(p: ProfileUpsert): ProfileOut = client.put("/profile", p)
    suspend fun target(): TargetOut = client.get("/nutrition/target")
    suspend fun recompute(): TargetOut = client.postEmpty("/nutrition/recompute")

    // ---- foods ----
    suspend fun searchFoods(q: String): List<FoodOut> = client.get("/foods/search", mapOf("q" to q))
    suspend fun foodByBarcode(code: String): FoodOut = client.get("/foods/barcode/$code")
    suspend fun favorites(): List<FoodOut> = client.get("/foods/favorites")
    suspend fun createFood(body: FoodCreate): FoodOut = client.post("/foods", body)
    suspend fun addFavorite(id: Int) = client.submitEmpty("/foods/$id/favorite", "PUT")
    suspend fun removeFavorite(id: Int) = client.delete("/foods/$id/favorite")

    // ---- diary ----
    suspend fun day(day: String): DaySummary = client.get("/diary/$day")
    suspend fun addDiary(entry: DiaryAddIn): DiaryEntryOut = client.post("/diary", entry)
    suspend fun updateDiary(id: Int, grams: Double): DiaryEntryOut =
        client.patch("/diary/$id", DiaryUpdateIn(grams))
    suspend fun deleteDiary(id: Int) = client.delete("/diary/$id")
    suspend fun recentFoods(): List<FoodOut> = client.get("/diary/recent-foods")
    suspend fun copyDay(src: String, dst: String): CopyResult =
        client.postEmptyQuery("/diary/copy", mapOf("src" to src, "dst" to dst))

    // ---- recipes ----
    suspend fun recipes(): List<RecipeOut> = client.get("/recipes")
    suspend fun createRecipe(body: RecipeCreate): RecipeOut = client.post("/recipes", body)
    suspend fun updateRecipe(id: Int, body: RecipeCreate): RecipeOut = client.put("/recipes/$id", body)
    suspend fun logRecipe(id: Int, body: RecipeLogIn) = client.submit("/recipes/$id/log", "POST", body)
    suspend fun deleteRecipe(id: Int) = client.delete("/recipes/$id")

    // ---- weight ----
    suspend fun logWeight(body: WeightLogIn) = client.submit("/weight", "POST", body)
    suspend fun weightSeries(): WeightSeries = client.get("/weight/series")
    suspend fun deleteWeight(id: Int) = client.delete("/weight/$id")

    // ---- analytics / calibration ----
    suspend fun trends(): TrendsOut = client.get("/analytics/trends")
    suspend fun calibrationStatus(): CalibrationStatus = client.get("/calibration/status")
    suspend fun calibrationEstimate(): EstimateResult = client.postEmpty("/calibration/estimate")
    suspend fun calibrationRecalc(): EstimateResult = client.postEmpty("/calibration/recalc")
    suspend fun calibrationSkip(): EstimateResult = client.postEmpty("/calibration/skip")

    // ---- coaching ----
    suspend fun dayGuidance(day: String): DayGuidance = client.get("/coaching/day-guidance/$day")
    suspend fun hints(): List<Hint> = client.get("/coaching/hints")
    suspend fun warnings(): List<Warning> = client.get("/coaching/warnings")
    suspend fun acceptWarning(type: String) = client.submitEmpty("/coaching/warnings/$type/accept", "POST")
    suspend fun dismissWarning(type: String) = client.submitEmpty("/coaching/warnings/$type/dismiss", "POST")

    // ---- reminders (native device tokens) ----
    suspend fun reminderConfig(): ReminderConfig = client.get("/reminders/config")
    suspend fun setReminderPrefs(prefs: ReminderPrefs): ReminderPrefs = client.put("/reminders/prefs", prefs)
    suspend fun registerDevice(platform: String, token: String) =
        client.submit("/reminders/devices", "POST", mapOf("platform" to platform, "token" to token))
    suspend fun unregisterDevice(token: String) =
        client.submit("/reminders/devices", "DELETE", mapOf("token" to token))
}
