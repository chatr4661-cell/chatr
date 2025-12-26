package com.chatr.app.data.api

import com.chatr.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ChatrApi {
    
    // ==================== AUTH ====================
    @POST("auth/signup")
    suspend fun signUp(@Body request: SignUpRequest): Response<AuthResponse>
    
    @POST("auth/signin")
    suspend fun signIn(@Body request: SignInRequest): Response<AuthResponse>
    
    @POST("auth/signout")
    suspend fun signOut(): Response<Unit>
    
    @POST("auth-phone-otp")
    suspend fun sendOtp(@Body request: OtpRequest): Response<OtpSendResponse>
    
    @POST("auth-phone-otp")
    suspend fun verifyOtp(@Body request: OtpVerifyRequest): Response<AuthResponse>
    
    @GET("auth/user")
    suspend fun getCurrentUser(): Response<User>
    
    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<AuthResponse>
    
    // ==================== USERS ====================
    @GET("users/{userId}")
    suspend fun getUser(@Path("userId") userId: String): Response<User>
    
    @GET("users")
    suspend fun getUsers(): Response<List<User>>
    
    @PUT("users/{userId}")
    suspend fun updateUser(
        @Path("userId") userId: String,
        @Body request: UpdateUserRequest
    ): Response<User>
    
    @GET("users/search")
    suspend fun searchUsers(@Query("q") query: String): Response<List<User>>
    
    @POST("users/online-status")
    suspend fun updateOnlineStatus(@Body request: OnlineStatusRequest): Response<Unit>
    
    // ==================== CHATS ====================
    @GET("chats")
    suspend fun getChats(@Query("userId") userId: String): Response<List<Chat>>
    
    @POST("chats")
    suspend fun createChat(@Body request: CreateChatRequest): Response<Chat>
    
    @GET("chats/{chatId}")
    suspend fun getChat(@Path("chatId") chatId: String): Response<Chat>
    
    @DELETE("chats/{chatId}")
    suspend fun deleteChat(@Path("chatId") chatId: String): Response<Unit>
    
    @POST("chats/{chatId}/participants")
    suspend fun addParticipant(
        @Path("chatId") chatId: String,
        @Body request: ParticipantRequest
    ): Response<Unit>
    
    @DELETE("chats/{chatId}/participants/{userId}")
    suspend fun removeParticipant(
        @Path("chatId") chatId: String,
        @Path("userId") userId: String
    ): Response<Unit>
    
    // ==================== MESSAGES ====================
    @GET("chats/{chatId}/messages")
    suspend fun getMessages(
        @Path("chatId") chatId: String,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Response<List<Message>>
    
    @POST("messages")
    suspend fun sendMessage(@Body message: SendMessageRequest): Response<Message>
    
    @PUT("messages/{id}")
    suspend fun editMessage(
        @Path("id") messageId: String,
        @Body request: EditMessageRequest
    ): Response<Message>
    
    @DELETE("messages/{id}")
    suspend fun deleteMessage(@Path("id") messageId: String): Response<Unit>
    
    @POST("messages/{id}/read")
    suspend fun markAsRead(@Path("id") messageId: String): Response<Unit>
    
    @POST("messages/{id}/reaction")
    suspend fun addReaction(
        @Path("id") messageId: String,
        @Body request: ReactionRequest
    ): Response<Unit>
    
    // ==================== DEVICE ====================
    @POST("device/register")
    suspend fun registerDevice(@Body request: DeviceRegistrationRequest): Response<Unit>
    
    @POST("device/unregister")
    suspend fun unregisterDevice(@Body request: DeviceUnregisterRequest): Response<Unit>
}

// Request/Response models
data class SignUpRequest(
    val email: String?,
    val password: String?,
    val phoneNumber: String?
)

data class SignInRequest(
    val email: String?,
    val password: String?,
    val phone: String?,
    val otp: String?
)

data class OtpRequest(
    val phoneNumber: String,
    val action: String = "send"
)

data class OtpSendResponse(
    val success: Boolean,
    val message: String?
)

data class OtpVerifyRequest(
    val phoneNumber: String,
    val otp: String? = null,
    val firebaseUid: String? = null,
    val action: String = "verify"
)

data class RefreshTokenRequest(val refreshToken: String)

data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: User,
    val expiresIn: Long
)

data class UpdateUserRequest(
    val username: String?,
    val avatarUrl: String?,
    val bio: String?
)

data class OnlineStatusRequest(val isOnline: Boolean)

data class CreateChatRequest(
    val participants: List<String>,
    val isGroup: Boolean = false,
    val groupName: String? = null
)

data class ParticipantRequest(val userId: String)

data class SendMessageRequest(
    val conversationId: String,
    val content: String,
    val type: String = "TEXT",
    val replyTo: String? = null,
    val mediaUrl: String? = null
)

data class EditMessageRequest(val content: String)

data class ReactionRequest(val emoji: String)

data class DeviceRegistrationRequest(
    val userId: String? = null,
    val fcmToken: String,
    val platform: String = "android",
    val deviceModel: String? = null
)

data class DeviceUnregisterRequest(
    val fcmToken: String
)
