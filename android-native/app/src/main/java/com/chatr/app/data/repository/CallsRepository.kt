package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CallsRepository @Inject constructor(
    private val api: CallsApi
) {
    
    suspend fun initiateCall(receiverId: String, type: String): Result<CallData> {
        return safeApiCall { 
            api.initiateCall(InitiateCallRequest(receiverId, type)) 
        }
    }
    
    suspend fun acceptCall(callId: String): Result<CallData> {
        return safeApiCall { api.acceptCall(callId) }
    }
    
    suspend fun rejectCall(callId: String): Result<CallData> {
        return safeApiCall { api.rejectCall(callId) }
    }
    
    suspend fun endCall(callId: String): Result<CallData> {
        return safeApiCall { api.endCall(callId) }
    }
    
    fun getCallHistory(limit: Int = 50): Flow<Result<List<CallData>>> = flow {
        emit(safeApiCall { api.getCallHistory(limit) })
    }
    
    suspend fun getTurnCredentials(): Result<TurnCredentials> {
        return safeApiCall { api.getTurnCredentials() }
    }
    
    suspend fun sendSignal(callId: String, type: String, sdp: String? = null, candidate: String? = null): Result<Unit> {
        return safeApiCall {
            api.sendSignal(WebRTCSignalRequest(callId, type, sdp, candidate))
        }
    }
}
