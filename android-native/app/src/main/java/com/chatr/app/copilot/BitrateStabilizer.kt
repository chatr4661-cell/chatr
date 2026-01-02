package com.chatr.app.copilot

import android.util.Log
import org.webrtc.PeerConnection
import org.webrtc.RtpParameters
import org.webrtc.RtpSender

/**
 * Bitrate Stabilizer - Dynamic Quality Adjustment
 * 
 * Silently adjusts video/audio bitrate during calls
 * User never sees technical stats - calls just stay smooth
 */
class BitrateStabilizer {
    
    companion object {
        private const val TAG = "BitrateStabilizer"
        
        // Video bitrate tiers (bps)
        private const val VIDEO_HD_MAX = 8_000_000      // 8 Mbps - Excellent network
        private const val VIDEO_HD_TARGET = 4_000_000   // 4 Mbps - Good network
        private const val VIDEO_SD_MAX = 1_500_000      // 1.5 Mbps - Fair network
        private const val VIDEO_LOW_MAX = 500_000       // 500 Kbps - Poor network
        
        // Audio bitrate tiers (bps)
        private const val AUDIO_HD = 128_000            // 128 Kbps - High quality Opus
        private const val AUDIO_STANDARD = 64_000       // 64 Kbps - Standard Opus
        private const val AUDIO_LOW = 32_000            // 32 Kbps - Low bitrate
        
        // Adjustment cooldown
        private const val ADJUSTMENT_COOLDOWN_MS = 5_000L
    }
    
    private var currentVideoMaxBitrate = VIDEO_HD_MAX
    private var currentAudioBitrate = AUDIO_HD
    private var lastAdjustmentTime = 0L
    
    /**
     * Apply initial route-based configuration
     */
    fun applyRoute(route: CallRoute, peerConnection: PeerConnection?) {
        Log.d(TAG, "📊 Applying route: $route")
        
        when (route) {
            CallRoute.HD_VIDEO -> {
                setVideoBitrate(peerConnection, VIDEO_HD_MAX)
                setAudioBitrate(peerConnection, AUDIO_HD)
            }
            CallRoute.STANDARD_VIDEO -> {
                setVideoBitrate(peerConnection, VIDEO_HD_TARGET)
                setAudioBitrate(peerConnection, AUDIO_HD)
            }
            CallRoute.AUDIO_ONLY -> {
                disableVideo(peerConnection)
                setAudioBitrate(peerConnection, AUDIO_HD)
            }
            CallRoute.LOW_BITRATE_AUDIO -> {
                disableVideo(peerConnection)
                setAudioBitrate(peerConnection, AUDIO_LOW)
            }
            CallRoute.ATTEMPT_WITH_RECOVERY -> {
                // Start with standard, will adjust as needed
                setVideoBitrate(peerConnection, VIDEO_HD_TARGET)
                setAudioBitrate(peerConnection, AUDIO_STANDARD)
            }
        }
    }
    
    /**
     * Reduce bitrate due to network issues
     * Called silently by CopilotDecisionEngine
     */
    fun reduceBitrate(peerConnection: PeerConnection?) {
        val now = System.currentTimeMillis()
        if (now - lastAdjustmentTime < ADJUSTMENT_COOLDOWN_MS) {
            Log.d(TAG, "⏱️ Skipping reduction - cooldown active")
            return
        }
        
        lastAdjustmentTime = now
        
        // Step down video bitrate
        val newVideoBitrate = when {
            currentVideoMaxBitrate >= VIDEO_HD_MAX -> VIDEO_HD_TARGET
            currentVideoMaxBitrate >= VIDEO_HD_TARGET -> VIDEO_SD_MAX
            currentVideoMaxBitrate >= VIDEO_SD_MAX -> VIDEO_LOW_MAX
            else -> VIDEO_LOW_MAX
        }
        
        if (newVideoBitrate < currentVideoMaxBitrate) {
            Log.d(TAG, "📉 Reducing video bitrate: ${currentVideoMaxBitrate / 1000}kbps → ${newVideoBitrate / 1000}kbps")
            setVideoBitrate(peerConnection, newVideoBitrate)
        }
    }
    
