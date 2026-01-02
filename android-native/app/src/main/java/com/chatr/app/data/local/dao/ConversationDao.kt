package com.chatr.app.data.local.dao

import androidx.room.*
import com.chatr.app.data.local.entity.ConversationEntity
import kotlinx.coroutines.flow.Flow

/**
 * DAO for Conversation operations
 */
@Dao
interface ConversationDao {
    
    @Query("SELECT * FROM conversations WHERE isArchived = 0 ORDER BY isPinned DESC, updatedAt DESC")
    fun getConversations(): Flow<List<ConversationEntity>>
    
    @Query("SELECT * FROM conversations WHERE isArchived = 1 ORDER BY updatedAt DESC")
    fun getArchivedConversations(): Flow<List<ConversationEntity>>
    
    @Query("SELECT * FROM conversations WHERE id = :conversationId")
    fun getConversation(conversationId: String): Flow<ConversationEntity?>
    
    @Query("SELECT * FROM conversations WHERE id = :conversationId")
    suspend fun getConversationOnce(conversationId: String): ConversationEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(conversation: ConversationEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(conversations: List<ConversationEntity>)
    
    @Update
    suspend fun update(conversation: ConversationEntity)
    
    @Query("UPDATE conversations SET isPinned = :isPinned WHERE id = :conversationId")
    suspend fun updatePinned(conversationId: String, isPinned: Boolean)
    
    @Query("UPDATE conversations SET isMuted = :isMuted WHERE id = :conversationId")
    suspend fun updateMuted(conversationId: String, isMuted: Boolean)
    
    @Query("UPDATE conversations SET isArchived = :isArchived WHERE id = :conversationId")
    suspend fun updateArchived(conversationId: String, isArchived: Boolean)
    
    @Query("UPDATE conversations SET unreadCount = :count WHERE id = :conversationId")
    suspend fun updateUnreadCount(conversationId: String, count: Int)
    
    @Query("UPDATE conversations SET unreadCount = 0 WHERE id = :conversationId")
    suspend fun markAsRead(conversationId: String)
    
    @Query("""
        UPDATE conversations SET 
            lastMessageId = :messageId,
            lastMessageContent = :content,
            lastMessageSenderId = :senderId,
            lastMessageTimestamp = :timestamp,
            updatedAt = :timestamp
        WHERE id = :conversationId
    """)
    suspend fun updateLastMessage(
        conversationId: String,
        messageId: String,
        content: String,
        senderId: String,
        timestamp: Long
    )
    
    @Delete
    suspend fun delete(conversation: ConversationEntity)
    
    @Query("DELETE FROM conversations WHERE id = :conversationId")
    suspend fun deleteById(conversationId: String)
    
    @Query("DELETE FROM conversations")
    suspend fun deleteAll()
}
