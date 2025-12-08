package com.chatr.app.data.repository

import com.chatr.app.data.local.dao.MessageDao
import com.chatr.app.data.local.entity.MessageEntity
import com.chatr.app.data.local.entity.SyncStatus
import com.chatr.app.data.models.Message
import com.chatr.app.data.models.MessageStatus
import com.chatr.app.data.models.MessageType
import com.chatr.app.services.SocketService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONObject
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MessageRepository @Inject constructor(
    private val messageDao: MessageDao,
    private val socketService: SocketService
) {
    
    fun getMessagesForConversation(conversationId: String): Flow<List<Message>> {
        return messageDao.getMessagesForConversation(conversationId).map { entities ->
            entities.map { it.toMessage() }
        }
    }
    
    suspend fun getMessagesPaginated(conversationId: String, limit: Int, offset: Int): List<Message> {
        return messageDao.getMessagesForChat(conversationId, limit, offset).map { it.toMessage() }
    }
    
    suspend fun sendTextMessage(
        conversationId: String,
        senderId: String,
        senderName: String,
        content: String,
        replyToId: String? = null
    ): Message {
        val message = Message(
            id = UUID.randomUUID().toString(),
            conversationId = conversationId,
            chatId = conversationId,
            senderId = senderId,
            senderName = senderName,
            content = content,
            type = MessageType.TEXT,
            timestamp = System.currentTimeMillis(),
            status = MessageStatus.PENDING,
            replyToId = replyToId
        )
        
        // Save to local DB first
        messageDao.insertMessage(MessageEntity.fromMessage(message))
        
        // Send via socket
        try {
            val json = JSONObject().apply {
                put("id", message.id)
                put("conversationId", conversationId)
                put("senderId", senderId)
                put("senderName", senderName)
                put("content", content)
                put("type", "TEXT")
                put("timestamp", message.timestamp)
                replyToId?.let { put("replyToId", it) }
            }
            socketService.sendMessage(json)
            
            // Update status to SENT
            messageDao.updateSyncStatus(message.id, SyncStatus.SYNCED)
        } catch (e: Exception) {
            // Mark as failed
            messageDao.updateSyncStatus(message.id, SyncStatus.FAILED)
        }
        
        return message
    }
    
    suspend fun sendMediaMessage(
        conversationId: String,
        senderId: String,
        senderName: String,
        mediaUrl: String,
        type: MessageType,
        thumbnailUrl: String? = null,
        localPath: String? = null
    ): Message {
        val message = Message(
            id = UUID.randomUUID().toString(),
            conversationId = conversationId,
            chatId = conversationId,
            senderId = senderId,
            senderName = senderName,
            content = "",
            type = type,
            timestamp = System.currentTimeMillis(),
            status = MessageStatus.PENDING,
            mediaUrl = mediaUrl,
            thumbnailUrl = thumbnailUrl,
            localPath = localPath
        )
        
        messageDao.insertMessage(MessageEntity.fromMessage(message))
        return message
    }
    
    suspend fun retryPendingMessages() {
        val pendingMessages = messageDao.getPendingMessages(SyncStatus.PENDING)
        pendingMessages.forEach { entity ->
            try {
                val json = JSONObject().apply {
                    put("id", entity.id)
                    put("conversationId", entity.conversationId)
                    put("senderId", entity.senderId)
                    put("senderName", entity.senderName)
                    put("content", entity.content)
                    put("type", entity.type)
                    put("timestamp", entity.timestamp)
                    entity.mediaUrl?.let { put("mediaUrl", it) }
                }
                socketService.sendMessage(json)
                messageDao.updateSyncStatus(entity.id, SyncStatus.SYNCED)
            } catch (e: Exception) {
                // Keep as pending or mark as failed based on retry count
            }
        }
    }
    
    suspend fun handleIncomingMessage(json: JSONObject) {
        val entity = MessageEntity(
            id = json.getString("id"),
            conversationId = json.getString("conversationId"),
            senderId = json.getString("senderId"),
            senderName = json.optString("senderName"),
            content = json.optString("content", ""),
            type = json.optString("type", "TEXT"),
            timestamp = json.getLong("timestamp"),
            status = MessageStatus.DELIVERED.name,
            mediaUrl = json.optString("mediaUrl").takeIf { it.isNotEmpty() }
        )
        
        messageDao.insertMessage(entity)
        
        // Send delivery receipt
        socketService.markAsDelivered(entity.id)
    }
    
    suspend fun markMessagesAsRead(conversationId: String, currentUserId: String) {
        val readAt = System.currentTimeMillis()
        
        // Get unread message IDs and send read receipts
        val entities = messageDao.getMessagesForConversation(conversationId).first()
        val unreadIds = entities.filter { 
            it.senderId != currentUserId && it.readAt == null 
        }.map { it.id }
        
        // Mark as read locally
        unreadIds.forEach { messageId ->
            messageDao.markAsRead(messageId, readAt)
        }
        
        if (unreadIds.isNotEmpty()) {
            socketService.markAsRead(unreadIds)
        }
    }
    
    suspend fun addReaction(messageId: String, emoji: String, userId: String) {
        // Just send reaction via socket - no local reactions tracking needed
        socketService.sendReaction(messageId, emoji)
    }
    
    suspend fun updateUploadProgress(messageId: String, progress: Int) {
        // Progress is tracked in-memory, not in DB
    }
}
