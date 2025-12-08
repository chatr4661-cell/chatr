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

/**
 * WebRTC Signaling Client for call setup and negotiation
 * 
 * Supports two usage patterns:
 * 1. DI-injected singleton (use connect/disconnect with callId, token)
 * 2. Callback-based instance (for CallViewModel compatibility)
 */
@Singleton
class WebRTCSignalingClient @Inject constructor() {
    
    private val TAG = "WebRTCSignalingClient"
    private val SIGNALING_URL = "wss://sbayuqgomlflmxgicplz.supabase.co/functions/v1/webrtc-signaling"
    
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)
    
    private val _signalingEvents = MutableSharedFlow<SignalingEvent>()
    val signalingEvents: SharedFlow<SignalingEvent> = _signalingEvents
    
    private var currentCallId: String? = null
    private var currentUserId: String? = null
    
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
    
    fun connect(callId: String, token: String) {
        currentCallId = callId
        
        val request = Request.Builder()
            .url("$SIGNALING_URL?callId=$callId")
            .addHeader("Authorization", "Bearer $token")
            .build()
        
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket connected for call: $callId")
                scope.launch {
                    val event = SignalingEvent.Connected
                    _signalingEvents.emit(event)
                    eventCallback?.invoke(event)
                }
            }
            
            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Received message: $text")
                try {
                    val message = gson.fromJson(text, SignalingMessage::class.java)
                    scope.launch {
                        val event = when (message.type) {
                            "call-offer" -> SignalingEvent.Offer(
                                message.callId,
                                message.from,
                                message.sdp ?: "",
                                message.isVideo ?: false
                            )
                            "call-answer" -> SignalingEvent.Answer(
                                message.callId,
                                message.from,
                                message.sdp ?: ""
                            )
                            "call-candidate" -> SignalingEvent.IceCandidate(
                                message.callId,
                                message.from,
                                message.candidate ?: ""
                            )
                            "call-end" -> SignalingEvent.CallEnded(
                                message.callId,
                                message.from,
                                message.reason
                            )
                            else -> null
                        }
                        
                        event?.let {
                            _signalingEvents.emit(it)
                            eventCallback?.invoke(it)
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing message", e)
                }
            }
            
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket error", t)
                scope.launch {
                    val event = SignalingEvent.Error(t.message ?: "Unknown error")
                    _signalingEvents.emit(event)
                    eventCallback?.invoke(event)
                }
            }
            
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $reason")
                scope.launch {
                    val event = SignalingEvent.Disconnected
                    _signalingEvents.emit(event)
                    eventCallback?.invoke(event)
                }
            }
        })
    }
    
    fun connect() {
        // No-op for callback-based instances - already setup in constructor
        // Actual connection happens when sendOffer/sendAnswer is called
        Log.d(TAG, "WebRTC Signaling client ready for call: $currentCallId")
    }
    
    fun sendOffer(callId: String, sdp: String, isVideo: Boolean) {
        val message = mapOf(
            "type" to "call-offer",
            "callId" to callId,
            "sdp" to sdp,
            "isVideo" to isVideo,
            "from" to currentUserId
        )
        send(message)
    }
    
    fun sendAnswer(callId: String, sdp: String) {
        val message = mapOf(
            "type" to "call-answer",
            "callId" to callId,
            "sdp" to sdp,
            "from" to currentUserId
        )
        send(message)
    }
    
    fun sendIceCandidate(callId: String, candidate: String) {
        val message = mapOf(
            "type" to "call-candidate",
            "callId" to callId,
            "candidate" to candidate,
            "from" to currentUserId
        )
        send(message)
    }
    
    fun sendEndCall(callId: String, reason: String = "user_ended") {
        val message = mapOf(
            "type" to "call-end",
            "callId" to callId,
            "reason" to reason,
            "from" to currentUserId
        )
        send(message)
    }
    
    private fun send(data: Map<String, Any?>) {
        webSocket?.send(gson.toJson(data))
    }
    
    fun disconnect() {
        webSocket?.close(1000, "Client disconnecting")
        webSocket = null
        currentCallId = null
        eventCallback = null
    }
    
    // Sealed class for signaling events
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

data class SignalingMessage(
    val type: String,
    val callId: String,
    val from: String? = null,
    val sdp: String? = null,
    val candidate: String? = null,
    val isVideo: Boolean? = null,
    val reason: String? = null
)
