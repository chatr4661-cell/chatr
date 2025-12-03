package com.chatr.app.data.repository

import android.os.Build
import com.chatr.app.data.api.*
import com.chatr.app.data.local.ChatrDatabase
import com.chatr.app.data.local.entity.NotificationEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationsRepository @Inject constructor(
    private val api: NotificationsApi,
    private val chatrApi: ChatrApi,
    private val database: ChatrDatabase
) {
    
    private val notificationDao get() = database.notificationDao()
    
    fun getNotifications(limit: Int = 50, unreadOnly: Boolean = false): Flow<Result<List<Notification>>> = flow {
        // First emit cached
        val cached = notificationDao.getAll(limit)
        if (cached.isNotEmpty()) {
            emit(Result.success(cached.map { it.toNotification() }))
        }
        
        // Then fetch fresh
        val result = safeApiCall { api.getNotifications(limit, unreadOnly) }
        result.onSuccess { notifications ->
            withContext(Dispatchers.IO) {
                notificationDao.insertAll(notifications.map { NotificationEntity.fromNotification(it) })
            }
            emit(Result.success(notifications))
        }.onFailure { error ->
            if (cached.isEmpty()) {
                emit(Result.failure(error))
            }
        }
    }.flowOn(Dispatchers.IO)
    
    suspend fun markNotificationsRead(notificationIds: List<String>): Result<Unit> {
        return safeApiCall {
            api.markNotificationsRead(MarkNotificationsReadRequest(notificationIds))
        }.onSuccess {
            notificationIds.forEach { id ->
                notificationDao.markAsRead(id)
            }
        }
    }
    
    suspend fun deleteNotification(notificationId: String): Result<Unit> {
        return safeApiCall { api.deleteNotification(notificationId) }
            .onSuccess { notificationDao.deleteById(notificationId) }
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
    
    // Device registration for FCM
    suspend fun registerDevice(fcmToken: String, platform: String = "android"): Result<Unit> {
        return safeApiCall {
            chatrApi.registerDevice(DeviceRegistrationRequest(
                fcmToken = fcmToken,
                platform = platform,
                deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}"
            ))
        }
    }
    
    suspend fun unregisterDevice(fcmToken: String): Result<Unit> {
        return safeApiCall {
            chatrApi.unregisterDevice(DeviceUnregisterRequest(fcmToken))
        }
    }
    
    // Local notification management
    suspend fun getUnreadCount(): Int {
        return notificationDao.getUnreadCount()
    }
    
    suspend fun markAllAsRead() {
        notificationDao.markAllAsRead()
    }
    
    suspend fun clearAll() {
        notificationDao.deleteAll()
    }
}
