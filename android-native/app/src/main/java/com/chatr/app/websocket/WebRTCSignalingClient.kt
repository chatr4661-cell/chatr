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
                    _signalingEvents.emit(SignalingEvent.Connected)
                }
            }
            
            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Received message: $text")
                try {
                    val event = gson.fromJson(text, SignalingMessage::class.java)
                    scope.launch {
                        when (event.type) {
                            "call-offer" -> _signalingEvents.emit(
                                SignalingEvent.Offer(event.callId, event.from, event.sdp ?: "", event.isVideo ?: false)
                            )
                            "call-answer" -> _signalingEvents.emit(
                                SignalingEvent.Answer(event.callId, event.from, event.sdp ?: "")
                            )
                            "call-candidate" -> _signalingEvents.emit(
                                SignalingEvent.IceCandidate(event.callId, event.from, event.candidate ?: "")
                            )
                            "call-end" -> _signalingEvents.emit(
                                SignalingEvent.CallEnded(event.callId, event.from, event.reason)
                            )
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing message", e)
                }
            }
            
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket error", t)
                scope.launch {
                    _signalingEvents.emit(SignalingEvent.Error(t.message ?: "Unknown error"))
                }
            }
            
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $reason")
                scope.launch {
                    _signalingEvents.emit(SignalingEvent.Disconnected)
                }
            }
        })
    }
    
    fun sendOffer(callId: String, sdp: String, isVideo: Boolean) {
        val message = mapOf(
            "type" to "call-offer",
            "callId" to callId,
            "sdp" to sdp,
            "isVideo" to isVideo
        )
        send(message)
    }
    
    fun sendAnswer(callId: String, sdp: String) {
        val message = mapOf(
            "type" to "call-answer",
            "callId" to callId,
            "sdp" to sdp
        )
        send(message)
    }
    
    fun sendIceCandidate(callId: String, candidate: String) {
        val message = mapOf(
            "type" to "call-candidate",
            "callId" to callId,
            "candidate" to candidate
        )
        send(message)
    }
    
    fun sendEndCall(callId: String, reason: String = "user_ended") {
        val message = mapOf(
            "type" to "call-end",
            "callId" to callId,
            "reason" to reason
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

sealed class SignalingEvent {
    object Connected : SignalingEvent()
    object Disconnected : SignalingEvent()
    data class Offer(val callId: String, val from: String?, val sdp: String, val isVideo: Boolean) : SignalingEvent()
    data class Answer(val callId: String, val from: String?, val sdp: String) : SignalingEvent()
    data class IceCandidate(val callId: String, val from: String?, val candidate: String) : SignalingEvent()
    data class CallEnded(val callId: String, val from: String?, val reason: String?) : SignalingEvent()
    data class Error(val message: String) : SignalingEvent()
}
