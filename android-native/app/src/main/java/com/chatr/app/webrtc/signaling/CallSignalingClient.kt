package com.chatr.app.webrtc.signaling

import android.util.Log
import com.chatr.app.BuildConfig
import io.ktor.client.*
import io.ktor.client.plugins.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Call Signaling Client - WebSocket-based signaling transport
 * 
 * Handles:
 * - WebSocket connection lifecycle
 * - Offer/Answer exchange
 * - ICE candidate exchange
 * - Call state signals (accept, reject, cancel, end)
 * - Reconnection with exponential backoff
 */
@Singleton
class CallSignalingClient @Inject constructor(
    private val httpClient: HttpClient
) {
    companion object {
        private const val TAG = "CallSignalingClient"
        private const val MAX_RECONNECT_ATTEMPTS = 5
        private const val INITIAL_BACKOFF_MS = 1000L
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val json = Json { ignoreUnknownKeys = true }

    private var webSocketSession: DefaultClientWebSocketSession? = null
    private var currentCallId: String? = null
    private var currentToken: String? = null
    private var reconnectAttempts = 0
    private var reconnectJob: Job? = null

    private val _connectionState = MutableStateFlow(SignalingConnectionState.DISCONNECTED)
    val connectionState: StateFlow<SignalingConnectionState> = _connectionState.asStateFlow()

    private val _events = MutableSharedFlow<CallSignalingEvent.Incoming>(
        replay = 0,
        extraBufferCapacity = 64
    )
    val events: SharedFlow<CallSignalingEvent.Incoming> = _events.asSharedFlow()

    private val outgoingQueue = Channel<CallSignalingEvent.Outgoing>(Channel.BUFFERED)

    /**
     * Connect to signaling server for a call
     */
    suspend fun connect(callId: String, token: String) {
        Log.d(TAG, "Connecting to signaling for call: $callId")
        
        currentCallId = callId
        currentToken = token
        reconnectAttempts = 0

        doConnect()
    }

    private suspend fun doConnect() {
        val callId = currentCallId ?: return
        val token = currentToken ?: return

        _connectionState.value = SignalingConnectionState.CONNECTING

        try {
            val wsUrl = "${BuildConfig.SUPABASE_URL.replace("https://", "wss://")}/functions/v1/websocket-signaling?callId=$callId&token=$token"
            
            httpClient.webSocket(wsUrl) {
                webSocketSession = this
                _connectionState.value = SignalingConnectionState.CONNECTED
                reconnectAttempts = 0
                
                Log.d(TAG, "WebSocket connected")

                // Start message processing
                val receiveJob = launch { processIncoming() }
                val sendJob = launch { processOutgoing() }

                // Wait for either to complete (connection closed)
                try {
                    receiveJob.join()
                } finally {
                    sendJob.cancel()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "WebSocket connection failed", e)
            _connectionState.value = SignalingConnectionState.DISCONNECTED
            handleReconnect()
        }
    }

    private suspend fun DefaultClientWebSocketSession.processIncoming() {
        try {
            for (frame in incoming) {
                when (frame) {
                    is Frame.Text -> {
                        val text = frame.readText()
                        Log.d(TAG, "Received: $text")
                        parseAndEmitEvent(text)
                    }
                    is Frame.Close -> {
                        Log.d(TAG, "WebSocket closed by server")
                        break
                    }
                    else -> {}
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing incoming", e)
        } finally {
            _connectionState.value = SignalingConnectionState.DISCONNECTED
            webSocketSession = null
            handleReconnect()
        }
    }

    private suspend fun DefaultClientWebSocketSession.processOutgoing() {
        for (event in outgoingQueue) {
            try {
                val message = serializeOutgoing(event)
                send(Frame.Text(message))
                Log.d(TAG, "Sent: $message")
            } catch (e: Exception) {
                Log.e(TAG, "Error sending message", e)
            }
        }
    }

    private fun parseAndEmitEvent(text: String) {
        try {
            val jsonObject = json.parseToJsonElement(text).jsonObject
            val type = jsonObject["type"]?.jsonPrimitive?.content ?: return

            val event: CallSignalingEvent.Incoming? = when (type) {
                "incoming_call" -> parseIncomingCall(jsonObject)
                "offer" -> parseOffer(jsonObject)
                "answer" -> parseAnswer(jsonObject)
                "ice_candidate" -> parseIceCandidate(jsonObject)
                "call_accepted" -> parseCallAccepted(jsonObject)
                "call_rejected" -> parseCallRejected(jsonObject)
                "call_canceled" -> parseCallCanceled(jsonObject)
                "call_ended" -> parseCallEnded(jsonObject)
                "call_busy" -> parseCallBusy(jsonObject)
                "call_timeout" -> parseCallTimeout(jsonObject)
                "call_on_another_device" -> parseCallOnAnotherDevice(jsonObject)
                "error" -> parseError(jsonObject)
                else -> {
                    Log.w(TAG, "Unknown event type: $type")
                    null
                }
            }

            event?.let {
                scope.launch {
                    _events.emit(it)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing event: $text", e)
        }
    }

    private fun parseIncomingCall(json: JsonObject): CallSignalingEvent.Incoming.IncomingCall {
        return CallSignalingEvent.Incoming.IncomingCall(
            callId = json["call_id"]?.jsonPrimitive?.content ?: "",
            callerId = json["caller_id"]?.jsonPrimitive?.content ?: "",
            callerName = json["caller_name"]?.jsonPrimitive?.contentOrNull,
            callerPhone = json["caller_phone"]?.jsonPrimitive?.content ?: "",
            callerAvatar = json["caller_avatar"]?.jsonPrimitive?.contentOrNull,
            isVideo = json["is_video"]?.jsonPrimitive?.boolean ?: false
        )
    }

    private fun parseOffer(json: JsonObject): CallSignalingEvent.Incoming.Offer {
        return CallSignalingEvent.Incoming.Offer(
            callId = json["call_id"]?.jsonPrimitive?.content ?: "",
            sdp = json["sdp"]?.jsonPrimitive?.content ?: "",
            isVideo = json["is_video"]?.jsonPrimitive?.boolean ?: false
        )
    }

    private fun parseAnswer(json: JsonObject): CallSignalingEvent.Incoming.Answer {
        return CallSignalingEvent.Incoming.Answer(
            callId = json["call_id"]?.jsonPrimitive?.content ?: "",
            sdp = json["sdp"]?.jsonPrimitive?.content ?: ""
        )
    }

    private fun parseIceCandidate(json: JsonObject): CallSignalingEvent.Incoming.IceCandidate {
        return CallSignalingEvent.Incoming.IceCandidate(
            callId = json["call_id"]?.jsonPrimitive?.content ?: "",
            sdpMid = json["sdp_mid"]?.jsonPrimitive?.content ?: "",
            sdpMLineIndex = json["sdp_m_line_index"]?.jsonPrimitive?.int ?: 0,
            candidate = json["candidate"]?.jsonPrimitive?.content ?: ""
        )
    }

    private fun parseCallAccepted(json: JsonObject): CallSignalingEvent.Incoming.CallAccepted {
        return CallSignalingEvent.Incoming.CallAccepted(
            callId = json["call_id"]?.jsonPrimitive?.content ?: ""
        )
    }

    private fun parseCallRejected(json: JsonObject): CallSignalingEvent.Incoming.CallRejected {
        val reason = json["reason"]?.jsonPrimitive?.content?.let {
            try { RejectReason.valueOf(it.uppercase()) } catch (e: Exception) { RejectReason.DECLINED }
        } ?: RejectReason.DECLINED
        
        return CallSignalingEvent.Incoming.CallRejected(
            callId = json["call_id"]?.jsonPrimitive?.content ?: "",
            reason = reason
        )
    }

    private fun parseCallCanceled(json: JsonObject): CallSignalingEvent.Incoming.CallCanceled {
        return CallSignalingEvent.Incoming.CallCanceled(
            callId = json["call_id"]?.jsonPrimitive?.content ?: ""
        )
    }

    private fun parseCallEnded(json: JsonObject): CallSignalingEvent.Incoming.CallEnded {
        return CallSignalingEvent.Incoming.CallEnded(
            callId = json["call_id"]?.jsonPrimitive?.content ?: ""
        )
    }

    private fun parseCallBusy(json: JsonObject): CallSignalingEvent.Incoming.CallBusy {
        return CallSignalingEvent.Incoming.CallBusy(
            callId = json["call_id"]?.jsonPrimitive?.content ?: ""
        )
    }

    private fun parseCallTimeout(json: JsonObject): CallSignalingEvent.Incoming.CallTimeout {
        return CallSignalingEvent.Incoming.CallTimeout(
            callId = json["call_id"]?.jsonPrimitive?.content ?: ""
        )
    }

    private fun parseCallOnAnotherDevice(json: JsonObject): CallSignalingEvent.Incoming.CallOnAnotherDevice {
        return CallSignalingEvent.Incoming.CallOnAnotherDevice(
            callId = json["call_id"]?.jsonPrimitive?.content ?: "",
            deviceId = json["device_id"]?.jsonPrimitive?.content ?: ""
        )
    }

    private fun parseError(json: JsonObject): CallSignalingEvent.Incoming.Error {
        val code = json["code"]?.jsonPrimitive?.content?.let {
            try { ErrorCode.valueOf(it.uppercase()) } catch (e: Exception) { ErrorCode.UNKNOWN }
        } ?: ErrorCode.UNKNOWN
        
        return CallSignalingEvent.Incoming.Error(
            callId = json["call_id"]?.jsonPrimitive?.contentOrNull,
            code = code,
            message = json["message"]?.jsonPrimitive?.content ?: "Unknown error"
        )
    }

    private fun serializeOutgoing(event: CallSignalingEvent.Outgoing): String {
        val map = when (event) {
            is CallSignalingEvent.Outgoing.Offer -> mapOf(
                "type" to "offer",
                "call_id" to event.callId,
                "sdp" to event.sdp,
                "is_video" to event.isVideo
            )
            is CallSignalingEvent.Outgoing.Answer -> mapOf(
                "type" to "answer",
                "call_id" to event.callId,
                "sdp" to event.sdp
            )
            is CallSignalingEvent.Outgoing.IceCandidate -> mapOf(
                "type" to "ice_candidate",
                "call_id" to event.callId,
                "sdp_mid" to event.sdpMid,
                "sdp_m_line_index" to event.sdpMLineIndex,
                "candidate" to event.candidate
            )
            is CallSignalingEvent.Outgoing.CallAccept -> mapOf(
                "type" to "call_accept",
                "call_id" to event.callId
            )
            is CallSignalingEvent.Outgoing.CallReject -> mapOf(
                "type" to "call_reject",
                "call_id" to event.callId,
                "reason" to event.reason.name.lowercase()
            )
            is CallSignalingEvent.Outgoing.CallCancel -> mapOf(
                "type" to "call_cancel",
                "call_id" to event.callId
            )
            is CallSignalingEvent.Outgoing.CallEnd -> mapOf(
                "type" to "call_end",
                "call_id" to event.callId
            )
            is CallSignalingEvent.Outgoing.CallBusy -> mapOf(
                "type" to "call_busy",
                "call_id" to event.callId,
                "active_call_id" to (event.activeCallId ?: "")
            )
        }
        return json.encodeToString(map)
    }

    /**
     * Send outgoing signaling event
     */
    suspend fun send(event: CallSignalingEvent.Outgoing) {
        outgoingQueue.send(event)
    }

    /**
     * Convenience methods
     */
    suspend fun sendOffer(callId: String, sdp: String, isVideo: Boolean) {
        send(CallSignalingEvent.Outgoing.Offer(callId, sdp, isVideo))
    }

    suspend fun sendAnswer(callId: String, sdp: String) {
        send(CallSignalingEvent.Outgoing.Answer(callId, sdp))
    }

    suspend fun sendIceCandidate(callId: String, sdpMid: String, sdpMLineIndex: Int, candidate: String) {
        send(CallSignalingEvent.Outgoing.IceCandidate(callId, sdpMid, sdpMLineIndex, candidate))
    }

    suspend fun sendAccept(callId: String) {
        send(CallSignalingEvent.Outgoing.CallAccept(callId))
    }

    suspend fun sendReject(callId: String, reason: RejectReason = RejectReason.DECLINED) {
        send(CallSignalingEvent.Outgoing.CallReject(callId, reason))
    }

    suspend fun sendCancel(callId: String) {
        send(CallSignalingEvent.Outgoing.CallCancel(callId))
    }

    suspend fun sendEnd(callId: String) {
        send(CallSignalingEvent.Outgoing.CallEnd(callId))
    }

    suspend fun sendBusy(callId: String, activeCallId: String? = null) {
        send(CallSignalingEvent.Outgoing.CallBusy(callId, activeCallId))
    }

    /**
     * Disconnect from signaling
     */
    suspend fun disconnect() {
        Log.d(TAG, "Disconnecting signaling")
        reconnectJob?.cancel()
        reconnectJob = null
        
        webSocketSession?.close(CloseReason(CloseReason.Codes.NORMAL, "Client disconnect"))
        webSocketSession = null
        
        currentCallId = null
        currentToken = null
        
        _connectionState.value = SignalingConnectionState.DISCONNECTED
    }

    private fun handleReconnect() {
        if (currentCallId == null || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            Log.d(TAG, "Giving up reconnection after $reconnectAttempts attempts")
            return
        }

        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            val backoff = INITIAL_BACKOFF_MS * (1 shl reconnectAttempts)
            Log.d(TAG, "Reconnecting in ${backoff}ms (attempt ${reconnectAttempts + 1})")
            
            delay(backoff)
            reconnectAttempts++
            doConnect()
        }
    }
}

/**
 * Signaling connection states
 */
enum class SignalingConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    RECONNECTING
}
