package com.chatr.app.data.local.dao

import androidx.room.*
import com.chatr.app.data.local.entity.NotificationEntity

@Dao
interface NotificationDao {
    
    @Query("SELECT * FROM notifications ORDER BY createdAt DESC LIMIT :limit")
    suspend fun getAll(limit: Int): List<NotificationEntity>
    
    @Query("SELECT * FROM notifications WHERE read = 0 ORDER BY createdAt DESC")
    suspend fun getUnread(): List<NotificationEntity>
    
    @Query("SELECT * FROM notifications WHERE id = :notificationId")
    suspend fun getById(notificationId: String): NotificationEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(notification: NotificationEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(notifications: List<NotificationEntity>)
    
    @Query("DELETE FROM notifications WHERE id = :notificationId")
    suspend fun deleteById(notificationId: String)
    
    @Query("DELETE FROM notifications")
    suspend fun deleteAll()
    
    @Query("UPDATE notifications SET read = 1 WHERE id = :notificationId")
    suspend fun markAsRead(notificationId: String)
    
    @Query("UPDATE notifications SET read = 1")
    suspend fun markAllAsRead()
    
    @Query("SELECT COUNT(*) FROM notifications WHERE read = 0")
    suspend fun getUnreadCount(): Int
}
