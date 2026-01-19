package com.chatr.app.websocket

import android.util.Log
import com.chatr.app.config.SupabaseConfig
import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * WebRTC Signaling Client - Uses webrtc_signals TABLE (same as web)
 * 
 * UNIFIED APPROACH: Both Android and Web use the same signaling path:
 * - Send signals: INSERT into webrtc_signals table via REST API
 * - Receive signals: Poll webrtc_signals table via REST API
 * 
 * This ensures cross-platform compatibility for:
 * - Web → App calls
 * - App → Web calls
 * - App → App calls
 */
@Singleton
class WebRTCSignalingClient @Inject constructor() {
    
    private val TAG = "WebRTCSignalingClient"
    
    private val client = OkHttpClient.Builder()
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val gson = Gson()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    private val _signalingEvents = MutableSharedFlow<SignalingEvent>(
        replay = 0,
        extraBufferCapacity = 64
    )
    val signalingEvents: SharedFlow<SignalingEvent> = _signalingEvents
    
    private var currentCallId: String? = null
    private var currentUserId: String? = null
    private var currentToken: String? = null
    private var partnerId: String? = null
    
    // Polling job for receiving signals
    private var pollingJob: Job? = null
    private val processedSignalIds = mutableSetOf<String>()
    
    // Callback for CallViewModel compatibility
    private var eventCallback: ((SignalingEvent) -> Unit)? = null
    
    /**
     * Secondary constructor for callback-based usage (CallViewModel)
     */
    constructor(callId: String, userId: String, onSignalingEvent: (SignalingEvent) -> Unit) : this() {
        this.currentCallId = callId
        this.currentUserId = userId
        this.eventCallback = onSignalingEvent
    }
    
    /**
     * Connect with full parameters (DI usage)
     */
    fun connect(callId: String, token: String) {
        currentCallId = callId
        currentToken = token
        
        Log.d(TAG, "✅ Connected to signaling for call: ${callId.take(8)}")
        
        // Start polling for signals
        startPolling()
        
        scope.launch {
            val event = SignalingEvent.Connected
            _signalingEvents.emit(event)
            eventCallback?.invoke(event)
        }
    }
    
    /**
     * Connect for callback-based instances
     * Fetches token from stored credentials and starts signaling
     */
    fun connect() {
        val callId = currentCallId ?: run {
            Log.e(TAG, "❌ Cannot connect - no callId set")
            return
        }
        
        Log.d(TAG, "✅ Signaling ready for call: ${callId.take(8)}")
        
        // Start polling for signals
        startPolling()
        
        scope.launch {
            val event = SignalingEvent.Connected
            _signalingEvents.emit(event)
            eventCallback?.invoke(event)
        }
    }
    
    /**
     * Set partner ID for targeted signaling
     */
    fun setPartnerId(id: String) {
        partnerId = id
        Log.d(TAG, "Partner ID set: ${id.take(8)}")
    }
    
    /**
     * Set current user ID
     */
    fun setUserId(userId: String) {
        currentUserId = userId
        Log.d(TAG, "User ID set: ${userId.take(8)}")
    }
    
    /**
     * Set access token for authenticated requests
     */
    fun setToken(token: String) {
        currentToken = token
    }
    
    private fun startPolling() {
        pollingJob?.cancel()
        pollingJob = scope.launch {
            Log.d(TAG, "📡 Starting signal polling...")
            
            while (isActive) {
                try {
                    fetchAndProcessSignals()
                } catch (e: Exception) {
                    Log.e(TAG, "Polling error", e)
                }
                delay(500) // Poll every 500ms
            }
        }
    }
    
