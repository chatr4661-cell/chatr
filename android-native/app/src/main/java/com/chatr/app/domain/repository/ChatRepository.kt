package com.chatr.app.domain.repository

import com.chatr.app.domain.model.Conversation
import com.chatr.app.domain.model.Message
import com.chatr.app.domain.model.MessageStatus
import kotlinx.coroutines.flow.Flow

/**
 * Chat repository interface
 * Offline-first with sync support
 */
interface ChatRepository {
    
    /**
     * Get all conversations for current user
     * Returns cached data immediately, then syncs with server
     */
    fun getConversations(): Flow<List<Conversation>>
    
    /**
     * Get single conversation by ID
     */
    fun getConversation(conversationId: String): Flow<Conversation?>
    
    /**
     * Get messages for a conversation
     * Paginated, offline-first
     */
    fun getMessages(
        conversationId: String,
        limit: Int = 50,
        beforeTimestamp: Long? = null
    ): Flow<List<Message>>
    
    /**
     * Send a text message
     * Saves locally first, then syncs to server
     */
    suspend fun sendMessage(
        conversationId: String,
        content: String,
        replyToId: String? = null
    ): Result<Message>
    
    /**
     * Send media message
     */
    suspend fun sendMediaMessage(
        conversationId: String,
        mediaUri: String,
        caption: String? = null
    ): Result<Message>
    
    /**
     * Update message status
     */
    suspend fun updateMessageStatus(
        messageId: String,
        status: MessageStatus
    ): Result<Unit>
    
    /**
     * Mark conversation as read
     */
    suspend fun markAsRead(conversationId: String): Result<Unit>
    
    /**
     * Create new direct conversation
     */
    suspend fun createDirectConversation(userId: String): Result<Conversation>
    
    /**
     * Create group conversation
     */
    suspend fun createGroupConversation(
        name: String,
        participantIds: List<String>
    ): Result<Conversation>
    
    /**
     * Delete message (soft delete)
     */
    suspend fun deleteMessage(messageId: String): Result<Unit>
    
    /**
     * Add reaction to message
     */
    suspend fun addReaction(messageId: String, emoji: String): Result<Unit>
    
    /**
     * Remove reaction from message
     */
    suspend fun removeReaction(messageId: String): Result<Unit>
    
    /**
     * Pin/unpin conversation
     */
    suspend fun pinConversation(conversationId: String, isPinned: Boolean): Result<Unit>
    
    /**
     * Mute/unmute conversation
     */
    suspend fun muteConversation(conversationId: String, isMuted: Boolean): Result<Unit>
    
    /**
     * Archive conversation
     */
    suspend fun archiveConversation(conversationId: String): Result<Unit>
    
    /**
     * Sync all pending messages
     */
    suspend fun syncPendingMessages(): Result<Int>
    
    /**
     * Subscribe to realtime updates for a conversation
     */
    fun subscribeToConversation(conversationId: String): Flow<Message>
}
