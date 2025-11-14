package com.chatr.app.data.api

import com.chatr.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ChatrApi {
    
    @GET("users/{userId}")
    suspend fun getUser(@Path("userId") userId: String): Response<User>
    
    @GET("users")
    suspend fun getUsers(): Response<List<User>>
    
    @GET("chats")
    suspend fun getChats(@Query("userId") userId: String): Response<List<Chat>>
    
    @GET("chats/{chatId}/messages")
    suspend fun getMessages(
        @Path("chatId") chatId: String,
        @Query("limit") limit: Int = 50
    ): Response<List<Message>>
    
    @POST("messages")
    suspend fun sendMessage(@Body message: Message): Response<Message>
    
    @POST("calls/initiate")
    suspend fun initiateCall(@Body callData: CallData): Response<CallData>
    
    @POST("calls/{callId}/accept")
    suspend fun acceptCall(@Path("callId") callId: String): Response<CallData>
    
    @POST("calls/{callId}/reject")
    suspend fun rejectCall(@Path("callId") callId: String): Response<CallData>
    
    @POST("calls/{callId}/end")
    suspend fun endCall(@Path("callId") callId: String): Response<CallData>
    
    @POST("device/register")
    suspend fun registerDevice(@Body request: DeviceRegistrationRequest): Response<Unit>
    
    @POST("contacts/sync")
    suspend fun syncContacts(@Body contacts: List<ContactInfo>): Response<List<User>>
}

data class DeviceRegistrationRequest(
    val userId: String,
    val fcmToken: String,
    val platform: String = "android"
)

data class ContactInfo(
    val name: String,
    val phoneNumber: String?,
    val email: String?
)
