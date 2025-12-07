package com.chatr.app.util

import com.chatr.app.data.local.entity.ChatEntity
import com.chatr.app.data.local.entity.ContactEntity
import com.chatr.app.data.local.entity.MessageEntity
import com.chatr.app.data.models.User
import java.util.UUID

/**
 * Test utilities for creating mock data
 */
object TestUtils {
    
    /**
     * Create a mock user for testing
     */
    fun createMockUser(
        id: String = UUID.randomUUID().toString(),
        username: String = "testuser",
        phone: String = "+919999999999",
        email: String = "test@example.com",
        avatarUrl: String? = null
    ) = User(
        id = id,
        username = username,
        phoneNumber = phone,
        email = email,
        avatarUrl = avatarUrl
    )
    
    /**
     * Create a mock chat entity for testing
     */
    fun createMockChat(
        id: String = UUID.randomUUID().toString(),
        participantId: String = UUID.randomUUID().toString(),
        participantName: String = "Test User",
        lastMessage: String = "Hello",
        unreadCount: Int = 0,
        isGroup: Boolean = false
    ) = ChatEntity(
        id = id,
        participantId = participantId,
        participantName = participantName,
        participantAvatar = null,
        lastMessage = lastMessage,
        lastMessageTime = System.currentTimeMillis(),
        unreadCount = unreadCount,
        isGroup = isGroup,
        groupName = if (isGroup) "Test Group" else null,
        isPinned = false,
        isMuted = false,
        isArchived = false
    )
    
    /**
     * Create a mock message entity for testing
     */
    fun createMockMessage(
        id: String = UUID.randomUUID().toString(),
        conversationId: String = UUID.randomUUID().toString(),
        senderId: String = UUID.randomUUID().toString(),
        content: String = "Test message",
        isRead: Boolean = false,
        isSent: Boolean = true
    ) = MessageEntity(
        id = id,
        conversationId = conversationId,
        senderId = senderId,
        content = content,
        timestamp = System.currentTimeMillis(),
        isRead = isRead,
        isSent = isSent,
        status = if (isSent) "sent" else "pending",
        messageType = "text",
        mediaUrl = null,
        thumbnailUrl = null,
        replyToId = null,
        isEdited = false,
        isDeleted = false,
        reactions = null
    )
    
    /**
     * Create a mock contact entity for testing
     */
    fun createMockContact(
        id: String = UUID.randomUUID().toString(),
        name: String = "Test Contact",
        phone: String = "+919888888888",
        isRegistered: Boolean = true
    ) = ContactEntity(
        id = id,
        userId = if (isRegistered) UUID.randomUUID().toString() else null,
        name = name,
        phoneNumber = phone,
        avatarUrl = null,
        isRegistered = isRegistered,
        isFavorite = false,
        isBlocked = false,
        lastSeen = if (isRegistered) System.currentTimeMillis() else null
    )
    
    /**
     * Create a list of mock chats
     */
    fun createMockChats(count: Int = 5): List<ChatEntity> {
        return (1..count).map { index ->
            createMockChat(
                participantName = "User $index",
                lastMessage = "Message $index",
                unreadCount = index % 3
            )
        }
    }
    
    /**
     * Create a list of mock messages
     */
    fun createMockMessages(
        conversationId: String = UUID.randomUUID().toString(),
        count: Int = 10
    ): List<MessageEntity> {
        val senderId = UUID.randomUUID().toString()
        val otherUserId = UUID.randomUUID().toString()
        
        return (1..count).map { index ->
            createMockMessage(
                conversationId = conversationId,
                senderId = if (index % 2 == 0) senderId else otherUserId,
                content = "Message $index",
                isRead = index < count / 2
            )
        }
    }
    
    /**
     * Create a list of mock contacts
     */
    fun createMockContacts(count: Int = 10): List<ContactEntity> {
        return (1..count).map { index ->
            createMockContact(
                name = "Contact $index",
                phone = "+9199999999${index.toString().padStart(2, '0')}",
                isRegistered = index % 3 != 0
            )
        }
    }
}

/**
 * Extension function to wait for async operations in tests
 */
suspend fun <T> awaitValue(block: suspend () -> T): T {
    return block()
}
