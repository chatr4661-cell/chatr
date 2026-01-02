package com.chatr.app.webrtc.state

import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Call State Machine - Explicit state transitions for telecom-grade reliability
 * 
 * NO "boolean soup" - everything flows from explicit states
 * This is the single source of truth for call lifecycle
 */
@Singleton
class CallStateMachine @Inject constructor() {

    companion object {
        private const val TAG = "CallStateMachine"
    }

    private val _currentState = MutableStateFlow<CallState>(CallState.Idle)
    val currentState: StateFlow<CallState> = _currentState.asStateFlow()

    private val _previousState = MutableStateFlow<CallState>(CallState.Idle)
    val previousState: StateFlow<CallState> = _previousState.asStateFlow()

    private val stateListeners = mutableListOf<CallStateListener>()

    /**
     * Attempt state transition with validation
     */
    fun transition(newState: CallState): Boolean {
        val current = _currentState.value
        
        if (!isValidTransition(current, newState)) {
            Log.w(TAG, "Invalid transition: $current -> $newState")
            return false
        }

        Log.d(TAG, "State transition: $current -> $newState")
        _previousState.value = current
        _currentState.value = newState
        
        notifyListeners(current, newState)
        return true
    }

    /**
     * Force state (for recovery scenarios)
     */
    fun forceState(newState: CallState) {
        Log.w(TAG, "Force state: ${_currentState.value} -> $newState")
        _previousState.value = _currentState.value
        _currentState.value = newState
        notifyListeners(_previousState.value, newState)
    }

    /**
     * Reset to idle
     */
    fun reset() {
        Log.d(TAG, "State machine reset")
        _previousState.value = _currentState.value
        _currentState.value = CallState.Idle
        notifyListeners(_previousState.value, CallState.Idle)
    }

    /**
     * Validate state transition
     */
    private fun isValidTransition(from: CallState, to: CallState): Boolean {
        return when (from) {
            CallState.Idle -> to in listOf(
                CallState.Initiating,
                CallState.Ringing
            )
            CallState.Initiating -> to in listOf(
                CallState.Ringing,
                CallState.Connecting,
                CallState.Failed,
                CallState.Idle
            )
            CallState.Ringing -> to in listOf(
                CallState.Connecting,
                CallState.Disconnected, // Rejected
                CallState.Failed,
                CallState.Idle
            )
            CallState.Connecting -> to in listOf(
                CallState.Connected,
                CallState.Reconnecting,
                CallState.Failed,
                CallState.Disconnected,
                CallState.Idle
            )
            CallState.Connected -> to in listOf(
                CallState.OnHold,
                CallState.Reconnecting,
                CallState.Disconnected,
                CallState.Idle
            )
            CallState.OnHold -> to in listOf(
                CallState.Connected,
                CallState.Reconnecting,
                CallState.Disconnected,
                CallState.Idle
            )
            CallState.Reconnecting -> to in listOf(
                CallState.Connected,
                CallState.Failed,
                CallState.Disconnected,
                CallState.Idle
            )
            CallState.Disconnected -> to in listOf(
                CallState.Idle
            )
            CallState.Failed -> to in listOf(
                CallState.Idle,
                CallState.Reconnecting
            )
        }
    }

    fun addListener(listener: CallStateListener) {
        stateListeners.add(listener)
    }

    fun removeListener(listener: CallStateListener) {
        stateListeners.remove(listener)
    }

    private fun notifyListeners(from: CallState, to: CallState) {
        stateListeners.forEach { it.onStateChanged(from, to) }
    }
}

/**
 * Explicit call states - no ambiguity
 */
sealed class CallState {
    object Idle : CallState()
    object Initiating : CallState()
    object Ringing : CallState()
    object Connecting : CallState()
    object Connected : CallState()
    object OnHold : CallState()
    object Reconnecting : CallState()
    object Disconnected : CallState()
    data class Failed(val reason: FailureReason = FailureReason.UNKNOWN) : CallState()

    val isActive: Boolean
        get() = this in listOf(Connecting, Connected, OnHold, Reconnecting)

    val canHangup: Boolean
        get() = this !in listOf(Idle, Disconnected)

    override fun toString(): String = this::class.simpleName ?: "Unknown"
}

/**
 * Failure reasons for debugging
 */
enum class FailureReason {
    UNKNOWN,
    NETWORK_ERROR,
    PEER_CONNECTION_FAILED,
    ICE_FAILURE,
    MEDIA_ERROR,
    PERMISSION_DENIED,
    TIMEOUT,
    REJECTED,
    BUSY,
    SERVER_ERROR
}

/**
 * Listener for state changes
 */
interface CallStateListener {
    fun onStateChanged(from: CallState, to: CallState)
}
