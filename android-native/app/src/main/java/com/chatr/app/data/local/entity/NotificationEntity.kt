package com.chatr.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.chatr.app.data.api.Notification

@Entity(tableName = "notifications")
data class NotificationEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val title: String,
    val message: String,
    val type: String,
    val data: Map<String, Any>?,
    val read: Boolean = false,
    val createdAt: Long
) {
    fun toNotification(): Notification {
        return Notification(
            id = id,
            userId = userId,
            title = title,
            message = message,
            type = type,
            data = data,
            read = read,
            createdAt = createdAt
        )
    }
    
    companion object {
        fun fromNotification(notification: Notification): NotificationEntity {
            return NotificationEntity(
                id = notification.id,
                userId = notification.userId,
                title = notification.title,
                message = notification.message,
                type = notification.type,
                data = notification.data,
                read = notification.read,
                createdAt = notification.createdAt
            )
        }
    }
}
