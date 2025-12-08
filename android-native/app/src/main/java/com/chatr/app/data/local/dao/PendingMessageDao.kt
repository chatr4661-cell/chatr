package com.chatr.app.data.local.dao

import androidx.room.*
import com.chatr.app.data.local.entity.PendingMessageEntity

@Dao
interface PendingMessageDao {
    
    @Query("SELECT * FROM pending_messages WHERE failed = 0 ORDER BY createdAt ASC")
    suspend fun getAllPending(): List<PendingMessageEntity>
    
    @Query("SELECT * FROM pending_messages WHERE conversationId = :chatId ORDER BY createdAt ASC")
    suspend fun getPendingForChat(chatId: String): List<PendingMessageEntity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: PendingMessageEntity)
    
    @Query("DELETE FROM pending_messages WHERE id = :messageId")
    suspend fun delete(messageId: String)
    
    @Query("DELETE FROM pending_messages WHERE id = :messageId")
    suspend fun deleteById(messageId: String)
    
    @Query("DELETE FROM pending_messages")
    suspend fun deleteAll()
    
    @Query("UPDATE pending_messages SET failed = 1, retryCount = retryCount + 1 WHERE id = :messageId")
    suspend fun markFailed(messageId: String)
    
    @Query("UPDATE pending_messages SET retryCount = retryCount + 1 WHERE id = :messageId")
    suspend fun incrementRetry(messageId: String)
    
    @Query("UPDATE pending_messages SET failed = 0 WHERE id = :messageId")
    suspend fun resetFailed(messageId: String)
    
    @Query("SELECT COUNT(*) FROM pending_messages WHERE failed = 0")
    suspend fun getPendingCount(): Int
}
