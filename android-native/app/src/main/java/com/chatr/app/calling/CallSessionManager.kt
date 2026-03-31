package com.chatr.app.calling

import android.util.Log
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              CALL SESSION MANAGER                                ║
 * ║                                                                  ║
 * ║  Thread-safe concurrent call session tracking                    ║
 * ║  Prevents: state mismatch, memory leaks, multi-call bugs       ║
 * ║                                                                  ║
 * ║  Design: ConcurrentHashMap<callId, CallSession>                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
@Singleton
class CallSessionManager @Inject constructor() {

    companion object {
        private const val TAG = "CallSessionManager"
        private const val MAX_CONCURRENT_CALLS = 2 // Active + held
    }

    private val sessions = ConcurrentHashMap<String, ActiveCallSession>()
    private val listeners = ConcurrentHashMap<String, MutableList<SessionListener>>()

    data class ActiveCallSession(
        val callId: String,
        val partnerId: String,
        val partnerName: String?,
        val partnerPhone: String?,
        val isVideo: Boolean,
        val isIncoming: Boolean,
        val createdAt: Long = System.currentTimeMillis(),
        var state: CallSessionState = CallSessionState.INITIALIZING,
        var startedAt: Long? = null,
        var iceState: String? = null,
        var signalingConnected: Boolean = false,
        var offerBuffered: Boolean = false,
        var answerBuffered: Boolean = false,
        var localSdp: String? = null,
        var remoteSdp: String? = null,
        var pendingIceCandidates: MutableList<IceCandidate> = mutableListOf(),
        var networkType: String? = null,
        var turnServerUsed: Boolean = false,
        var reconnectAttempts: Int = 0
    )

    data class IceCandidate(
        val sdpMid: String,
        val sdpMLineIndex: Int,
        val candidate: String
    )

    enum class CallSessionState {
        INITIALIZING,       // Service started, factory loading
        SIGNALING_CONNECTING, // Connecting to signaling
        SIGNALING_CONNECTED, // Signaling ready, waiting for offer
        OFFER_RECEIVED,     // Remote offer received (incoming)
        OFFER_SENT,         // Local offer sent (outgoing)
        ANSWER_RECEIVED,    // Answer received
        ANSWER_SENT,        // Answer sent (incoming)
        ICE_GATHERING,      // ICE candidates being gathered
        ICE_CONNECTED,      // ICE connection established
        ACTIVE,             // Call is active, audio flowing
        ON_HOLD,            // Call held
        RECONNECTING,       // ICE restart in progress
        ENDING,             // Teardown in progress
        ENDED               // Fully cleaned up
    }

    interface SessionListener {
        fun onStateChanged(callId: String, oldState: CallSessionState, newState: CallSessionState)
        fun onError(callId: String, error: String)
    }

    /**
     * Create a new call session
     */
    fun createSession(
        callId: String,
        partnerId: String,
        partnerName: String?,
        partnerPhone: String?,
        isVideo: Boolean,
        isIncoming: Boolean
    ): ActiveCallSession? {
        if (sessions.size >= MAX_CONCURRENT_CALLS) {
            Log.w(TAG, "❌ Max concurrent calls reached ($MAX_CONCURRENT_CALLS)")
            return null
        }

        val session = ActiveCallSession(
            callId = callId,
            partnerId = partnerId,
            partnerName = partnerName,
            partnerPhone = partnerPhone,
            isVideo = isVideo,
            isIncoming = isIncoming
        )
        sessions[callId] = session
        Log.d(TAG, "📞 Session created: ${callId.take(8)} (${if (isIncoming) "incoming" else "outgoing"})")
        return session
    }

    /**
     * Get a session by call ID
     */
    fun getSession(callId: String): ActiveCallSession? = sessions[callId]

    /**
     * Get the active (non-held) session
     */
    fun getActiveSession(): ActiveCallSession? {
        return sessions.values.firstOrNull { it.state == CallSessionState.ACTIVE }
    }

    /**
     * Get all sessions
     */
    fun getAllSessions(): List<ActiveCallSession> = sessions.values.toList()

