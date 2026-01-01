package com.chatr.app.call

import android.content.Intent
import android.os.Build
import android.telecom.*
import android.util.Log
import androidx.annotation.RequiresApi
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Connection Service for ChatrPlus native call integration
 * 
 * Handles:
 * - Incoming call connections
 * - Outgoing call connections
 * - Call state management (answer, reject, hold, disconnect)
 * - WebRTC integration via broadcast intents AND direct API calls
 */
@RequiresApi(Build.VERSION_CODES.M)
class ChatrConnectionService : ConnectionService() {
    
    companion object {
        private const val TAG = "ChatrConnectionService"
        const val ACTION_ANSWER_CALL = "com.chatr.app.ANSWER_CALL"
        const val ACTION_REJECT_CALL = "com.chatr.app.REJECT_CALL"
        const val ACTION_END_CALL = "com.chatr.app.END_CALL"
        const val ACTION_HOLD_CALL = "com.chatr.app.HOLD_CALL"
        const val ACTION_UNHOLD_CALL = "com.chatr.app.UNHOLD_CALL"
        const val EXTRA_CALL_ID = "CALL_ID"
        
        // Supabase configuration
        private const val SUPABASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co"
        private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw"
    }
    
    private val client = OkHttpClient()
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
    
    override fun onCreateOutgoingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        Log.d(TAG, "Creating outgoing ChatrPlus connection")
        
