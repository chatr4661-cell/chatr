package com.chatr.app.copilot

import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.webrtc.IceCandidate
import org.webrtc.PeerConnection

/**
 * Recovery Controller - Never-Fail Call Recovery
 * 
 * Core principle: "Never show call failed if recovery is possible"
 * Silently handles reconnection, ICE restarts, and path switching
 */
class RecoveryController {
    
    companion object {
        private const val TAG = "RecoveryController"
        
        // Recovery timing
        private const val ICE_RESTART_DELAY_MS = 2_000L
        private const val MAX_RECOVERY_ATTEMPTS = 5
        private const val RECOVERY_BACKOFF_BASE_MS = 1_000L
        private const val CONNECTION_TIMEOUT_MS = 25_000L  // Extended for mobile
    }
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    private var recoveryAttempts = 0
    private var lastRecoveryTime = 0L
    private var isRecovering = false
    
    private val _recoveryState = MutableStateFlow<RecoveryState>(RecoveryState.STABLE)
    val recoveryState: StateFlow<RecoveryState> = _recoveryState
    
    /**
     * Handle connection state change
     * Called whenever PeerConnection state changes
     */
    fun handleConnectionStateChange(
        state: PeerConnection.IceConnectionState,
        peerConnection: PeerConnection?,
        onIceRestart: () -> Unit,
        onRecovered: () -> Unit,
        onFailed: () -> Unit
    ) {
        Log.d(TAG, "📶 Connection state: $state (attempts: $recoveryAttempts)")
        
        when (state) {
            PeerConnection.IceConnectionState.CONNECTED,
            PeerConnection.IceConnectionState.COMPLETED -> {
                if (isRecovering) {
                    Log.d(TAG, "✅ Connection RECOVERED after $recoveryAttempts attempts")
                    _recoveryState.value = RecoveryState.RECOVERED
                    onRecovered()
                } else {
                    _recoveryState.value = RecoveryState.STABLE
                }
                reset()
            }
            
            PeerConnection.IceConnectionState.DISCONNECTED -> {
                // Don't fail immediately - this is often temporary
                Log.d(TAG, "⚠️ Connection DISCONNECTED - waiting for recovery")
                _recoveryState.value = RecoveryState.RECOVERING
                
                scope.launch {
                    delay(ICE_RESTART_DELAY_MS)
                    
                    // Check if still disconnected
                    if (_recoveryState.value == RecoveryState.RECOVERING) {
                        attemptRecovery(peerConnection, onIceRestart, onFailed)
                    }
                }
            }
            
            PeerConnection.IceConnectionState.FAILED -> {
                Log.d(TAG, "❌ Connection FAILED - attempting immediate recovery")
                _recoveryState.value = RecoveryState.RECOVERING
                isRecovering = true
                
                scope.launch {
                    attemptRecovery(peerConnection, onIceRestart, onFailed)
                }
            }
            
            PeerConnection.IceConnectionState.CLOSED -> {
                Log.d(TAG, "📞 Connection CLOSED (intentional)")
                reset()
            }
            
            else -> {
                // NEW, CHECKING - normal states, do nothing
            }
        }
    }
    
    /**
     * Attempt connection recovery via ICE restart
     */
    private suspend fun attemptRecovery(
        peerConnection: PeerConnection?,
        onIceRestart: () -> Unit,
        onFailed: () -> Unit
    ) {
        if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
            Log.e(TAG, "❌ Max recovery attempts reached - call truly failed")
            _recoveryState.value = RecoveryState.FAILED
            onFailed()
            return
        }
        
        recoveryAttempts++
        isRecovering = true
        lastRecoveryTime = System.currentTimeMillis()
        
        // Exponential backoff
        val backoffDelay = RECOVERY_BACKOFF_BASE_MS * (1 shl (recoveryAttempts - 1))
        Log.d(TAG, "🔄 Recovery attempt $recoveryAttempts/$MAX_RECOVERY_ATTEMPTS (backoff: ${backoffDelay}ms)")
        
        delay(backoffDelay)
        
        // Trigger ICE restart
        try {
            Log.d(TAG, "🔄 Triggering ICE restart...")
            onIceRestart()
            
            // Wait for connection with timeout
            val startTime = System.currentTimeMillis()
            while (System.currentTimeMillis() - startTime < CONNECTION_TIMEOUT_MS) {
                if (_recoveryState.value == RecoveryState.STABLE || 
                    _recoveryState.value == RecoveryState.RECOVERED) {
                    Log.d(TAG, "✅ ICE restart successful")
                    return
                }
                delay(500)
            }
            
            // Timeout - try again
            Log.w(TAG, "⏱️ ICE restart timeout - retrying...")
            attemptRecovery(peerConnection, onIceRestart, onFailed)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ ICE restart failed", e)
            attemptRecovery(peerConnection, onIceRestart, onFailed)
        }
    }
    
    /**
     * Handle new ICE candidate during recovery
     */
    fun onNewIceCandidate(candidate: IceCandidate) {
        if (isRecovering) {
            Log.d(TAG, "📍 New ICE candidate during recovery: ${candidate.sdp.take(50)}...")
        }
    }
    
    /**
     * Force recovery attempt (for manual trigger if needed)
     */
    fun forceRecovery(
        peerConnection: PeerConnection?,
        onIceRestart: () -> Unit,
        onFailed: () -> Unit
    ) {
        Log.d(TAG, "🔧 Forcing recovery attempt")
        _recoveryState.value = RecoveryState.RECOVERING
        isRecovering = true
        
        scope.launch {
            attemptRecovery(peerConnection, onIceRestart, onFailed)
        }
    }
    
    /**
     * Reset recovery state
     */
    private fun reset() {
        recoveryAttempts = 0
        isRecovering = false
        lastRecoveryTime = 0L
    }
    
    /**
     * Cleanup
     */
    fun dispose() {
        reset()
        scope.cancel()
    }
}

/**
 * Recovery state for UI hints
 */
enum class RecoveryState {
    STABLE,     // Connection is stable
    RECOVERING, // Attempting to recover
    RECOVERED,  // Just recovered (show "Call stabilized")
    FAILED      // Truly failed after all attempts
}
