package com.chatr.app.calling

import android.util.Log
import com.chatr.app.config.SupabaseConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import org.webrtc.PeerConnection
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              TURN SERVER PROVIDER                                ║
 * ║                                                                  ║
 * ║  Multi-region STUN + TURN for NAT traversal                     ║
 * ║  30-50% of calls FAIL without TURN — this is non-negotiable    ║
 * ║                                                                  ║
 * ║  Strategy:                                                       ║
 * ║  1. Try edge function for dynamic TURN credentials               ║
 * ║  2. Fallback to Metered.ca free tier (500GB/mo)                 ║
 * ║  3. Always include Google STUN as baseline                       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
@Singleton
class TurnServerProvider @Inject constructor() {

    companion object {
        private const val TAG = "TurnServerProvider"
        
        // Google STUN (free, unlimited)
        private val STUN_SERVERS = listOf(
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun4.l.google.com:19302"
        )
        
        // Metered.ca free tier TURN (fallback)
        private val FALLBACK_TURN_SERVERS = listOf(
            "turn:a.relay.metered.ca:80",
            "turn:a.relay.metered.ca:80?transport=tcp",
            "turn:a.relay.metered.ca:443",
            "turns:a.relay.metered.ca:443"
        )
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    private var cachedServers: List<PeerConnection.IceServer>? = null
    private var cacheTimestamp: Long = 0
    private val CACHE_TTL = 5 * 60 * 1000L // 5 minutes

    /**
     * Get ICE servers with STUN + TURN
     * Tries dynamic credentials first, falls back to cached/static
     */
    suspend fun getIceServers(authToken: String? = null): List<PeerConnection.IceServer> {
        // Return cached if fresh
        if (cachedServers != null && System.currentTimeMillis() - cacheTimestamp < CACHE_TTL) {
            Log.d(TAG, "📦 Using cached ICE servers (${cachedServers!!.size})")
            return cachedServers!!
        }

        val servers = mutableListOf<PeerConnection.IceServer>()

        // 1. Always add STUN servers (free)
        STUN_SERVERS.forEach { url ->
            servers.add(
                PeerConnection.IceServer.builder(url).createIceServer()
            )
        }

        // 2. Try dynamic TURN from edge function
        val dynamicTurn = fetchDynamicTurnCredentials(authToken)
        if (dynamicTurn.isNotEmpty()) {
            servers.addAll(dynamicTurn)
            Log.d(TAG, "✅ Got ${dynamicTurn.size} dynamic TURN servers")
        } else {
            // 3. Fallback to static Metered.ca
            Log.w(TAG, "⚠️ Dynamic TURN failed, using Metered.ca fallback")
            FALLBACK_TURN_SERVERS.forEach { url ->
                servers.add(
                    PeerConnection.IceServer.builder(url)
                        .setUsername("chatr")
                        .setPassword("chatr2026")
                        .createIceServer()
                )
            }
        }

        cachedServers = servers
        cacheTimestamp = System.currentTimeMillis()
        
        Log.d(TAG, "🌐 ICE servers ready: ${servers.size} total (${servers.count { 
            it.urls.any { url -> url.startsWith("turn") }
        }} TURN)")
        
        return servers
    }

    /**
     * Get ICE servers as RTCConfiguration
     */
    suspend fun getRtcConfiguration(authToken: String? = null): PeerConnection.RTCConfiguration {
        val iceServers = getIceServers(authToken)
        return PeerConnection.RTCConfiguration(iceServers).apply {
            // Aggressive ICE for fastest connection
            iceTransportsType = PeerConnection.IceTransportsType.ALL
            bundlePolicy = PeerConnection.BundlePolicy.MAXBUNDLE
            rtcpMuxPolicy = PeerConnection.RtcpMuxPolicy.REQUIRE
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
            
            // Extended timeouts for mobile
            iceConnectionReceivingTimeout = 60000 // 60s for mobile
            iceBackupCandidatePairPingInterval = 5000
            
            // Allow TURN relay candidates (critical for NAT)
            candidateNetworkPolicy = PeerConnection.CandidateNetworkPolicy.ALL
        }
    }

    private suspend fun fetchDynamicTurnCredentials(authToken: String?): List<PeerConnection.IceServer> {
        return withContext(Dispatchers.IO) {
            try {
                val url = "${SupabaseConfig.SUPABASE_URL}/functions/v1/webrtc-signaling"
                val body = JSONObject().apply {
                    put("action", "get_ice_servers")
                }.toString()

                val requestBuilder = Request.Builder()
                    .url(url)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("apikey", SupabaseConfig.SUPABASE_ANON_KEY)
                    .post(okhttp3.RequestBody.create(
                        okhttp3.MediaType.parse("application/json"),
                        body
                    ))

                authToken?.let {
                    requestBuilder.addHeader("Authorization", "Bearer $it")
                }

                val response = client.newCall(requestBuilder.build()).execute()
                val responseBody = response.body()?.string()

                if (response.isSuccessful && responseBody != null) {
                    val json = JSONObject(responseBody)
                    val iceServersArray = json.optJSONArray("iceServers") ?: return@withContext emptyList()
                    
                    val servers = mutableListOf<PeerConnection.IceServer>()
                    for (i in 0 until iceServersArray.length()) {
                        val serverObj = iceServersArray.getJSONObject(i)
                        val urls = serverObj.optJSONArray("urls")
                        val username = serverObj.optString("username", "")
                        val credential = serverObj.optString("credential", "")

                        if (urls != null) {
                            val urlList = mutableListOf<String>()
                            for (j in 0 until urls.length()) {
                                urlList.add(urls.getString(j))
                            }
                            val builder = PeerConnection.IceServer.builder(urlList)
                            if (username.isNotEmpty()) builder.setUsername(username)
                            if (credential.isNotEmpty()) builder.setPassword(credential)
                            servers.add(builder.createIceServer())
                        }
                    }
                    servers
                } else {
                    emptyList()
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to fetch dynamic TURN credentials", e)
                emptyList()
            }
        }
    }

    /**
     * Invalidate cache (e.g., on TURN credential expiry)
     */
    fun invalidateCache() {
        cachedServers = null
        cacheTimestamp = 0
    }
}
