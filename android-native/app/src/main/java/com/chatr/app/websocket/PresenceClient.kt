package com.chatr.app.websocket

import android.util.Log
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import okhttp3.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PresenceClient @Inject constructor() {
    
    private val TAG = "PresenceClient"
    private val REALTIME_URL = "wss://sbayuqgomlflmxgicplz.supabase.co/realtime/v1/websocket"
    private val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw"
    
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()
    
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)
    
    private val _presenceEvents = MutableSharedFlow<PresenceEvent>()
    val presenceEvents: SharedFlow<PresenceEvent> = _presenceEvents
    
    private val _typingEvents = MutableSharedFlow<TypingEvent>()
    val typingEvents: SharedFlow<TypingEvent> = _typingEvents
    
    private var currentUserId: String? = null
    private var subscribedChannels = mutableSetOf<String>()
    
    fun connect(userId: String, token: String) {
        currentUserId = userId
        
        val url = "$REALTIME_URL?apikey=$SUPABASE_ANON_KEY&vsn=1.0.0"
        val request = Request.Builder()
            .url(url)
            .addHeader("Authorization", "Bearer $token")
            .build()
        
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "Realtime WebSocket connected")
                // Send heartbeat
                sendHeartbeat()
            }
            
            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Received: $text")
                handleMessage(text)
            }
            
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket error", t)
                // Attempt reconnection
            }
            
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $reason")
            }
        })
    }
    
    fun subscribeToConversation(conversationId: String) {
        if (subscribedChannels.contains(conversationId)) return
        
        val joinMessage = mapOf(
            "topic" to "realtime:presence:$conversationId",
            "event" to "phx_join",
            "payload" to mapOf<String, Any>(),
            "ref" to System.currentTimeMillis().toString()
        )
        send(joinMessage)
        subscribedChannels.add(conversationId)
    }
    
    fun unsubscribeFromConversation(conversationId: String) {
        val leaveMessage = mapOf(
            "topic" to "realtime:presence:$conversationId",
            "event" to "phx_leave",
            "payload" to mapOf<String, Any>(),
            "ref" to System.currentTimeMillis().toString()
        )
        send(leaveMessage)
        subscribedChannels.remove(conversationId)
    }
    
    fun sendTypingStart(conversationId: String) {
        val message = mapOf(
            "topic" to "realtime:presence:$conversationId",
            "event" to "typing",
            "payload" to mapOf(
                "user_id" to currentUserId,
                "is_typing" to true
            ),
            "ref" to System.currentTimeMillis().toString()
        )
        send(message)
    }
    
    fun sendTypingStop(conversationId: String) {
        val message = mapOf(
            "topic" to "realtime:presence:$conversationId",
            "event" to "typing",
            "payload" to mapOf(
                "user_id" to currentUserId,
                "is_typing" to false
            ),
            "ref" to System.currentTimeMillis().toString()
        )
        send(message)
    }
    
    fun updatePresence(status: String) {
        currentUserId?.let { userId ->
            val message = mapOf(
                "topic" to "realtime:presence:global",
                "event" to "presence_state",
                "payload" to mapOf(
                    "user_id" to userId,
                    "status" to status,
                    "online_at" to System.currentTimeMillis()
                ),
                "ref" to System.currentTimeMillis().toString()
            )
            send(message)
        }
    }
    
    private fun handleMessage(text: String) {
        try {
            val message = gson.fromJson(text, Map::class.java)
            val event = message["event"] as? String
            val payload = message["payload"] as? Map<*, *>
            
            when (event) {
                "presence_state", "presence_diff" -> {
                    // Handle presence updates
                    payload?.let { handlePresencePayload(it) }
                }
                "typing" -> {
                    payload?.let { handleTypingPayload(it) }
                }
                "phx_reply" -> {
                    // Handle acknowledgements
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling message", e)
        }
    }
    
    private fun handlePresencePayload(payload: Map<*, *>) {
        scope.launch {
            val userId = payload["user_id"] as? String ?: return@launch
            val status = payload["status"] as? String ?: "offline"
            val isOnline = status == "online"
            _presenceEvents.emit(PresenceEvent(userId, isOnline, System.currentTimeMillis()))
        }
    }
    
    private fun handleTypingPayload(payload: Map<*, *>) {
        scope.launch {
            val userId = payload["user_id"] as? String ?: return@launch
            val isTyping = payload["is_typing"] as? Boolean ?: false
            if (userId != currentUserId) {
                _typingEvents.emit(TypingEvent(userId, isTyping))
            }
        }
    }
    
    private fun sendHeartbeat() {
        val heartbeat = mapOf(
            "topic" to "phoenix",
            "event" to "heartbeat",
            "payload" to mapOf<String, Any>(),
            "ref" to System.currentTimeMillis().toString()
        )
        send(heartbeat)
    }
    
    private fun send(data: Map<String, Any?>) {
        webSocket?.send(gson.toJson(data))
    }
    
    fun disconnect() {
        webSocket?.close(1000, "Client disconnecting")
        webSocket = null
        currentUserId = null
        subscribedChannels.clear()
    }
}

data class PresenceEvent(
    val userId: String,
    val isOnline: Boolean,
    val timestamp: Long
)

data class TypingEvent(
    val userId: String,
    val isTyping: Boolean
)