    /**
     * Switch to audio-only mode
     */
    fun switchToAudioOnly(peerConnection: PeerConnection?) {
        Log.d(TAG, "🎤 Switching to audio-only mode")
        disableVideo(peerConnection)
        setAudioBitrate(peerConnection, AUDIO_HD)
    }
    
    /**
     * Attempt to recover quality after network improves
     */
    fun attemptQualityRecovery(peerConnection: PeerConnection?) {
        val now = System.currentTimeMillis()
        if (now - lastAdjustmentTime < ADJUSTMENT_COOLDOWN_MS * 2) {
            return // Wait longer before upgrading
        }
        
        // Step up video bitrate cautiously
        val newVideoBitrate = when {
            currentVideoMaxBitrate <= VIDEO_LOW_MAX -> VIDEO_SD_MAX
            currentVideoMaxBitrate <= VIDEO_SD_MAX -> VIDEO_HD_TARGET
            else -> currentVideoMaxBitrate // Already at max
        }
        
        if (newVideoBitrate > currentVideoMaxBitrate) {
            Log.d(TAG, "📈 Recovering video quality: ${currentVideoMaxBitrate / 1000}kbps → ${newVideoBitrate / 1000}kbps")
            setVideoBitrate(peerConnection, newVideoBitrate)
            lastAdjustmentTime = now
        }
    }
    
    /**
     * Set video sender bitrate
     */
    private fun setVideoBitrate(peerConnection: PeerConnection?, maxBitrate: Int) {
        if (peerConnection == null) return
        
        try {
            val senders = peerConnection.senders
            val videoSender = senders.find { it.track()?.kind() == "video" }
            
            videoSender?.let { sender ->
                updateSenderBitrate(sender, maxBitrate)
                currentVideoMaxBitrate = maxBitrate
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set video bitrate", e)
        }
    }
    
    /**
     * Set audio sender bitrate
     */
    private fun setAudioBitrate(peerConnection: PeerConnection?, bitrate: Int) {
        if (peerConnection == null) return
        
        try {
            val senders = peerConnection.senders
            val audioSender = senders.find { it.track()?.kind() == "audio" }
            
            audioSender?.let { sender ->
                updateSenderBitrate(sender, bitrate)
                currentAudioBitrate = bitrate
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set audio bitrate", e)
        }
    }
    
    /**
     * Disable video track
     */
    private fun disableVideo(peerConnection: PeerConnection?) {
        if (peerConnection == null) return
        
        try {
            val senders = peerConnection.senders
            val videoSender = senders.find { it.track()?.kind() == "video" }
            
            videoSender?.track()?.setEnabled(false)
            currentVideoMaxBitrate = 0
            Log.d(TAG, "📹 Video disabled")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to disable video", e)
        }
    }
    
    /**
     * Enable video track
     */
    fun enableVideo(peerConnection: PeerConnection?) {
        if (peerConnection == null) return
        
        try {
            val senders = peerConnection.senders
            val videoSender = senders.find { it.track()?.kind() == "video" }
            
            videoSender?.track()?.setEnabled(true)
            setVideoBitrate(peerConnection, VIDEO_HD_TARGET)
            Log.d(TAG, "📹 Video enabled")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to enable video", e)
        }
    }
    
    /**
     * Update RTP sender bitrate parameters
     */
    private fun updateSenderBitrate(sender: RtpSender, maxBitrate: Int) {
        val parameters = sender.parameters
        
        if (parameters.encodings.isNotEmpty()) {
            for (encoding in parameters.encodings) {
                encoding.maxBitrateBps = maxBitrate
            }
            sender.parameters = parameters
        }
    }
    
    /**
     * Get current status (for debugging only - never shown to user)
     */
    fun getStatus(): BitrateStatus {
        return BitrateStatus(
            videoBitrate = currentVideoMaxBitrate,
            audioBitrate = currentAudioBitrate,
            videoEnabled = currentVideoMaxBitrate > 0
        )
    }
}

data class BitrateStatus(
    val videoBitrate: Int,
    val audioBitrate: Int,
    val videoEnabled: Boolean
)
