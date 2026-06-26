package net.matrixcapital.vitaforge.data

import net.matrixcapital.vitaforge.core.Services
import net.matrixcapital.vitaforge.model.DaySummary
import net.matrixcapital.vitaforge.model.DayGuidance
import net.matrixcapital.vitaforge.model.DiaryAddIn
import net.matrixcapital.vitaforge.model.DiaryEntryOut
import net.matrixcapital.vitaforge.model.FoodOut
import net.matrixcapital.vitaforge.model.LoginRequest
import net.matrixcapital.vitaforge.model.ProfileOut
import net.matrixcapital.vitaforge.model.ProfileUpsert
import net.matrixcapital.vitaforge.model.RegisterRequest
import net.matrixcapital.vitaforge.model.TargetOut
import net.matrixcapital.vitaforge.model.TokenPair
import net.matrixcapital.vitaforge.model.UserOut

/** Endpoint facade (paths/DTOs per docs/MOBILE_API.md). */
object Api {
    private val client get() = Services.api

    suspend fun register(req: RegisterRequest): UserOut = client.anonymous("/auth/register", req)
    suspend fun login(req: LoginRequest): TokenPair = client.anonymous("/auth/login", req)
    suspend fun me(): UserOut = client.get("/auth/me")

    suspend fun profile(): ProfileOut = client.get("/profile")
    suspend fun saveProfile(p: ProfileUpsert): ProfileOut = client.put("/profile", p)
    suspend fun target(): TargetOut = client.get("/nutrition/target")

    suspend fun day(day: String): DaySummary = client.get("/diary/$day")
    suspend fun dayGuidance(day: String): DayGuidance = client.get("/coaching/day-guidance/$day")
    suspend fun addDiary(entry: DiaryAddIn): DiaryEntryOut = client.post("/diary", entry)
    suspend fun deleteDiary(id: Int) = client.delete("/diary/$id")

    suspend fun searchFoods(q: String): List<FoodOut> = client.get("/foods/search", mapOf("q" to q))
}
