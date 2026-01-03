package com.chatr.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface CallsApi {
    
    @POST("calls/initiate")
    suspend fun initiateCall(@Body request: InitiateCallRequest): Response<CallDataResponse>
    
    @POST("calls/{callId}/accept")
    suspend fun acceptCall(@Path("callId") callId: String): Response<CallDataResponse>
    
    @POST("calls/{callId}/reject")
    suspend fun rejectCall(@Path("callId") callId: String): Response<CallDataResponse>
    
    @POST("calls/{callId}/end")
    suspend fun endCall(@Path("callId") callId: String): Response<CallDataResponse>
    
    @GET("calls/history")
    suspend fun getCallHistory(@Query("limit") limit: Int = 50): Response<List<CallDataResponse>>
    
    @POST("get-turn-credentials")
    suspend fun getTurnCredentials(): Response<TurnCredentials>
    
    @POST("webrtc-signaling")
    suspend fun sendSignal(@Body request: WebRTCSignalRequest): Response<Unit>
}

// Request models
data class InitiateCallRequest(
    val receiverId: String,
    val type: String // "audio" or "video"
)

data class WebRTCSignalRequest(
    val callId: String,
    val type: String, // "offer", "answer", "candidate"
    val sdp: String? = null,
    val candidate: String? = null
)

// Response models - renamed to avoid conflict with domain models
data class CallDataResponse(
    val id: String,
    val callerId: String,
    val receiverId: String,
    val type: String,
    val status: String,
    val startTime: Long? = null,
    val endTime: Long? = null,
    val duration: Int? = null,
    val callerName: String? = null,
    val callerAvatar: String? = null,
    val receiverName: String? = null,
    val receiverAvatar: String? = null
)

data class TurnCredentials(
    val urls: List<String>,
    val username: String,
    val credential: String
)
