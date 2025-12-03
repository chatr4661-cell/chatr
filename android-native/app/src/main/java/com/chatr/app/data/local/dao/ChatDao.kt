package com.chatr.app.data.local.dao

import androidx.room.*
import com.chatr.app.data.local.entity.ChatEntity

@Dao
interface ChatDao {
    
    @Query("SELECT * FROM chats ORDER BY updatedAt DESC")
    suspend fun getAllChats(): List<ChatEntity>
    
    @Query("SELECT * FROM chats WHERE id = :chatId")
    suspend fun getChatById(chatId: String): ChatEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(chat: ChatEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(chats: List<ChatEntity>)
    
    @Query("DELETE FROM chats WHERE id = :chatId")
    suspend fun deleteById(chatId: String)
    
    @Query("DELETE FROM chats")
    suspend fun deleteAll()
    
    @Query("UPDATE chats SET unreadCount = unreadCount + 1 WHERE id = :chatId")
    suspend fun incrementUnreadCount(chatId: String)
    
    @Query("UPDATE chats SET unreadCount = 0 WHERE id = :chatId")
    suspend fun clearUnreadCount(chatId: String)
    
    @Query("SELECT COUNT(*) FROM chats WHERE unreadCount > 0")
    suspend fun getTotalUnreadChats(): Int
    
    @Query("SELECT SUM(unreadCount) FROM chats")
    suspend fun getTotalUnreadCount(): Int
}
