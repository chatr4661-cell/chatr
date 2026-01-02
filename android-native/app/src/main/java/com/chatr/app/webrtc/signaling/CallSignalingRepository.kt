package com.chatr.app.webrtc.signaling

import com.chatr.app.data.local.dao.CallDao
import com.chatr.app.data.local.entity.CallEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Call Signaling Repository - Abstracts signaling operations
 * 
 * Provides:
 * - Clean API for call signaling
 * - Call history persistence
 * - Missed call tracking
 */
@Singleton
class CallSignalingRepository @Inject constructor(
    private val signalingClient: CallSignalingClient,
    private val callDao: CallDao
) {
    
    /**
     * Get signaling events stream
     */
    val signalingEvents: Flow<CallSignalingEvent.Incoming> = signalingClient.events

    /**
     * Get connection state
     */
    val connectionState: Flow<SignalingConnectionState> = signalingClient.connectionState

    /**
     * Connect to signaling for a call
     */
    suspend fun connect(callId: String, token: String) {
        signalingClient.connect(callId, token)
    }

    /**
     * Send SDP offer
     */
    suspend fun sendOffer(callId: String, sdp: String, isVideo: Boolean) {
        signalingClient.sendOffer(callId, sdp, isVideo)
    }

    /**
     * Send SDP answer
     */
    suspend fun sendAnswer(callId: String, sdp: String) {
        signalingClient.sendAnswer(callId, sdp)
    }

    /**
     * Send ICE candidate
     */
    suspend fun sendIceCandidate(callId: String, sdpMid: String, sdpMLineIndex: Int, candidate: String) {
        signalingClient.sendIceCandidate(callId, sdpMid, sdpMLineIndex, candidate)
    }

    /**
     * Accept incoming call
     */
    suspend fun acceptCall(callId: String) {
        signalingClient.sendAccept(callId)
        updateCallStatus(callId, "active")
    }

    /**
     * Reject incoming call
     */
    suspend fun rejectCall(callId: String, reason: RejectReason = RejectReason.DECLINED) {
        signalingClient.sendReject(callId, reason)
        updateCallStatus(callId, "rejected")
    }

    /**
     * Cancel outgoing call (before answered)
     */
    suspend fun cancelCall(callId: String) {
        signalingClient.sendCancel(callId)
        updateCallStatus(callId, "canceled")
    }

    /**
     * End active call
     */
    suspend fun endCall(callId: String) {
        signalingClient.sendEnd(callId)
        updateCallStatus(callId, "ended")
    }

    /**
     * Report busy (already on another call)
     */
    suspend fun reportBusy(callId: String, activeCallId: String?) {
        signalingClient.sendBusy(callId, activeCallId)
    }

    /**
     * Disconnect signaling
     */
    suspend fun disconnect() {
        signalingClient.disconnect()
    }

    /**
     * Mark call as missed
     */
    suspend fun markAsMissed(callId: String) {
        callDao.updateCallStatus(callId, "missed")
        callDao.markAsMissed(callId)
    }

    /**
     * Get call history
     */
    fun getCallHistory(limit: Int = 50): Flow<List<CallEntity>> {
        return callDao.getCallHistory(limit)
    }

    /**
     * Get missed calls count
     */
    fun getMissedCallsCount(): Flow<Int> {
        return callDao.getUnseen()
    }

    /**
     * Mark calls as seen
     */
    suspend fun markCallsAsSeen() {
        callDao.markAllAsSeen()
    }

    /**
     * Save call to local database
     */
    suspend fun saveCall(call: CallEntity) {
        callDao.insertCall(call)
    }

    private suspend fun updateCallStatus(callId: String, status: String) {
        callDao.updateCallStatus(callId, status)
    }
}
