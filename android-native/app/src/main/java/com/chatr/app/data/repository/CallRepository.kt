package com.chatr.app.data.repository

import com.chatr.app.data.api.ChatrApi
import com.chatr.app.data.models.CallData
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CallRepository @Inject constructor(
    private val api: ChatrApi
) {
    
    suspend fun initiateCall(callData: CallData): Result<CallData> {
        return try {
            val response = api.initiateCall(callData)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to initiate call"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun acceptCall(callId: String): Result<CallData> {
        return try {
            val response = api.acceptCall(callId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to accept call"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun rejectCall(callId: String): Result<CallData> {
        return try {
            val response = api.rejectCall(callId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to reject call"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun endCall(callId: String): Result<CallData> {
        return try {
            val response = api.endCall(callId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to end call"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
