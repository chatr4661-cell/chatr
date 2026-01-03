package com.chatr.app.data.local.dao

import androidx.room.*
import com.chatr.app.data.local.entity.MessageEntity
import com.chatr.app.data.local.entity.SyncStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface MessageDao {
    
    @Query("SELECT * FROM messages WHERE conversationId = :chatId ORDER BY timestamp DESC LIMIT :limit OFFSET :offset")
    suspend fun getMessagesForChat(chatId: String, limit: Int, offset: Int): List<MessageEntity>
    
    @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY timestamp ASC")
    fun getMessagesForConversation(conversationId: String): Flow<List<MessageEntity>>
    
    @Query("SELECT * FROM messages WHERE id = :messageId")
    suspend fun getMessageById(messageId: String): MessageEntity?
    
    @Query("SELECT * FROM messages WHERE syncStatus = :status ORDER BY timestamp ASC")
    suspend fun getPendingMessages(status: SyncStatus): List<MessageEntity>
    
    @Query("SELECT MAX(timestamp) FROM messages WHERE conversationId = :conversationId")
    suspend fun getLastMessageTime(conversationId: String): Long?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: MessageEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: MessageEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(messages: List<MessageEntity>)
    
    @Query("DELETE FROM messages WHERE id = :messageId")
    suspend fun deleteById(messageId: String)
    
    @Query("DELETE FROM messages WHERE conversationId = :chatId")
    suspend fun deleteAllForChat(chatId: String)
    
    @Query("DELETE FROM messages")
    suspend fun deleteAll()
    
    @Query("UPDATE messages SET readAt = :readAt, status = 'READ' WHERE id = :messageId")
    suspend fun markAsRead(messageId: String, readAt: Long)
    
    @Query("UPDATE messages SET status = :status, deliveredAt = :deliveredAt, readAt = :readAt WHERE id = :messageId")
    suspend fun updateStatus(messageId: String, status: String, deliveredAt: Long?, readAt: Long?)
    
    // Simple status update (for delivery/read receipts)
    @Query("UPDATE messages SET status = :status WHERE id = :messageId")
    suspend fun updateStatus(messageId: String, status: String)
    
    @Query("UPDATE messages SET syncStatus = :status WHERE id = :messageId")
    suspend fun updateSyncStatus(messageId: String, status: SyncStatus)
    
    @Query("SELECT COUNT(*) FROM messages WHERE conversationId = :chatId AND readAt IS NULL AND senderId != :currentUserId")
    suspend fun getUnreadCountForChat(chatId: String, currentUserId: String): Int
    
    // GSM-grade: Get messages by sender and status (for delivery polling)
    @Query("SELECT * FROM messages WHERE senderId = :senderId AND status = :status ORDER BY timestamp DESC LIMIT 100")
    suspend fun getMessagesByStatus(senderId: String, status: String): List<MessageEntity>
    
    // GSM-grade: Get messages ordered by sequence number
    @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY sequenceNumber ASC, timestamp ASC")
    fun getMessagesOrdered(conversationId: String): Flow<List<MessageEntity>>
    
    // GSM-grade: Check for duplicate by client ID
    @Query("SELECT EXISTS(SELECT 1 FROM messages WHERE clientId = :clientId)")
    suspend fun existsByClientId(clientId: String): Boolean
    
    // Get unread messages for marking as read
    @Query("SELECT id FROM messages WHERE conversationId = :conversationId AND status != 'read' AND senderId != :userId")
    suspend fun getUnreadMessageIds(conversationId: String, userId: String): List<String>
}
