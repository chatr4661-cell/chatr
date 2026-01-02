package com.chatr.app.domain.repository

import com.chatr.app.domain.model.CallSession
import com.chatr.app.domain.model.CallStatus
import com.chatr.app.domain.model.CallType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

/**
 * Call repository interface
 * Telecom-grade calling operations
 */
interface CallRepository {
    
    /**
     * Current active call session
     */
    val activeCall: StateFlow<CallSession?>
    
    /**
     * Call history
     */
    fun getCallHistory(limit: Int = 50): Flow<List<CallSession>>
    
    /**
     * Initiate outgoing call
     */
    suspend fun initiateCall(
        userId: String,
        phoneNumber: String,
        displayName: String?,
        callType: CallType
    ): Result<CallSession>
    
    /**
     * Accept incoming call
     */
    suspend fun acceptCall(callId: String): Result<CallSession>
    
    /**
     * Reject incoming call
     */
    suspend fun rejectCall(callId: String): Result<Unit>
    
    /**
     * End active call
     */
    suspend fun endCall(callId: String): Result<Unit>
    
    /**
     * Toggle mute
     */
    suspend fun toggleMute(isMuted: Boolean): Result<Unit>
    
    /**
     * Toggle speaker
     */
    suspend fun toggleSpeaker(isSpeaker: Boolean): Result<Unit>
    
    /**
     * Toggle video (for video calls)
     */
    suspend fun toggleVideo(isVideoEnabled: Boolean): Result<Unit>
    
    /**
     * Switch camera (front/back)
     */
    suspend fun switchCamera(): Result<Unit>
    
    /**
     * Hold/unhold call
     */
    suspend fun holdCall(isOnHold: Boolean): Result<Unit>
    
    /**
     * Update call status in backend
     */
    suspend fun updateCallStatus(callId: String, status: CallStatus): Result<Unit>
    
    /**
     * Get missed calls count
     */
    fun getMissedCallsCount(): Flow<Int>
    
    /**
     * Mark calls as seen
     */
    suspend fun markCallsAsSeen(): Result<Unit>
    
    /**
     * Handle incoming call notification
     */
    suspend fun handleIncomingCall(
        callId: String,
        callerId: String,
        callerName: String?,
        callerPhone: String?,
        callerAvatar: String?,
        callType: CallType
    ): Result<CallSession>
}
