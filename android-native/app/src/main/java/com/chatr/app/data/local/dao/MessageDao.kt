package com.chatr.app.data.local.dao

import androidx.room.*
import com.chatr.app.data.local.entity.MessageEntity

@Dao
interface MessageDao {
    
    @Query("SELECT * FROM messages WHERE conversationId = :chatId ORDER BY timestamp DESC LIMIT :limit OFFSET :offset")
    suspend fun getMessagesForChat(chatId: String, limit: Int, offset: Int): List<MessageEntity>
    
    @Query("SELECT * FROM messages WHERE id = :messageId")
    suspend fun getMessageById(messageId: String): MessageEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: MessageEntity)
    
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
    
    @Query("SELECT COUNT(*) FROM messages WHERE conversationId = :chatId AND readAt IS NULL AND senderId != :currentUserId")
    suspend fun getUnreadCountForChat(chatId: String, currentUserId: String): Int
}
