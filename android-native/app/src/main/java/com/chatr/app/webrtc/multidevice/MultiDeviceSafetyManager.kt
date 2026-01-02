package com.chatr.app.webrtc.multidevice

import android.content.Context
import android.provider.Settings
import android.util.Log
import com.chatr.app.webrtc.signaling.CallSignalingClient
import com.chatr.app.webrtc.signaling.CallSignalingEvent
import com.chatr.app.webrtc.state.CallState
import com.chatr.app.webrtc.state.CallStateMachine
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Multi-Device Safety Manager - Handles call collisions and device conflicts
 * 
 * Even if v1 is single device, this groundwork prevents:
 * - Call collision (two incoming calls at once)
 * - Multi-device conflict ("Already on another device")
 * - Busy state propagation
 * - Race conditions in call acceptance
 * 
 * Telegram/WhatsApp learned these the hard way.
 */
@Singleton
class MultiDeviceSafetyManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val signalingClient: CallSignalingClient,
    private val callStateMachine: CallStateMachine
) {
    companion object {
        private const val TAG = "MultiDeviceSafety"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Current device ID (Android ID)
    private val deviceId: String by lazy {
        Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
    }

    // Active call tracking
    private val _activeCallId = MutableStateFlow<String?>(null)
    val activeCallId: StateFlow<String?> = _activeCallId.asStateFlow()

    private val _isOnCall = MutableStateFlow(false)
    val isOnCall: StateFlow<Boolean> = _isOnCall.asStateFlow()

    // Pending incoming call (for collision handling)
    private val _pendingIncomingCall = MutableStateFlow<PendingCall?>(null)
    val pendingIncomingCall: StateFlow<PendingCall?> = _pendingIncomingCall.asStateFlow()

    // Device conflict state
    private val _deviceConflict = MutableStateFlow<DeviceConflict?>(null)
    val deviceConflict: StateFlow<DeviceConflict?> = _deviceConflict.asStateFlow()

    init {
        observeCallState()
        observeSignaling()
    }

    /**
     * Check if a new call can be accepted
     */
    fun canAcceptNewCall(): Boolean {
        return !_isOnCall.value
    }

    /**
     * Handle incoming call - checks for collisions
     */
    fun handleIncomingCall(
        callId: String,
        callerId: String,
        callerName: String?,
        callerPhone: String,
        isVideo: Boolean
    ): IncomingCallResult {
        Log.d(TAG, "Handling incoming call: $callId from $callerPhone")

        // Check if already on a call
        if (_isOnCall.value) {
            val activeCall = _activeCallId.value
            Log.d(TAG, "Already on call: $activeCall - reporting busy")
            
            // Report busy to caller
            scope.launch {
                signalingClient.sendBusy(callId, activeCall)
            }
            
            return IncomingCallResult.Busy(activeCall)
        }

        // Check for collision (another incoming call pending)
        val pending = _pendingIncomingCall.value
        if (pending != null && pending.callId != callId) {
            Log.d(TAG, "Call collision detected: pending=$${pending.callId}, new=$callId")
            
            // Keep the first call, reject the second
            scope.launch {
                signalingClient.sendBusy(callId, pending.callId)
            }
            
            return IncomingCallResult.Collision(pending.callId)
        }

        // Accept the incoming call as pending
        _pendingIncomingCall.value = PendingCall(
            callId = callId,
            callerId = callerId,
            callerName = callerName,
            callerPhone = callerPhone,
            isVideo = isVideo,
            timestamp = System.currentTimeMillis()
        )

        return IncomingCallResult.Proceed
    }

    /**
     * Mark call as active (when answered)
     */
    fun markCallActive(callId: String) {
        Log.d(TAG, "Marking call as active: $callId")
        _activeCallId.value = callId
        _isOnCall.value = true
        _pendingIncomingCall.value = null
    }

    /**
     * Mark call as ended
     */
    fun markCallEnded(callId: String) {
        Log.d(TAG, "Marking call as ended: $callId")
        if (_activeCallId.value == callId) {
            _activeCallId.value = null
            _isOnCall.value = false
        }
        if (_pendingIncomingCall.value?.callId == callId) {
            _pendingIncomingCall.value = null
        }
        _deviceConflict.value = null
    }

    /**
     * Handle "call answered on another device" signal
     */
    fun handleCallOnAnotherDevice(callId: String, otherDeviceId: String) {
        Log.d(TAG, "Call $callId answered on another device: $otherDeviceId")
        
        _deviceConflict.value = DeviceConflict(
            callId = callId,
            otherDeviceId = otherDeviceId,
            type = ConflictType.ANSWERED_ELSEWHERE
        )

        // Clear pending if this was our pending call
        if (_pendingIncomingCall.value?.callId == callId) {
            _pendingIncomingCall.value = null
        }
    }

    /**
     * Get current device ID
     */
    fun getDeviceId(): String = deviceId

    private fun observeCallState() {
        callStateMachine.currentState
            .onEach { state ->
                when (state) {
                    is CallState.Connected -> {
                        // Ensure we're marked as on call
                        _isOnCall.value = true
                    }
                    is CallState.Idle, is CallState.Disconnected, is CallState.Failed -> {
                        // Clear all state
                        _activeCallId.value = null
                        _isOnCall.value = false
                        _deviceConflict.value = null
                    }
                    else -> {}
                }
            }
            .launchIn(scope)
    }

    private fun observeSignaling() {
        signalingClient.events
            .onEach { event ->
                when (event) {
                    is CallSignalingEvent.Incoming.CallOnAnotherDevice -> {
                        handleCallOnAnotherDevice(event.callId, event.deviceId)
                    }
                    is CallSignalingEvent.Incoming.CallBusy -> {
                        Log.d(TAG, "Remote party is busy on call: ${event.callId}")
                    }
                    is CallSignalingEvent.Incoming.CallEnded -> {
                        markCallEnded(event.callId)
                    }
                    is CallSignalingEvent.Incoming.CallRejected -> {
                        markCallEnded(event.callId)
                    }
                    is CallSignalingEvent.Incoming.CallCanceled -> {
                        markCallEnded(event.callId)
                    }
                    else -> {}
                }
            }
            .launchIn(scope)
    }
}

/**
 * Result of incoming call handling
 */
sealed class IncomingCallResult {
    object Proceed : IncomingCallResult()
    data class Busy(val activeCallId: String?) : IncomingCallResult()
    data class Collision(val existingCallId: String) : IncomingCallResult()
}

/**
 * Pending incoming call data
 */
data class PendingCall(
    val callId: String,
    val callerId: String,
    val callerName: String?,
    val callerPhone: String,
    val isVideo: Boolean,
    val timestamp: Long
)

/**
 * Device conflict information
 */
data class DeviceConflict(
    val callId: String,
    val otherDeviceId: String,
    val type: ConflictType
)

/**
 * Types of device conflicts
 */
enum class ConflictType {
    ANSWERED_ELSEWHERE,  // Call was answered on another device
    ACTIVE_ELSEWHERE,    // User has active call on another device
    REJECTED_ELSEWHERE   // Call was rejected on another device
}
