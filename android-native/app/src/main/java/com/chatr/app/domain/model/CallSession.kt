package com.chatr.app.domain.model

import kotlinx.serialization.Serializable

/**
 * Domain model for Call Session
 * Telecom-grade call representation
 */
@Serializable
data class CallSession(
    val id: String,
    val conversationId: String,
    val callerId: String,
    val callerName: String?,
    val callerPhone: String?,
    val callerAvatar: String?,
    val receiverId: String?,
    val receiverName: String?,
    val receiverPhone: String?,
    val receiverAvatar: String?,
    val type: CallType,
    val direction: CallDirection,
    val status: CallStatus,
    val isGroup: Boolean = false,
    val participants: List<CallParticipant> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
    val startedAt: Long? = null,
    val endedAt: Long? = null,
    val duration: Long? = null,
    val quality: CallQuality? = null
)

@Serializable
enum class CallType {
    AUDIO,
    VIDEO
}

@Serializable
enum class CallDirection {
    INCOMING,
    OUTGOING
}

@Serializable
enum class CallStatus {
    INITIATING,
    RINGING,
    CONNECTING,
    ACTIVE,
    ON_HOLD,
    RECONNECTING,
    ENDED,
    MISSED,
    REJECTED,
    FAILED
}

@Serializable
data class CallParticipant(
    val userId: String,
    val displayName: String?,
    val avatarUrl: String?,
    val phoneNumber: String?,
    val isAudioEnabled: Boolean = true,
    val isVideoEnabled: Boolean = false,
    val isSpeaking: Boolean = false,
    val joinedAt: Long = System.currentTimeMillis()
)

@Serializable
data class CallQuality(
    val bitrate: Int = 0,
    val packetLoss: Float = 0f,
    val jitter: Float = 0f,
    val rtt: Int = 0,
    val level: QualityLevel = QualityLevel.GOOD
)

@Serializable
enum class QualityLevel {
    EXCELLENT,
    GOOD,
    FAIR,
    POOR,
    DISCONNECTED
}
