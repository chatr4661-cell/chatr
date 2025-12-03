package com.chatr.app.data.api

import com.chatr.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface NotificationsApi {
    
    @GET("notifications")
    suspend fun getNotifications(
        @Query("limit") limit: Int = 50,
        @Query("unread") unread: Boolean = false
    ): Response<List<Notification>>
    
    @POST("notifications/read")
    suspend fun markNotificationsRead(@Body request: MarkNotificationsReadRequest): Response<Unit>
    
    @DELETE("notifications/{id}")
    suspend fun deleteNotification(@Path("id") notificationId: String): Response<Unit>
    
    @POST("send-push-notification")
    suspend fun sendPushNotification(@Body request: SendPushNotificationRequest): Response<Unit>
    
    @POST("send-chat-notification")
    suspend fun sendChatNotification(@Body request: SendChatNotificationRequest): Response<Unit>
}

// Request models
data class MarkNotificationsReadRequest(val notificationIds: List<String>)

data class SendPushNotificationRequest(
    val userId: String,
    val title: String,
    val body: String,
    val data: Map<String, String>? = null
)

data class SendChatNotificationRequest(
    val conversationId: String,
    val message: String
)

// Response models
data class Notification(
    val id: String,
    val userId: String,
    val title: String,
    val message: String,
    val type: String,
    val data: Map<String, Any>?,
    val read: Boolean = false,
    val createdAt: Long
)