    /**
     * Transition session state with validation
     */
    fun transitionState(callId: String, newState: CallSessionState): Boolean {
        val session = sessions[callId] ?: run {
            Log.w(TAG, "⚠️ No session for $callId")
            return false
        }

        val oldState = session.state

        // Validate transition
        if (!isValidTransition(oldState, newState)) {
            Log.w(TAG, "⚠️ Invalid transition: $oldState → $newState for ${callId.take(8)}")
            return false
        }

        session.state = newState

        if (newState == CallSessionState.ACTIVE && session.startedAt == null) {
            session.startedAt = System.currentTimeMillis()
        }

        Log.d(TAG, "🔄 State: $oldState → $newState for ${callId.take(8)}")

        // Notify listeners
        listeners[callId]?.forEach { it.onStateChanged(callId, oldState, newState) }

        // Auto-cleanup ended sessions after delay
        if (newState == CallSessionState.ENDED) {
            sessions.remove(callId)
            listeners.remove(callId)
            Log.d(TAG, "🧹 Session removed: ${callId.take(8)}")
        }

        return true
    }

    /**
     * Buffer ICE candidate (before remote description is set)
     */
    fun bufferIceCandidate(callId: String, sdpMid: String, sdpMLineIndex: Int, candidate: String) {
        sessions[callId]?.pendingIceCandidates?.add(
            IceCandidate(sdpMid, sdpMLineIndex, candidate)
        )
    }

    /**
     * Get and clear buffered ICE candidates
     */
    fun drainIceCandidates(callId: String): List<IceCandidate> {
        val session = sessions[callId] ?: return emptyList()
        val candidates = session.pendingIceCandidates.toList()
        session.pendingIceCandidates.clear()
        return candidates
    }

    /**
     * Register a session listener
     */
    fun addListener(callId: String, listener: SessionListener) {
        listeners.getOrPut(callId) { mutableListOf() }.add(listener)
    }

    fun removeListener(callId: String, listener: SessionListener) {
        listeners[callId]?.remove(listener)
    }

    /**
     * Check if there's an active call
     */
    fun hasActiveCall(): Boolean {
        return sessions.values.any { 
            it.state in listOf(
                CallSessionState.ACTIVE, 
                CallSessionState.ICE_CONNECTED,
                CallSessionState.RECONNECTING
            )
        }
    }

    /**
     * End all sessions
     */
    fun endAllSessions() {
        sessions.keys.forEach { callId ->
            transitionState(callId, CallSessionState.ENDING)
            transitionState(callId, CallSessionState.ENDED)
        }
    }

    /**
     * Get call duration in seconds
     */
    fun getCallDuration(callId: String): Long {
        val session = sessions[callId] ?: return 0
        val started = session.startedAt ?: return 0
        return (System.currentTimeMillis() - started) / 1000
    }

    private fun isValidTransition(from: CallSessionState, to: CallSessionState): Boolean {
        // Always allow ending/ended
        if (to == CallSessionState.ENDING || to == CallSessionState.ENDED) return true
        if (to == CallSessionState.RECONNECTING) return from == CallSessionState.ACTIVE || from == CallSessionState.ICE_CONNECTED

        return when (from) {
            CallSessionState.INITIALIZING -> to == CallSessionState.SIGNALING_CONNECTING
            CallSessionState.SIGNALING_CONNECTING -> to == CallSessionState.SIGNALING_CONNECTED
            CallSessionState.SIGNALING_CONNECTED -> to in listOf(
                CallSessionState.OFFER_RECEIVED, CallSessionState.OFFER_SENT
            )
            CallSessionState.OFFER_RECEIVED -> to == CallSessionState.ANSWER_SENT
            CallSessionState.OFFER_SENT -> to == CallSessionState.ANSWER_RECEIVED
            CallSessionState.ANSWER_RECEIVED, CallSessionState.ANSWER_SENT -> to == CallSessionState.ICE_GATHERING
            CallSessionState.ICE_GATHERING -> to in listOf(
                CallSessionState.ICE_CONNECTED, CallSessionState.ACTIVE
            )
            CallSessionState.ICE_CONNECTED -> to == CallSessionState.ACTIVE
            CallSessionState.ACTIVE -> to == CallSessionState.ON_HOLD
            CallSessionState.ON_HOLD -> to == CallSessionState.ACTIVE
            CallSessionState.RECONNECTING -> to in listOf(
                CallSessionState.ACTIVE, CallSessionState.ICE_CONNECTED
            )
            else -> false
        }
    }
}
