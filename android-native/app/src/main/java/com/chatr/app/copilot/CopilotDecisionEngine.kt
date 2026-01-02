package com.chatr.app.copilot

import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * CHATR Calling Copilot - Silent Intelligence Engine
 * 
 * Core principle: Act like the phone is smarter, not like an app is running.
 * - No technical stats shown
 * - No settings during calls
 * - Subtle hints only when absolutely necessary
 */
class CopilotDecisionEngine(
    private val networkQualityPredictor: NetworkQualityPredictor
) {
    companion object {
        private const val TAG = "CopilotEngine"
        
        // Quality thresholds
        private const val PACKET_LOSS_REDUCE_BITRATE = 10f    // %
        private const val PACKET_LOSS_AUDIO_ONLY = 25f        // %
        private const val RTT_HIGH_LATENCY = 500L             // ms
        private const val JITTER_HIGH = 100L                  // ms
        
        // Cooldown to prevent hint spam
        private const val HINT_COOLDOWN_MS = 15_000L
    }
    
    private val _currentHint = MutableStateFlow<CopilotHint?>(null)
    val currentHint: StateFlow<CopilotHint?> = _currentHint
    
    private var lastHintTime = 0L
    private var hasRecoveredRecently = false
    
    /**
     * Pre-call optimization - runs silently before call connects
     * User sees nothing, call just "works better"
     */
    suspend fun preCallOptimization(): CallRoute {
        val quality = networkQualityPredictor.analyze()
        
        Log.d(TAG, "📶 Pre-call analysis: $quality")
        
        return when {
            quality.isExcellent -> {
                Log.d(TAG, "✅ Excellent network - HD Video enabled")
                CallRoute.HD_VIDEO
            }
            quality.isGood -> {
                Log.d(TAG, "✅ Good network - Standard Video")
                CallRoute.STANDARD_VIDEO
            }
            quality.isFair -> {
                Log.d(TAG, "⚠️ Fair network - Audio Only recommended")
                CallRoute.AUDIO_ONLY
            }
            quality.isPoor -> {
                Log.d(TAG, "❌ Poor network - Low bitrate audio")
                CallRoute.LOW_BITRATE_AUDIO
            }
            else -> {
                Log.d(TAG, "🔄 Unknown network - Attempt with recovery")
                CallRoute.ATTEMPT_WITH_RECOVERY
            }
        }
    }
    
    /**
     * During-call intelligence - silently monitors and adjusts
     * Only shows hints when user would otherwise think call is broken
     */
    fun duringCall(stats: WebRTCStats): CopilotAction {
        val now = System.currentTimeMillis()
        
        return when {
            // High packet loss - reduce quality silently
            stats.packetLoss > PACKET_LOSS_REDUCE_BITRATE && stats.packetLoss <= PACKET_LOSS_AUDIO_ONLY -> {
                Log.d(TAG, "📉 Reducing bitrate (packet loss: ${stats.packetLoss}%)")
                CopilotAction.ReduceBitrate(showHint = false)
            }
            
            // Severe packet loss - switch to audio only with hint
            stats.packetLoss > PACKET_LOSS_AUDIO_ONLY -> {
                Log.d(TAG, "🎤 Switching to audio only (packet loss: ${stats.packetLoss}%)")
                maybeShowHint(now, "Audio optimized", 3000)
                CopilotAction.SwitchToAudioOnly(showHint = shouldShowHint(now))
            }
            
            // High RTT - enable jitter buffer silently
            stats.rtt > RTT_HIGH_LATENCY -> {
                Log.d(TAG, "📶 High RTT detected (${stats.rtt}ms) - enabling jitter buffer")
                CopilotAction.EnableJitterBuffer(showHint = false)
            }
            
            // High jitter - adjust buffer
            stats.jitter > JITTER_HIGH -> {
                Log.d(TAG, "📊 High jitter (${stats.jitter}ms) - adjusting buffer")
                CopilotAction.AdjustJitterBuffer(showHint = false)
            }
            
            // Connection lost - try ICE restart with hint
            stats.isDisconnecting -> {
                Log.d(TAG, "🔄 Connection unstable - attempting ICE restart")
                maybeShowHint(now, "Reconnecting...", 5000)
                hasRecoveredRecently = false
                CopilotAction.IceRestart(showHint = shouldShowHint(now))
            }
            
            // Just recovered from bad state
            stats.recovered && !hasRecoveredRecently -> {
                Log.d(TAG, "✅ Connection recovered")
                hasRecoveredRecently = true
                maybeShowHint(now, "Call stabilized", 3000)
                CopilotAction.ShowHint("Call stabilized", 3000)
            }
            
            // All good - do nothing
            else -> CopilotAction.None
        }
    }
    
    /**
     * Check if we should show a hint (respects cooldown)
     */
    private fun shouldShowHint(now: Long): Boolean {
        return now - lastHintTime > HINT_COOLDOWN_MS
    }
    
    /**
     * Maybe show a hint if cooldown has passed
     */
    private fun maybeShowHint(now: Long, message: String, durationMs: Long) {
        if (shouldShowHint(now)) {
            lastHintTime = now
            _currentHint.value = CopilotHint(message, durationMs)
        }
    }
    
    /**
     * Clear current hint
     */
    fun clearHint() {
        _currentHint.value = null
    }
    
    /**
     * Reset state for new call
     */
    fun reset() {
        _currentHint.value = null
        lastHintTime = 0L
        hasRecoveredRecently = false
    }
}

/**
 * Call routing decision made pre-call
 */
enum class CallRoute {
    HD_VIDEO,           // Excellent network - 8Mbps, 60fps
    STANDARD_VIDEO,     // Good network - 4Mbps, 30fps
    AUDIO_ONLY,         // Fair network - No video
    LOW_BITRATE_AUDIO,  // Poor network - Opus 32kbps
    ATTEMPT_WITH_RECOVERY // Unknown - Try with aggressive recovery
}

/**
 * Actions the copilot can take during a call
 */
sealed class CopilotAction {
    data class ReduceBitrate(val showHint: Boolean) : CopilotAction()
    data class SwitchToAudioOnly(val showHint: Boolean) : CopilotAction()
    data class EnableJitterBuffer(val showHint: Boolean) : CopilotAction()
    data class AdjustJitterBuffer(val showHint: Boolean) : CopilotAction()
    data class IceRestart(val showHint: Boolean) : CopilotAction()
    data class ShowHint(val message: String, val durationMs: Long) : CopilotAction()
    object None : CopilotAction()
}

/**
 * Subtle hint to show user - minimal, non-technical
 */
data class CopilotHint(
    val message: String,
    val durationMs: Long
)

/**
 * WebRTC stats for copilot analysis
 */
data class WebRTCStats(
    val packetLoss: Float = 0f,      // Percentage
    val rtt: Long = 0,               // Round trip time in ms
    val jitter: Long = 0,            // Jitter in ms
    val bitrate: Long = 0,           // Current bitrate in bps
    val isDisconnecting: Boolean = false,
    val recovered: Boolean = false
)
