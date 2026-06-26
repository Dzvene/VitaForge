package net.matrixcapital.vitaforge.core

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import net.matrixcapital.vitaforge.model.TokenPair
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

/**
 * OkHttp + kotlinx.serialization networking. JWT auth with **single-flight token
 * refresh** on 401 (a Mutex coalesces concurrent refreshes), and Accept-Language
 * on every request. Inline reified helpers keep call sites terse.
 */
class ApiClient(
    private val tokenStore: TokenStore,
    private val acceptLanguage: () -> String,
) {
    @PublishedApi
    internal val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        explicitNulls = false
    }

    private val http = OkHttpClient()
    private val refreshMutex = Mutex()
    private val mediaType = "application/json".toMediaType()

    // ---- typed helpers ----

    suspend inline fun <reified T> get(path: String, query: Map<String, String>? = null): T =
        json.decodeFromString(perform(path, "GET", null, authed = true, query = query))

    suspend inline fun <reified B, reified T> post(path: String, body: B): T =
        json.decodeFromString(perform(path, "POST", json.encodeToString(body), authed = true, query = null))

    suspend inline fun <reified B, reified T> put(path: String, body: B): T =
        json.decodeFromString(perform(path, "PUT", json.encodeToString(body), authed = true, query = null))

    suspend fun delete(path: String) {
        perform(path, "DELETE", null, authed = true, query = null)
    }

    /** Unauthenticated call (register/login/guest preview). */
    suspend inline fun <reified B, reified T> anonymous(path: String, body: B): T =
        json.decodeFromString(perform(path, "POST", json.encodeToString(body), authed = false, query = null))

    // ---- core ----

    private data class Raw(val code: Int, val body: String)

    @PublishedApi
    internal suspend fun perform(
        path: String,
        method: String,
        body: String?,
        authed: Boolean,
        query: Map<String, String>?,
    ): String = withContext(Dispatchers.IO) {
        val access = if (authed) tokenStore.access else null
        var resp = rawCall(path, method, body, access, query)

        if (resp.code == 401 && authed) {
            try {
                val fresh = refreshTokens(staleAccess = access)
                resp = rawCall(path, method, body, fresh, query)
            } catch (e: ApiException) {
                tokenStore.clear()
                throw ApiException.Unauthorized()
            }
        }

        if (resp.code !in 200..299) {
            throw ApiException.Server(resp.code, detailOf(resp.body, resp.code))
        }
        resp.body
    }

    /** Single-flight: concurrent 401s wait on the mutex; whoever wins refreshes,
     *  the rest see the already-rotated access token and skip a second refresh. */
    private suspend fun refreshTokens(staleAccess: String?): String = refreshMutex.withLock {
        val current = tokenStore.access
        if (current != null && current != staleAccess) return current

        val refresh = tokenStore.refresh ?: throw ApiException.Unauthorized()
        val payload = buildJsonObject { put("refresh_token", refresh) }.toString()
        val resp = rawCall("/auth/refresh", "POST", payload, accessToken = null, query = null)
        if (resp.code !in 200..299) throw ApiException.Unauthorized()
        val pair = json.decodeFromString<TokenPair>(resp.body)
        tokenStore.save(pair)
        pair.accessToken
    }

    private fun rawCall(
        path: String,
        method: String,
        body: String?,
        accessToken: String?,
        query: Map<String, String>?,
    ): Raw {
        val url = (ApiConfig.BASE_URL + path).toHttpUrl().newBuilder().apply {
            query?.forEach { (k, v) -> addQueryParameter(k, v) }
        }.build()

        val requestBody = when {
            body != null -> body.toRequestBody(mediaType)
            method == "POST" || method == "PUT" -> "".toRequestBody(mediaType)
            else -> null
        }

        val builder = Request.Builder()
            .url(url)
            .header("Accept-Language", acceptLanguage())
            .header("Content-Type", "application/json")
            .method(method, requestBody)
        if (accessToken != null) builder.header("Authorization", "Bearer $accessToken")

        return try {
            http.newCall(builder.build()).execute().use { r ->
                Raw(r.code, r.body?.string() ?: "")
            }
        } catch (e: IOException) {
            throw ApiException.Network(e)
        }
    }

    /** Pull a human message from a FastAPI `{ "detail": … }` body. */
    private fun detailOf(body: String, status: Int): String {
        return try {
            val obj = json.parseToJsonElement(body).jsonObject
            val detail = obj["detail"]
            when {
                detail == null -> "Request failed ($status)."
                detail.toString().startsWith("[") ->
                    detail.jsonArray.firstOrNull()?.jsonObject?.get("msg")?.jsonPrimitive?.content
                        ?: "Request failed ($status)."
                else -> detail.jsonPrimitive.content
            }
        } catch (e: Exception) {
            "Request failed ($status)."
        }
    }
}
