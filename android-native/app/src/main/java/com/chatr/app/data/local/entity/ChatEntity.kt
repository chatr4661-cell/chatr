package com.chatr.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.chatr.app.data.models.Chat
import com.chatr.app.data.models.User

@Entity(tableName = "chats")
data class ChatEntity(
    @PrimaryKey val id: String,
    val participantIds: String, // Comma-separated participant IDs
    val lastMessage: String? = null,
    val lastMessageTime: Long? = null,
    val unreadCount: Int = 0,
    val updatedAt: Long,
    val isGroup: Boolean = false,
    val groupName: String? = null,
    val groupIcon: String? = null,
    val otherUserId: String? = null,
    val otherUserName: String? = null,
    val otherUserAvatar: String? = null,
    val otherUserOnline: Boolean = false
) {
    /**
     * Get participants as list
     */
    val participants: List<String>
        get() = participantIds.split(",").filter { it.isNotBlank() }
    
    fun toChat(): Chat {
        val otherUser = if (otherUserId != null) {
            User(
                id = otherUserId,
                email = null,
                phoneNumber = null,
                username = otherUserName,
                avatarUrl = otherUserAvatar,
                isOnline = otherUserOnline
            )
        } else null
        
        return Chat(
            id = id,
            participants = participants,
            lastMessage = null, // Simplified - full message not cached
            unreadCount = unreadCount,
            updatedAt = updatedAt,
            isGroup = isGroup,
            groupName = groupName,
            groupIconUrl = groupIcon,
            otherUser = otherUser
        )
    }
    
    companion object {
        fun fromChat(chat: Chat): ChatEntity {
            return ChatEntity(
                id = chat.id,
                participantIds = chat.participants.joinToString(","),
                lastMessage = chat.lastMessage?.content,
                lastMessageTime = chat.lastMessage?.timestamp,
                unreadCount = chat.unreadCount,
                updatedAt = chat.updatedAt,
                isGroup = chat.isGroup,
                groupName = chat.groupName,
                groupIcon = chat.groupIconUrl,
                otherUserId = chat.otherUser?.id,
                otherUserName = chat.otherUser?.username,
                otherUserAvatar = chat.otherUser?.avatarUrl,
                otherUserOnline = chat.otherUser?.isOnline ?: false
            )
        }
    }
}