        return ChatrConnection().apply {
            setAddress(request?.address, TelecomManager.PRESENTATION_ALLOWED)
            setCallerDisplayName(
                request?.extras?.getString("CALLER_NAME") ?: "ChatrPlus Call",
                TelecomManager.PRESENTATION_ALLOWED
            )
            extras = request?.extras
            setActive()
        }
    }
    
    override fun onCreateIncomingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        Log.d(TAG, "Creating incoming ChatrPlus connection")
        
        return ChatrConnection().apply {
            setAddress(request?.address, TelecomManager.PRESENTATION_ALLOWED)
            setCallerDisplayName(
                request?.extras?.getString("CALLER_NAME") ?: "ChatrPlus Call",
                TelecomManager.PRESENTATION_ALLOWED
            )
            extras = request?.extras
            setRinging()
        }
    }
    
    override fun onCreateOutgoingConnectionFailed(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ) {
        Log.e(TAG, "❌ Failed to create outgoing connection")
    }
    
    override fun onCreateIncomingConnectionFailed(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ) {
        Log.e(TAG, "❌ Failed to create incoming connection")
    }
    
    /**
     * Update call status in database directly via Supabase REST API
     */
    private fun updateCallStatus(callId: String, status: String, additionalFields: Map<String, Any> = emptyMap()) {
        serviceScope.launch {
            try {
                Log.d(TAG, "📡 Updating call $callId to status: $status")
                
                val jsonBody = JSONObject().apply {
                    put("status", status)
                    if (status == "active") {
                        put("started_at", java.time.Instant.now().toString())
                        put("webrtc_state", "connecting")
                    }
                    if (status == "ended") {
                        put("ended_at", java.time.Instant.now().toString())
                        put("webrtc_state", "ended")
                    }
                    additionalFields.forEach { (key, value) ->
                        put(key, value)
                    }
                }
                
                val requestBody = jsonBody.toString()
                    .toRequestBody("application/json".toMediaType())
                
                val request = Request.Builder()
                    .url("$SUPABASE_URL/rest/v1/calls?id=eq.$callId")
                    .patch(requestBody)
                    .addHeader("apikey", SUPABASE_ANON_KEY)
                    .addHeader("Authorization", "Bearer $SUPABASE_ANON_KEY")
                    .addHeader("Content-Type", "application/json")
                    .addHeader("Prefer", "return=minimal")
                    .build()
                
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        Log.d(TAG, "✅ Call $callId updated to $status successfully")
                    } else {
                        Log.e(TAG, "❌ Failed to update call: ${response.code} - ${response.body?.string()}")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error updating call status", e)
            }
        }
    }
    
    /**
     * ChatrPlus Connection implementation
     * Handles call lifecycle and integrates with WebRTC via broadcasts
     */
    private inner class ChatrConnection : Connection() {
        
        init {
            connectionProperties = PROPERTY_SELF_MANAGED
            audioModeIsVoip = true
            connectionCapabilities = CAPABILITY_HOLD or CAPABILITY_SUPPORT_HOLD or CAPABILITY_MUTE
        }
        
        override fun onAnswer() {
            Log.d(TAG, "✅ Call answered via system UI")
            setActive()
            
            // Get call ID and UPDATE DATABASE DIRECTLY
            val callId = extras?.getString(EXTRA_CALL_ID)
            if (callId != null) {
                Log.d(TAG, "📞 Answering call ID: $callId - updating database")
                updateCallStatus(callId, "active")
            } else {
                Log.e(TAG, "❌ No call ID found in extras!")
            }
            
            // Also broadcast for any local WebRTC handling
            sendBroadcast(Intent(ACTION_ANSWER_CALL).apply {
                setPackage(packageName)
                putExtra(EXTRA_CALL_ID, callId)
            })
        }
        
        override fun onAnswer(videoState: Int) {
            Log.d(TAG, "✅ Call answered with video state: $videoState")
            onAnswer()
        }
        
        override fun onReject() {
            Log.d(TAG, "❌ Call rejected via system UI")
            setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
            destroy()
            
            // Update database
            val callId = extras?.getString(EXTRA_CALL_ID)
            if (callId != null) {
                updateCallStatus(callId, "ended", mapOf("missed" to false))
            }
            
            // Also broadcast
            sendBroadcast(Intent(ACTION_REJECT_CALL).apply {
                setPackage(packageName)
                putExtra(EXTRA_CALL_ID, callId)
            })
        }
        
        override fun onReject(rejectReason: Int) {
            Log.d(TAG, "❌ Call rejected with reason: $rejectReason")
            onReject()
        }
        
        override fun onDisconnect() {
            Log.d(TAG, "📞 Call disconnected")
            setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
            destroy()
            
            // Update database
            val callId = extras?.getString(EXTRA_CALL_ID)
            if (callId != null) {
                updateCallStatus(callId, "ended")
            }
            
            // Also broadcast
            sendBroadcast(Intent(ACTION_END_CALL).apply {
                setPackage(packageName)
                putExtra(EXTRA_CALL_ID, callId)
            })
        }
        
        override fun onHold() {
            Log.d(TAG, "⏸️ Call placed on hold")
            setOnHold()
            
            val callId = extras?.getString(EXTRA_CALL_ID)
            sendBroadcast(Intent(ACTION_HOLD_CALL).apply {
                setPackage(packageName)
                putExtra(EXTRA_CALL_ID, callId)
            })
        }
        
        override fun onUnhold() {
            Log.d(TAG, "▶️ Call resumed from hold")
            setActive()
            
            val callId = extras?.getString(EXTRA_CALL_ID)
            sendBroadcast(Intent(ACTION_UNHOLD_CALL).apply {
                setPackage(packageName)
                putExtra(EXTRA_CALL_ID, callId)
            })
        }
        
        override fun onAbort() {
            Log.d(TAG, "🚫 Call aborted")
            setDisconnected(DisconnectCause(DisconnectCause.CANCELED))
            destroy()
        }
        
        override fun onStateChanged(state: Int) {
            val stateName = when (state) {
                STATE_INITIALIZING -> "INITIALIZING"
                STATE_NEW -> "NEW"
                STATE_RINGING -> "RINGING"
                STATE_DIALING -> "DIALING"
                STATE_ACTIVE -> "ACTIVE"
                STATE_HOLDING -> "HOLDING"
                STATE_DISCONNECTED -> "DISCONNECTED"
                else -> "UNKNOWN($state)"
            }
            Log.d(TAG, "📞 Connection state changed: $stateName")
        }
    }
}
