package com.chatr.app.webrtc.signaling

import kotlinx.serialization.Serializable

/**
 * Call Signaling Events - Formalized backend boundary
 * 
 * All signaling types the system can handle
 */
sealed class CallSignalingEvent {
    
    /**
     * Outgoing events (client → server)
     */
    sealed class Outgoing : CallSignalingEvent() {
        data class Offer(
            val callId: String,
            val sdp: String,
            val isVideo: Boolean
        ) : Outgoing()
        
        data class Answer(
            val callId: String,
            val sdp: String
        ) : Outgoing()
        
        data class IceCandidate(
            val callId: String,
            val sdpMid: String,
            val sdpMLineIndex: Int,
            val candidate: String
        ) : Outgoing()
        
        data class CallAccept(
            val callId: String
        ) : Outgoing()
        
        data class CallReject(
            val callId: String,
            val reason: RejectReason = RejectReason.DECLINED
        ) : Outgoing()
        
        data class CallCancel(
            val callId: String
        ) : Outgoing()
        
        data class CallEnd(
            val callId: String
        ) : Outgoing()
        
        data class CallBusy(
            val callId: String,
            val activeCallId: String? = null
        ) : Outgoing()
    }
    
    /**
     * Incoming events (server → client)
     */
    sealed class Incoming : CallSignalingEvent() {
        data class IncomingCall(
            val callId: String,
            val callerId: String,
            val callerName: String?,
            val callerPhone: String,
            val callerAvatar: String?,
            val isVideo: Boolean
        ) : Incoming()
        
        data class Offer(
            val callId: String,
            val sdp: String,
            val isVideo: Boolean
        ) : Incoming()
        
        data class Answer(
            val callId: String,
            val sdp: String
        ) : Incoming()
        
        data class IceCandidate(
            val callId: String,
            val sdpMid: String,
            val sdpMLineIndex: Int,
            val candidate: String
        ) : Incoming()
        
        data class CallAccepted(
            val callId: String
        ) : Incoming()
        
        data class CallRejected(
            val callId: String,
            val reason: RejectReason
        ) : Incoming()
        
        data class CallCanceled(
            val callId: String
        ) : Incoming()
        
        data class CallEnded(
            val callId: String
        ) : Incoming()
        
        data class CallBusy(
            val callId: String
        ) : Incoming()
        
        data class CallTimeout(
            val callId: String
        ) : Incoming()
        
        data class CallOnAnotherDevice(
            val callId: String,
            val deviceId: String
        ) : Incoming()
        
        data class Error(
            val callId: String?,
            val code: ErrorCode,
            val message: String
        ) : Incoming()
    }
}

/**
 * Rejection reasons
 */
enum class RejectReason {
    DECLINED,          // User explicitly declined
    BUSY,              // Already on another call
    UNAVAILABLE,       // DND or offline
    TIMEOUT,           // Ring timeout (missed)
    BLOCKED,           // Caller is blocked
    PERMISSION_DENIED, // Permissions not granted
    SYSTEM_ERROR       // System failure
}

/**
 * Signaling error codes
 */
enum class ErrorCode {
    UNKNOWN,
    CONNECTION_FAILED,
    AUTHENTICATION_FAILED,
    CALL_NOT_FOUND,
    CALL_ALREADY_ENDED,
    PEER_UNAVAILABLE,
    SERVER_ERROR,
    NETWORK_ERROR,
    TIMEOUT
}

/**
 * Serializable call data for signaling
 */
@Serializable
data class SignalingCallData(
    val callId: String,
    val callerId: String,
    val callerName: String? = null,
    val callerPhone: String,
    val callerAvatar: String? = null,
    val receiverId: String,
    val receiverName: String? = null,
    val receiverPhone: String? = null,
    val isVideo: Boolean = false,
    val status: String = "initiating",
    val createdAt: Long = System.currentTimeMillis()
)
