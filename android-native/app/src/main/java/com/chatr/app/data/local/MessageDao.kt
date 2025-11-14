package com.chatr.app.data.local

import androidx.room.*
import com.chatr.app.data.model.Message
import kotlinx.coroutines.flow.Flow

@Dao
interface MessageDao {
    @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY timestamp ASC")
    fun getMessagesForConversation(conversationId: String): Flow<List<Message>>
    
    @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY timestamp ASC LIMIT :limit OFFSET :offset")
    suspend fun getMessagesPaginated(conversationId: String, limit: Int, offset: Int): List<Message>
    
    @Query("SELECT * FROM messages WHERE id = :messageId")
    suspend fun getMessageById(messageId: String): Message?
    
    @Query("SELECT * FROM messages WHERE status = 'PENDING' OR status = 'FAILED' ORDER BY timestamp ASC")
    suspend fun getPendingMessages(): List<Message>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: Message)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<Message>)
    
    @Update
    suspend fun updateMessage(message: Message)
    
    @Delete
    suspend fun deleteMessage(message: Message)
    
    @Query("DELETE FROM messages WHERE conversationId = :conversationId")
    suspend fun deleteConversationMessages(conversationId: String)
    
    @Query("UPDATE messages SET status = :status WHERE id = :messageId")
    suspend fun updateMessageStatus(messageId: String, status: String)
    
    @Query("UPDATE messages SET readAt = :readAt, status = 'READ' WHERE conversationId = :conversationId AND senderId != :currentUserId AND readAt IS NULL")
    suspend fun markConversationAsRead(conversationId: String, currentUserId: String, readAt: Long)
    
    @Query("SELECT COUNT(*) FROM messages WHERE conversationId = :conversationId AND senderId != :currentUserId AND readAt IS NULL")
    fun getUnreadCount(conversationId: String, currentUserId: String): Flow<Int>
    
    @Query("UPDATE messages SET uploadProgress = :progress WHERE id = :messageId")
    suspend fun updateUploadProgress(messageId: String, progress: Int)
}

@Database(entities = [Message::class], version = 1, exportSchema = false)
abstract class ChatDatabase : RoomDatabase() {
    abstract fun messageDao(): MessageDao
}
