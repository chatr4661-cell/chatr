package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationsRepository @Inject constructor(
    private val api: NotificationsApi
) {
    
    fun getNotifications(limit: Int = 50, unreadOnly: Boolean = false): Flow<Result<List<Notification>>> = flow {
        emit(safeApiCall { api.getNotifications(limit, unreadOnly) })
    }
    
    suspend fun markNotificationsRead(notificationIds: List<String>): Result<Unit> {
        return safeApiCall {
            api.markNotificationsRead(MarkNotificationsReadRequest(notificationIds))
        }
    }
    
    suspend fun deleteNotification(notificationId: String): Result<Unit> {
        return safeApiCall { api.deleteNotification(notificationId) }
    }
    
    suspend fun sendPushNotification(
        userId: String,
        title: String,
        body: String,
        data: Map<String, String>? = null
    ): Result<Unit> {
        return safeApiCall {
            api.sendPushNotification(SendPushNotificationRequest(userId, title, body, data))
        }
    }
    
    suspend fun sendChatNotification(conversationId: String, message: String): Result<Unit> {
        return safeApiCall {
            api.sendChatNotification(SendChatNotificationRequest(conversationId, message))
        }
    }
}
