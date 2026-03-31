package com.chatr.app.calling

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.util.Log
import javax.inject.Inject
import javax.inject.Singleton

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              AUDIO FOCUS MANAGER                                 ║
 * ║                                                                  ║
 * ║  Carrier-grade audio handling for VoIP calls                    ║
 * ║                                                                  ║
 * ║  Handles:                                                        ║
 * ║  - Audio focus acquisition/release                               ║
 * ║  - VoIP audio mode configuration                                ║
 * ║  - Speaker / earpiece / Bluetooth routing                        ║
 * ║  - Proper cleanup to prevent mic/speaker issues                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
@Singleton
class AudioFocusManager @Inject constructor(
    private val context: Context
) {
    companion object {
        private const val TAG = "AudioFocusManager"
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var audioFocusRequest: AudioFocusRequest? = null
    private var hasAudioFocus = false
    private var previousAudioMode: Int = AudioManager.MODE_NORMAL
    private var previousSpeakerphoneState: Boolean = false

    /**
     * Configure audio for VoIP call — MUST be called before WebRTC starts
     */
    fun acquireCallAudioFocus() {
        if (hasAudioFocus) return

        // Save previous state
        previousAudioMode = audioManager.mode
        previousSpeakerphoneState = audioManager.isSpeakerphoneOn

        // Build audio focus request for voice communication
        audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAcceptsDelayedFocusGain(true)
            .setWillPauseWhenDucked(false)
            .setOnAudioFocusChangeListener { focusChange ->
                when (focusChange) {
                    AudioManager.AUDIOFOCUS_LOSS -> {
                        Log.w(TAG, "⚠️ Audio focus LOST")
                        hasAudioFocus = false
                    }
                    AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                        Log.w(TAG, "⚠️ Audio focus lost transiently")
                    }
                    AudioManager.AUDIOFOCUS_GAIN -> {
                        Log.d(TAG, "✅ Audio focus regained")
                        hasAudioFocus = true
                    }
                }
            }
            .build()

        val result = audioManager.requestAudioFocus(audioFocusRequest!!)
        hasAudioFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED

        // CRITICAL: Set VoIP mode
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        audioManager.isSpeakerphoneOn = false // Default to earpiece
        
        // Enable microphone
        if (audioManager.isMicrophoneMute) {
            audioManager.isMicrophoneMute = false
        }

        Log.d(TAG, "🎙️ Audio focus acquired: $hasAudioFocus, mode: MODE_IN_COMMUNICATION")
    }

    /**
     * Release audio focus — MUST be called on call end
     */
    fun releaseCallAudioFocus() {
        if (!hasAudioFocus && audioFocusRequest == null) return

        audioFocusRequest?.let {
            audioManager.abandonAudioFocusRequest(it)
        }

        // Restore previous state
        audioManager.mode = previousAudioMode
        audioManager.isSpeakerphoneOn = previousSpeakerphoneState

        hasAudioFocus = false
        audioFocusRequest = null

        Log.d(TAG, "🔇 Audio focus released, mode restored")
    }

    /**
     * Route to speaker
     */
    fun setSpeakerphone(enabled: Boolean) {
        audioManager.isSpeakerphoneOn = enabled
        Log.d(TAG, "🔊 Speakerphone: $enabled")
    }

    /**
     * Check if Bluetooth audio device is available
     */
    fun isBluetoothAvailable(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audioManager.availableCommunicationDevices.any {
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                it.type == AudioDeviceInfo.TYPE_BLE_HEADSET
            }
        } else {
            @Suppress("DEPRECATION")
            audioManager.isBluetoothScoAvailableOffCall
        }
    }

    /**
     * Route to Bluetooth
     */
    fun routeToBluetooth() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val btDevice = audioManager.availableCommunicationDevices.firstOrNull {
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                it.type == AudioDeviceInfo.TYPE_BLE_HEADSET
            }
            btDevice?.let {
                audioManager.setCommunicationDevice(it)
                Log.d(TAG, "🎧 Routed to Bluetooth: ${it.productName}")
            }
        } else {
            @Suppress("DEPRECATION")
            audioManager.startBluetoothSco()
            @Suppress("DEPRECATION")
            audioManager.isBluetoothScoOn = true
            Log.d(TAG, "🎧 Bluetooth SCO started")
        }
    }

    /**
     * Route to earpiece
     */
    fun routeToEarpiece() {
        audioManager.isSpeakerphoneOn = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val earpiece = audioManager.availableCommunicationDevices.firstOrNull {
                it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE
            }
            earpiece?.let { audioManager.setCommunicationDevice(it) }
        }
        Log.d(TAG, "📱 Routed to earpiece")
    }

    /**
     * Toggle mute
     */
    fun setMicMuted(muted: Boolean) {
        audioManager.isMicrophoneMute = muted
        Log.d(TAG, "🎙️ Mic muted: $muted")
    }

    /**
     * Get current audio route description
     */
    fun getCurrentRoute(): String {
        return when {
            audioManager.isSpeakerphoneOn -> "speaker"
            isBluetoothAvailable() -> "bluetooth"
            else -> "earpiece"
        }
    }
}
