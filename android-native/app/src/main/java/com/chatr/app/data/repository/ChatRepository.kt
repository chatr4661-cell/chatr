package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import com.chatr.app.data.local.dao.ChatDao
import com.chatr.app.data.local.dao.MessageDao
import com.chatr.app.data.local.dao.PendingMessageDao
import com.chatr.app.data.local.entity.ChatEntity
import com.chatr.app.data.local.entity.MessageEntity
import com.chatr.app.data.local.entity.PendingMessageEntity
import com.chatr.app.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepository @Inject constructor(
    private val api: ChatrApi,
    private val chatDao: ChatDao,
    private val messageDao: MessageDao,
    private val pendingMessageDao: PendingMessageDao
) {
    
    /**
     * Get all chats for user - fetches from API and caches locally
     */
    fun getChats(userId: String): Flow<Result<List<Chat>>> = flow {
        // First emit cached data
        val cachedChats = chatDao.getAllChats().map { it.toChat() }
        if (cachedChats.isNotEmpty()) {
            emit(Result.success(cachedChats))
        }
        
        // Then fetch from API
        try {
            val response = api.getChats(userId)
            if (response.isSuccessful && response.body() != null) {
                val chats = response.body()!!
                
                // Cache in local database
                val entities = chats.map { chat ->
                    ChatEntity(
                        id = chat.id,
                        participantIds = chat.participants.joinToString(","),
                        lastMessage = chat.lastMessage?.content,
                        lastMessageTime = chat.lastMessage?.timestamp,
                        unreadCount = chat.unreadCount,
                        updatedAt = chat.updatedAt,
                        isGroup = chat.isGroup,
                        groupName = chat.groupName,
                        groupIcon = chat.groupIconUrl
                    )
                }
                chatDao.insertAll(entities)
                
                emit(Result.success(chats))
            } else {
                if (cachedChats.isEmpty()) {
                    emit(Result.failure(Exception("Failed to fetch chats")))
                }
            }
        } catch (e: Exception) {
            if (cachedChats.isEmpty()) {
                emit(Result.failure(e))
            }
        }
    }.flowOn(Dispatchers.IO)
    
    /**
     * Get single chat by ID
     */
    suspend fun getChatById(chatId: String): Result<Chat> {
        return withContext(Dispatchers.IO) {
            try {
                // Try local first
                val cached = chatDao.getChatById(chatId)?.toChat()
                if (cached != null) {
                    return@withContext Result.success(cached)
                }
                
                // Fetch from API
                val response = api.getChat(chatId)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Chat not found"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Get messages for a chat - with pagination
     */
    fun getMessages(chatId: String, limit: Int = 50, offset: Int = 0): Flow<Result<List<Message>>> = flow {
        // First emit cached messages
        val cachedMessages = messageDao.getMessagesForChat(chatId, limit, offset).map { it.toMessage() }
        if (cachedMessages.isNotEmpty()) {
            emit(Result.success(cachedMessages))
        }
        
        // Then fetch from API
        try {
            val response = api.getMessages(chatId, limit, offset)
            if (response.isSuccessful && response.body() != null) {
                val messages = response.body()!!
                
                // Cache in local database
                val entities = messages.map { message ->
                    MessageEntity(
                        id = message.id,
                        conversationId = message.conversationId.ifEmpty { chatId },
                        senderId = message.senderId,
                        senderName = message.senderName,
                        content = message.content,
                        timestamp = message.timestamp,
                        type = message.type.name,
                        status = message.status.name,
                        replyTo = message.replyTo ?: message.replyToId,
                        mediaUrl = message.mediaUrl
                    )
                }
                messageDao.insertAll(entities)
                
                emit(Result.success(messages))
            } else {
                if (cachedMessages.isEmpty()) {
                    emit(Result.failure(Exception("Failed to fetch messages")))
                }
            }
        } catch (e: Exception) {
            if (cachedMessages.isEmpty()) {
                emit(Result.failure(e))
            }
        }
    }.flowOn(Dispatchers.IO)
    
    /**
     * Send a message - with offline support
     */
    suspend fun sendMessage(
        conversationId: String,
        content: String,
        type: MessageType = MessageType.TEXT,
        replyTo: String? = null,
        mediaUrl: String? = null
    ): Result<Message> {
        return withContext(Dispatchers.IO) {
            val localId = UUID.randomUUID().toString()
            val timestamp = System.currentTimeMillis()
            
            // Create pending message for offline support
            val pendingMessage = PendingMessageEntity(
                id = localId,
                conversationId = conversationId,
                content = content,
                messageType = type.name,
                replyToId = replyTo,
                mediaUri = mediaUrl,
                createdAt = timestamp,
                failed = false,
                retryCount = 0
            )
            pendingMessageDao.insert(pendingMessage)
            
            try {
                val request = SendMessageRequest(
                    conversationId = conversationId,
                    content = content,
                    type = type.name,
                    replyTo = replyTo,
                    mediaUrl = mediaUrl
                )
                
                val response = api.sendMessage(request)
                if (response.isSuccessful && response.body() != null) {
                    val message = response.body()!!
                    
                    // Save to local database
                    val entity = MessageEntity(
                        id = message.id,
                        conversationId = conversationId,
                        senderId = message.senderId,
                        senderName = message.senderName,
                        content = message.content,
                        timestamp = message.timestamp,
                        type = message.type.name,
                        status = MessageStatus.SENT.name,
                        replyTo = replyTo,
                        mediaUrl = mediaUrl
                    )
                    messageDao.insert(entity)
                    
                    // Remove from pending
                    pendingMessageDao.deleteById(localId)
                    
                    // Update chat's last message
                    chatDao.getChatById(conversationId)?.let { chat ->
                        chatDao.insert(chat.copy(
                            lastMessage = content,
                            lastMessageTime = timestamp,
                            updatedAt = timestamp
                        ))
                    }
                    
                    Result.success(message)
                } else {
                    pendingMessageDao.markFailed(localId)
                    Result.failure(Exception("Failed to send message"))
                }
            } catch (e: Exception) {
                pendingMessageDao.markFailed(localId)
                Result.failure(e)
            }
        }
    }
    
    /**
     * Retry sending failed messages
     */
    suspend fun retryPendingMessages(): Int {
        return withContext(Dispatchers.IO) {
            var successCount = 0
            val pendingMessages = pendingMessageDao.getAllPending()
            
            for (pending in pendingMessages) {
                try {
                    val request = SendMessageRequest(
                        conversationId = pending.conversationId,
                        content = pending.content,
                        type = pending.messageType,
                        replyTo = pending.replyToId,
                        mediaUrl = pending.mediaUri
                    )
                    
                    val response = api.sendMessage(request)
                    if (response.isSuccessful) {
                        pendingMessageDao.deleteById(pending.id)
                        successCount++
                    }
                } catch (e: Exception) {
                    pendingMessageDao.markFailed(pending.id)
                }
            }
            
            successCount
        }
    }
    
    /**
     * Create a new chat
     */
    suspend fun createChat(
        participants: List<String>,
        isGroup: Boolean = false,
        groupName: String? = null
    ): Result<Chat> {
        return withContext(Dispatchers.IO) {
            try {
                val request = CreateChatRequest(participants, isGroup, groupName)
                val response = api.createChat(request)
                
                if (response.isSuccessful && response.body() != null) {
                    val chat = response.body()!!
                    
                    // Cache locally
                    val entity = ChatEntity(
                        id = chat.id,
                        participantIds = chat.participants.joinToString(","),
                        lastMessage = null,
                        lastMessageTime = null,
                        unreadCount = 0,
                        updatedAt = chat.updatedAt,
                        isGroup = isGroup,
                        groupName = groupName,
                        groupIcon = null
                    )
                    chatDao.insert(entity)
                    
                    Result.success(chat)
                } else {
                    Result.failure(Exception("Failed to create chat"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Delete a chat
     */
    suspend fun deleteChat(chatId: String): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.deleteChat(chatId)
                if (response.isSuccessful) {
                    chatDao.deleteById(chatId)
                    messageDao.deleteAllForChat(chatId)
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Failed to delete chat"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Mark message as read
     */
    suspend fun markAsRead(messageId: String): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.markAsRead(messageId)
                if (response.isSuccessful) {
                    messageDao.markAsRead(messageId, System.currentTimeMillis())
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Failed to mark as read"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Add reaction to message
     */
    suspend fun addReaction(messageId: String, emoji: String): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.addReaction(messageId, ReactionRequest(emoji))
                if (response.isSuccessful) {
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Failed to add reaction"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Edit a message
     */
    suspend fun editMessage(messageId: String, content: String): Result<Message> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.editMessage(messageId, EditMessageRequest(content))
                if (response.isSuccessful && response.body() != null) {
                    val message = response.body()!!
                    // Update local DB
                    messageDao.getMessageById(messageId)?.let { entity ->
                        messageDao.insert(entity.copy(content = content))
                    }
                    Result.success(message)
                } else {
                    Result.failure(Exception("Failed to edit message"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Delete a message
     */
    suspend fun deleteMessage(messageId: String): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.deleteMessage(messageId)
                if (response.isSuccessful) {
                    messageDao.deleteById(messageId)
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Failed to delete message"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Add participant to group chat
     */
    suspend fun addParticipant(chatId: String, userId: String): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.addParticipant(chatId, ParticipantRequest(userId))
                if (response.isSuccessful) {
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Failed to add participant"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Remove participant from group chat
     */
    suspend fun removeParticipant(chatId: String, userId: String): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val response = api.removeParticipant(chatId, userId)
                if (response.isSuccessful) {
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Failed to remove participant"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Clear unread count for a chat
     */
    suspend fun clearUnreadCount(chatId: String) {
        withContext(Dispatchers.IO) {
            chatDao.clearUnreadCount(chatId)
        }
    }
    
    /**
     * Get total unread count
     */
    suspend fun getTotalUnreadCount(): Int {
        return withContext(Dispatchers.IO) {
            chatDao.getTotalUnreadCount() ?: 0
        }
    }
    
    /**
     * Get pending messages count
     */
    suspend fun getPendingMessagesCount(): Int {
        return withContext(Dispatchers.IO) {
            pendingMessageDao.getPendingCount()
        }
    }
}

// Extension functions for entity conversion
private fun ChatEntity.toChat(): Chat {
    return Chat(
        id = id,
        participants = participantIds.split(","),
        lastMessage = lastMessage?.let { 
            Message(
                id = "",
                conversationId = id,
                chatId = id,
                senderId = "",
                content = it,
                timestamp = lastMessageTime ?: 0L,
                type = MessageType.TEXT,
                status = MessageStatus.SENT
            )
        },
        unreadCount = unreadCount,
        updatedAt = updatedAt,
        isGroup = isGroup,
        groupName = groupName,
        groupIconUrl = groupIcon
    )
}
