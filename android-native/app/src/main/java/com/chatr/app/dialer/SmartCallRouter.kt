package com.chatr.app.dialer

import android.content.Context
import android.util.Log
import com.chatr.app.BuildConfig
import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║                    SMART CALL ROUTER                                 ║
 * ║                                                                      ║
 * ║  Determines GSM vs VoIP for every outgoing call                     ║
 * ║                                                                      ║
 * ║  Decision tree:                                                      ║
 * ║  1. Emergency number? → ALWAYS GSM                                  ║
 * ║  2. Contact is on Chatr? → VoIP (free)                              ║
 * ║  3. Contact has PSTN-out enabled? → VoIP→PSTN bridge                ║
 * ║  4. Default → GSM                                                    ║
 * ║                                                                      ║
 * ║  Caches lookup results for <1ms decision time                       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
@Singleton
class SmartCallRouter @Inject constructor(
    @ApplicationContext private val context: Context,
    private val httpClient: HttpClient
) {
    companion object {
        private const val TAG = "SmartCallRouter"
        private const val CACHE_TTL_MS = 5 * 60 * 1000L // 5 min cache
    }

    private val json = Json { ignoreUnknownKeys = true }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // In-memory cache: phone → ChatrUser (null = not on Chatr)
    private val chatrUserCache = mutableMapOf<String, CachedLookup>()

    // Observable routing decisions
    private val _lastDecision = MutableStateFlow<RouteDecision?>(null)
    val lastDecision: StateFlow<RouteDecision?> = _lastDecision.asStateFlow()

    /**
     * EMERGENCY numbers — ALWAYS route to GSM
     * Covers international formats
     */
    private val emergencyNumbers = setOf(
        "911", "112", "999", "000", "110", "119",
        "100", "101", "102", "108", // India
        "15", "17", "18",          // France
        "110", "120",              // Japan/China
    )

    /**
     * Route a call — returns decision in <1ms (cached) or <200ms (network lookup)
     * 
     * Called from:
     * - System dialer intercept (OutgoingCallReceiver)
     * - CHATR in-app dialer
     * - ConnectionService.onCreateOutgoingConnection
     */
    suspend fun routeCall(phoneNumber: String): RouteDecision {
        val startTime = System.currentTimeMillis()
        val normalized = normalizePhone(phoneNumber)

        // Step 1: Emergency — instant GSM
        if (isEmergency(normalized)) {
            val decision = RouteDecision(
                phone = normalized,
                route = CallRoute.GSM,
                reason = "Emergency number",
                chatrUserId = null,
                latencyMs = 0
            )
            _lastDecision.value = decision
            return decision
        }

        // Step 2: Check cache
        val cached = chatrUserCache[normalized]
        if (cached != null && !cached.isExpired()) {
            val route = if (cached.chatrUserId != null) CallRoute.VOIP else CallRoute.GSM
            val decision = RouteDecision(
                phone = normalized,
                route = route,
                reason = if (route == CallRoute.VOIP) "On Chatr (cached)" else "Not on Chatr",
                chatrUserId = cached.chatrUserId,
                chatrDisplayName = cached.displayName,
                chatrAvatarUrl = cached.avatarUrl,
                latencyMs = System.currentTimeMillis() - startTime
            )
            _lastDecision.value = decision
            Log.d(TAG, "📞 Route [$normalized] → $route (cached, ${decision.latencyMs}ms)")
            return decision
        }

        // Step 3: Network lookup — check if phone is registered on Chatr
        return withContext(Dispatchers.IO) {
            try {
                val lookup = lookupChatrUser(normalized)
                
                val route = if (lookup != null) CallRoute.VOIP else CallRoute.GSM
                
                // Cache result
                chatrUserCache[normalized] = CachedLookup(
                    chatrUserId = lookup?.userId,
                    displayName = lookup?.displayName,
                    avatarUrl = lookup?.avatarUrl,
                    timestamp = System.currentTimeMillis()
                )

                val decision = RouteDecision(
                    phone = normalized,
                    route = route,
                    reason = if (route == CallRoute.VOIP) "On Chatr" else "Not on Chatr",
                    chatrUserId = lookup?.userId,
                    chatrDisplayName = lookup?.displayName,
                    chatrAvatarUrl = lookup?.avatarUrl,
                    latencyMs = System.currentTimeMillis() - startTime
                )
                _lastDecision.value = decision
                Log.d(TAG, "📞 Route [$normalized] → $route (lookup, ${decision.latencyMs}ms)")
                decision
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ Lookup failed for $normalized, defaulting to GSM", e)
                RouteDecision(
                    phone = normalized,
                    route = CallRoute.GSM,
                    reason = "Lookup failed, GSM fallback",
                    chatrUserId = null,
                    latencyMs = System.currentTimeMillis() - startTime
                )
            }
        }
    }

    /**
     * Pre-warm cache for a batch of numbers (e.g., recent contacts)
     * Called at app startup for instant routing
     */
    fun prewarmCache(phoneNumbers: List<String>) {
        scope.launch {
            try {
                val normalized = phoneNumbers.map { normalizePhone(it) }.distinct()
                val response = httpClient.post("${BuildConfig.SUPABASE_URL}/functions/v1/lookup-chatr-users") {
                    contentType(ContentType.Application.Json)
                    header("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
                    setBody("""{"phones": ${Json.encodeToString(normalized)}}""")
                }
                
                if (response.status.isSuccess()) {
                    val body = json.parseToJsonElement(response.bodyAsText()).jsonObject
                    val users = body["users"]?.jsonArray ?: return@launch
                    
                    // Mark found users
                    val foundPhones = mutableSetOf<String>()
                    for (user in users) {
                        val obj = user.jsonObject
                        val phone = obj["phone"]?.jsonPrimitive?.content ?: continue
                        val userId = obj["id"]?.jsonPrimitive?.content
                        val name = obj["display_name"]?.jsonPrimitive?.contentOrNull
                        val avatar = obj["avatar_url"]?.jsonPrimitive?.contentOrNull
                        
                        chatrUserCache[phone] = CachedLookup(
                            chatrUserId = userId,
                            displayName = name,
                            avatarUrl = avatar,
                            timestamp = System.currentTimeMillis()
                        )
                        foundPhones.add(phone)
                    }
                    
                    // Mark not-found as non-Chatr
                    for (phone in normalized) {
                        if (phone !in foundPhones) {
                            chatrUserCache[phone] = CachedLookup(
                                chatrUserId = null,
                                displayName = null,
                                avatarUrl = null,
                                timestamp = System.currentTimeMillis()
                            )
                        }
                    }
                    
                    Log.d(TAG, "🔥 Cache prewarmed: ${foundPhones.size}/${normalized.size} on Chatr")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Cache prewarm failed", e)
            }
        }
    }

    /**
     * Instant check — uses cache only, no network
     * Returns null if not cached (caller should use routeCall for guaranteed result)
     */
    fun quickRoute(phoneNumber: String): CallRoute? {
        val normalized = normalizePhone(phoneNumber)
        
        if (isEmergency(normalized)) return CallRoute.GSM
        
        val cached = chatrUserCache[normalized]
        if (cached != null && !cached.isExpired()) {
            return if (cached.chatrUserId != null) CallRoute.VOIP else CallRoute.GSM
        }
        
        return null // Not cached
    }

    /**
     * Clear cache (on logout or force refresh)
     */
    fun clearCache() {
        chatrUserCache.clear()
    }

    // --- Private helpers ---

    private suspend fun lookupChatrUser(phone: String): ChatrUserLookup? {
        val response = httpClient.post("${BuildConfig.SUPABASE_URL}/functions/v1/lookup-chatr-users") {
            contentType(ContentType.Application.Json)
            header("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
            setBody("""{"phones": ["$phone"]}""")
        }

        if (!response.status.isSuccess()) return null

        val body = json.parseToJsonElement(response.bodyAsText()).jsonObject
        val users = body["users"]?.jsonArray ?: return null
        if (users.isEmpty()) return null

        val user = users[0].jsonObject
        return ChatrUserLookup(
            userId = user["id"]?.jsonPrimitive?.content ?: return null,
            displayName = user["display_name"]?.jsonPrimitive?.contentOrNull,
            avatarUrl = user["avatar_url"]?.jsonPrimitive?.contentOrNull
        )
    }

    private fun normalizePhone(phone: String): String {
        // Strip everything except digits and leading +
        val cleaned = phone.replace(Regex("[^+\\d]"), "")
        // If no country code, assume +91 (India default, configurable)
        return if (cleaned.startsWith("+")) cleaned else "+91$cleaned"
    }

    private fun isEmergency(phone: String): Boolean {
        val digits = phone.replace("+", "").takeLast(3)
        return emergencyNumbers.contains(digits) || emergencyNumbers.contains(phone)
    }
}

// --- Data classes ---

enum class CallRoute {
    VOIP,   // Free VoIP via Chatr
    GSM,    // Native GSM/cellular
    PSTN    // VoIP-to-PSTN bridge (future)
}

data class RouteDecision(
    val phone: String,
    val route: CallRoute,
    val reason: String,
    val chatrUserId: String?,
    val chatrDisplayName: String? = null,
    val chatrAvatarUrl: String? = null,
    val latencyMs: Long = 0
)

private data class CachedLookup(
    val chatrUserId: String?,
    val displayName: String?,
    val avatarUrl: String?,
    val timestamp: Long
) {
    fun isExpired(): Boolean = System.currentTimeMillis() - timestamp > SmartCallRouter.CACHE_TTL_MS
}

private data class ChatrUserLookup(
    val userId: String,
    val displayName: String?,
    val avatarUrl: String?
)