    private suspend fun fetchAndProcessSignals() {
        val callId = currentCallId ?: return
        val userId = currentUserId ?: return
        val token = currentToken ?: SupabaseConfig.SUPABASE_ANON_KEY
        
        try {
            // Query webrtc_signals table for signals addressed to this user
            val url = "${SupabaseConfig.SUPABASE_URL}/rest/v1/webrtc_signals?" +
                "call_id=eq.$callId&to_user=eq.$userId&order=created_at.asc"
            
            val request = Request.Builder()
                .url(url)
                .addHeader("Authorization", "Bearer $token")
                .addHeader("apikey", SupabaseConfig.SUPABASE_ANON_KEY)
                .addHeader("Content-Type", "application/json")
                .get()
                .build()
            
            val response = client.newCall(request).execute()
            val body = response.body?.string()
            
            if (response.isSuccessful && body != null) {
                val signals = JSONArray(body)
                
                for (i in 0 until signals.length()) {
                    val signal = signals.getJSONObject(i)
                    val signalId = signal.getString("id")
                    
                    // Skip already processed signals
                    if (processedSignalIds.contains(signalId)) continue
                    processedSignalIds.add(signalId)
                    
                    processSignal(signal)
                    
                    // Delete processed signal
                    deleteSignal(signalId, token)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching signals", e)
        }
    }
    
    private suspend fun processSignal(signal: JSONObject) {
        val signalType = signal.getString("signal_type")
        val signalData = signal.optJSONObject("signal_data") ?: JSONObject()
        val fromUser = signal.optString("from_user", "")
        val callId = signal.getString("call_id")
        
        Log.d(TAG, "📥 Processing signal: $signalType from ${fromUser.take(8)}")
        
        val event: SignalingEvent? = when (signalType) {
            "offer" -> {
                val sdp = signalData.optString("sdp", "")
                val isVideo = signalData.optBoolean("isVideo", false)
                SignalingEvent.Offer(callId, fromUser, sdp, isVideo)
            }
            "answer" -> {
                val sdp = signalData.optString("sdp", "")
                // Handle native accept signal (no SDP, just accepted flag)
                if (sdp.isEmpty() && signalData.optBoolean("accepted", false)) {
                    Log.d(TAG, "📱 Partner accepted call (native accept signal)")
                    null // Don't emit as Answer - it's just an accept notification
                } else {
                    SignalingEvent.Answer(callId, fromUser, sdp)
                }
            }
            "ice-candidate" -> {
                val candidate = signalData.optString("candidate", "")
                SignalingEvent.IceCandidate(callId, fromUser, candidate)
            }
            "call-end", "end" -> {
                SignalingEvent.CallEnded(callId, fromUser, "remote_ended")
            }
            else -> {
                Log.w(TAG, "Unknown signal type: $signalType")
                null
            }
        }
        
        event?.let {
            _signalingEvents.emit(it)
            eventCallback?.invoke(it)
        }
    }
    
    private suspend fun deleteSignal(signalId: String, token: String) {
        try {
            val url = "${SupabaseConfig.SUPABASE_URL}/rest/v1/webrtc_signals?id=eq.$signalId"
            
            val request = Request.Builder()
                .url(url)
                .addHeader("Authorization", "Bearer $token")
                .addHeader("apikey", SupabaseConfig.SUPABASE_ANON_KEY)
                .delete()
                .build()
            
            client.newCall(request).execute()
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting signal", e)
        }
    }
    
    /**
     * Send offer SDP
     */
    fun sendOffer(callId: String, sdp: String, isVideo: Boolean) {
        val target = partnerId ?: run {
            Log.e(TAG, "❌ Cannot send offer - no partnerId set")
            return
        }
        
        val signalData = JSONObject().apply {
            put("sdp", sdp)
            put("type", "offer")
            put("isVideo", isVideo)
        }
        
        sendSignal(callId, "offer", target, signalData)
    }
    
    /**
     * Send answer SDP
     */
    fun sendAnswer(callId: String, sdp: String) {
        val target = partnerId ?: run {
            Log.e(TAG, "❌ Cannot send answer - no partnerId set")
            return
        }
        
        val signalData = JSONObject().apply {
            put("sdp", sdp)
            put("type", "answer")
        }
        
        sendSignal(callId, "answer", target, signalData)
    }
    
    /**
     * Send ICE candidate
     */
    fun sendIceCandidate(callId: String, candidate: String) {
        val target = partnerId ?: run {
            Log.e(TAG, "❌ Cannot send ICE - no partnerId set")
            return
        }
        
        val signalData = JSONObject().apply {
            put("candidate", candidate)
        }
        
        sendSignal(callId, "ice-candidate", target, signalData)
    }
    
    /**
     * Send end call signal
     */
    fun sendEndCall(callId: String, reason: String = "user_ended") {
        val target = partnerId ?: run {
            Log.w(TAG, "No partnerId for end call signal")
            return
        }
        
        val signalData = JSONObject().apply {
            put("reason", reason)
        }
        
        sendSignal(callId, "end", target, signalData)
    }
    
    /**
     * Core signal sending - INSERT into webrtc_signals table
     */
    private fun sendSignal(callId: String, type: String, toUser: String, data: JSONObject) {
        val userId = currentUserId ?: run {
            Log.e(TAG, "❌ Cannot send signal - no userId")
            return
        }
        val token = currentToken ?: SupabaseConfig.SUPABASE_ANON_KEY
        
        scope.launch {
            try {
                val payload = JSONObject().apply {
                    put("call_id", callId)
                    put("signal_type", type)
                    put("signal_data", data)
                    put("from_user", userId)
                    put("to_user", toUser)
                }
                
                val url = "${SupabaseConfig.SUPABASE_URL}/rest/v1/webrtc_signals"
                
                val request = Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer $token")
                    .addHeader("apikey", SupabaseConfig.SUPABASE_ANON_KEY)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("Prefer", "return=minimal")
                    .post(payload.toString().toRequestBody("application/json".toMediaType()))
                    .build()
                
                val response = client.newCall(request).execute()
                
                if (response.isSuccessful) {
                    Log.d(TAG, "📤 Signal sent: $type to ${toUser.take(8)}")
                } else {
                    Log.e(TAG, "❌ Signal send failed: ${response.code} - ${response.body?.string()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error sending signal", e)
                scope.launch {
                    val event = SignalingEvent.Error(e.message ?: "Signal send failed")
                    _signalingEvents.emit(event)
                    eventCallback?.invoke(event)
                }
            }
        }
    }
    
    /**
     * Disconnect and cleanup
     */
    fun disconnect() {
        Log.d(TAG, "🔌 Disconnecting signaling")
        
        pollingJob?.cancel()
        pollingJob = null
        
        currentCallId = null
        partnerId = null
        processedSignalIds.clear()
        eventCallback = null
        
        scope.launch {
            val event = SignalingEvent.Disconnected
            _signalingEvents.emit(event)
        }
    }
    
    // Sealed class for signaling events (unchanged interface)
    sealed class SignalingEvent {
        object Connected : SignalingEvent()
        object Disconnected : SignalingEvent()
        data class Offer(val callId: String, val from: String?, val sdp: String, val isVideo: Boolean) : SignalingEvent()
        data class Answer(val callId: String, val from: String?, val sdp: String) : SignalingEvent()
        data class IceCandidate(val callId: String, val from: String?, val candidate: String) : SignalingEvent()
        data class CallEnded(val callId: String, val from: String?, val reason: String?) : SignalingEvent()
        data class Error(val message: String) : SignalingEvent()
    }
}

// Keep for backward compatibility
data class SignalingMessage(
    val type: String,
    val callId: String,
    val from: String? = null,
    val sdp: String? = null,
    val candidate: String? = null,
    val isVideo: Boolean? = null,
    val reason: String? = null
)

// Extension type for DI-injected event handling
typealias SignalingEvent = WebRTCSignalingClient.SignalingEvent
