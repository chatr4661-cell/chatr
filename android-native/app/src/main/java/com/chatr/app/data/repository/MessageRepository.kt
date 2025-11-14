package com.chatr.app.data.repository

import com.chatr.app.data.local.MessageDao
import com.chatr.app.data.model.Message
import com.chatr.app.data.model.MessageStatus
import com.chatr.app.services.SocketService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import org.json.JSONObject
import java.util.UUID

class MessageRepository(
    private val messageDao: MessageDao,
    private val socketService: SocketService
) {
    
    fun getMessagesForConversation(conversationId: String): Flow<List<Message>> {
        return messageDao.getMessagesForConversation(conversationId)
    }
    
    suspend fun getMessagesPaginated(conversationId: String, limit: Int, offset: Int): List<Message> {
        return messageDao.getMessagesPaginated(conversationId, limit, offset)
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
            senderId = senderId,
            senderName = senderName,
            content = content,
            type = com.chatr.app.data.model.MessageType.TEXT,
            timestamp = System.currentTimeMillis(),
            status = MessageStatus.PENDING,
            replyToId = replyToId
        )
        
        // Save to local DB first
        messageDao.insertMessage(message)
        
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
            messageDao.updateMessageStatus(message.id, MessageStatus.SENT.name)
        } catch (e: Exception) {
            // Mark as failed
            messageDao.updateMessageStatus(message.id, MessageStatus.FAILED.name)
        }
        
        return message
    }
    
    suspend fun sendMediaMessage(
        conversationId: String,
        senderId: String,
        senderName: String,
        mediaUrl: String,
        type: com.chatr.app.data.model.MessageType,
        thumbnailUrl: String? = null,
        localPath: String? = null
    ): Message {
        val message = Message(
            id = UUID.randomUUID().toString(),
            conversationId = conversationId,
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
        
        messageDao.insertMessage(message)
        return message
    }
    
    suspend fun retryPendingMessages() {
        val pendingMessages = messageDao.getPendingMessages()
        pendingMessages.forEach { message ->
            try {
                val json = JSONObject().apply {
                    put("id", message.id)
                    put("conversationId", message.conversationId)
                    put("senderId", message.senderId)
                    put("senderName", message.senderName)
                    put("content", message.content)
                    put("type", message.type.name)
                    put("timestamp", message.timestamp)
                    message.mediaUrl?.let { put("mediaUrl", it) }
                }
                socketService.sendMessage(json)
                messageDao.updateMessageStatus(message.id, MessageStatus.SENT.name)
            } catch (e: Exception) {
                // Keep as pending or mark as failed based on retry count
            }
        }
    }
    
    suspend fun handleIncomingMessage(json: JSONObject) {
        val message = Message(
            id = json.getString("id"),
            conversationId = json.getString("conversationId"),
            senderId = json.getString("senderId"),
            senderName = json.getString("senderName"),
            content = json.optString("content", ""),
            type = com.chatr.app.data.model.MessageType.valueOf(json.getString("type")),
            timestamp = json.getLong("timestamp"),
            status = MessageStatus.DELIVERED,
            mediaUrl = json.optString("mediaUrl"),
            thumbnailUrl = json.optString("thumbnailUrl")
        )
        
        messageDao.insertMessage(message)
        
        // Send delivery receipt
        socketService.markAsDelivered(message.id)
    }
    
    suspend fun markMessagesAsRead(conversationId: String, currentUserId: String) {
        val readAt = System.currentTimeMillis()
        messageDao.markConversationAsRead(conversationId, currentUserId, readAt)
        
        // Get unread message IDs and send read receipts
        val messages = messageDao.getMessagesForConversation(conversationId).first()
        val unreadIds = messages.filter { 
            it.senderId != currentUserId && it.readAt == null 
        }.map { it.id }
        
        if (unreadIds.isNotEmpty()) {
            socketService.markAsRead(unreadIds)
        }
    }
    
    suspend fun addReaction(messageId: String, emoji: String, userId: String) {
        val message = messageDao.getMessageById(messageId) ?: return
        val updatedReactions = message.reactions.toMutableList()
        
        // Remove existing reaction from this user
        updatedReactions.removeAll { it.userId == userId }
        
        // Add new reaction
        updatedReactions.add(
            com.chatr.app.data.model.Reaction(
                userId = userId,
                emoji = emoji,
                timestamp = System.currentTimeMillis()
            )
        )
        
        messageDao.updateMessage(message.copy(reactions = updatedReactions))
        socketService.sendReaction(messageId, emoji)
    }
    
    suspend fun updateUploadProgress(messageId: String, progress: Int) {
        messageDao.updateUploadProgress(messageId, progress)
    }
}
