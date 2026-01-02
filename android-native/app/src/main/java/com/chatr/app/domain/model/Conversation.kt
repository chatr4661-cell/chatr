package com.chatr.app.domain.model

import kotlinx.serialization.Serializable

/**
 * Domain model for Conversation/Chat
 */
@Serializable
data class Conversation(
    val id: String,
    val type: ConversationType,
    val name: String?,
    val avatarUrl: String?,
    val participants: List<Participant>,
    val lastMessage: Message?,
    val unreadCount: Int = 0,
    val isPinned: Boolean = false,
    val isMuted: Boolean = false,
    val isArchived: Boolean = false,
    val updatedAt: Long = System.currentTimeMillis(),
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
enum class ConversationType {
    DIRECT,
    GROUP,
    COMMUNITY,
    BROADCAST
}

@Serializable
data class Participant(
    val userId: String,
    val displayName: String?,
    val avatarUrl: String?,
    val role: ParticipantRole = ParticipantRole.MEMBER,
    val joinedAt: Long = System.currentTimeMillis()
)

@Serializable
enum class ParticipantRole {
    OWNER,
    ADMIN,
    MEMBER
}
