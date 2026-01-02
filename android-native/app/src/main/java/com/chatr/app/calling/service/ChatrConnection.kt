package com.chatr.app.calling.service

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.telecom.CallAudioState
import android.telecom.Connection
import android.telecom.DisconnectCause
import android.util.Log
import androidx.annotation.RequiresApi
import com.chatr.app.presentation.calling.CallActivity

/**
 * CHATR Connection - Telecom-grade call connection
 * 
 * This represents a single call and handles:
 * - Call state management
 * - Audio routing (speaker, bluetooth, earpiece)
 * - Hold/unhold
 * - Answer/reject
 * - DTMF tones
 */
@RequiresApi(Build.VERSION_CODES.O)
class ChatrConnection(
    private val context: Context,
    val callId: String,
    val callerName: String,
    val callerPhone: String,
    val callerAvatar: String?,
    val isVideo: Boolean,
    val isIncoming: Boolean,
    private val onStatusChange: (String) -> Unit
) : Connection() {

    companion object {
        private const val TAG = "ChatrConnection"
    }

    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null

    init {
        audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        
        // Set connection properties
        connectionProperties = PROPERTY_SELF_MANAGED
        
        // Set capabilities
        connectionCapabilities = 
            CAPABILITY_HOLD or
            CAPABILITY_SUPPORT_HOLD or
            CAPABILITY_MUTE or
            CAPABILITY_CAN_SEND_RESPONSE_VIA_CONNECTION

        if (isVideo) {
            connectionCapabilities = connectionCapabilities or CAPABILITY_SUPPORTS_VT_LOCAL_TX or CAPABILITY_SUPPORTS_VT_REMOTE_RX
        }

        // Set audio mode
        audioModeIsVoip = true
    }

    override fun onAnswer() {
        Log.d(TAG, "onAnswer: $callId")
        setActive()
        onStatusChange("active")
        requestAudioFocus()
        launchCallActivity()
    }

    override fun onAnswer(videoState: Int) {
        Log.d(TAG, "onAnswer with videoState: $videoState")
        onAnswer()
    }

    override fun onReject() {
        Log.d(TAG, "onReject: $callId")
        onStatusChange("rejected")
        setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
        releaseAudioFocus()
        destroy()
    }

    override fun onReject(replyMessage: String?) {
        Log.d(TAG, "onReject with message: $replyMessage")
        onReject()
    }

    override fun onDisconnect() {
        Log.d(TAG, "onDisconnect: $callId")
        onStatusChange("ended")
        setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
        releaseAudioFocus()
        destroy()
    }

    override fun onAbort() {
        Log.d(TAG, "onAbort: $callId")
        onStatusChange("ended")
        setDisconnected(DisconnectCause(DisconnectCause.CANCELED))
        releaseAudioFocus()
        destroy()
    }

    override fun onHold() {
        Log.d(TAG, "onHold: $callId")
        setOnHold()
        onStatusChange("on_hold")
    }

    override fun onUnhold() {
        Log.d(TAG, "onUnhold: $callId")
        setActive()
        onStatusChange("active")
    }

    override fun onCallAudioStateChanged(state: CallAudioState?) {
        Log.d(TAG, "onCallAudioStateChanged: ${state?.route}")
        state?.let {
            // Handle audio route changes
            when (it.route) {
                CallAudioState.ROUTE_SPEAKER -> {
                    audioManager?.isSpeakerphoneOn = true
                }
                CallAudioState.ROUTE_EARPIECE -> {
                    audioManager?.isSpeakerphoneOn = false
                }
                CallAudioState.ROUTE_BLUETOOTH -> {
                    // Bluetooth handling
                }
                CallAudioState.ROUTE_WIRED_HEADSET -> {
                    // Wired headset handling
                }
            }
        }
    }

    override fun onPlayDtmfTone(c: Char) {
        Log.d(TAG, "DTMF tone: $c")
        // Handle DTMF for IVR systems if needed
    }

    override fun onStopDtmfTone() {
        Log.d(TAG, "Stop DTMF tone")
    }

    /**
     * Set call as connected (for outgoing calls when other party answers)
     */
    fun setCallConnected() {
        setActive()
        onStatusChange("active")
        requestAudioFocus()
        launchCallActivity()
    }

    /**
     * End call remotely (other party hung up)
     */
    fun endCallRemotely() {
        onStatusChange("ended")
        setDisconnected(DisconnectCause(DisconnectCause.REMOTE))
        releaseAudioFocus()
        destroy()
    }

    /**
     * Request audio focus for call
     */
    private fun requestAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener { focusChange ->
                    Log.d(TAG, "Audio focus changed: $focusChange")
                }
                .build()

            audioManager?.requestAudioFocus(audioFocusRequest!!)
            audioManager?.mode = AudioManager.MODE_IN_COMMUNICATION
        }
    }

    /**
     * Release audio focus
     */
    private fun releaseAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let {
                audioManager?.abandonAudioFocusRequest(it)
            }
            audioManager?.mode = AudioManager.MODE_NORMAL
        }
    }

    /**
     * Launch the in-call activity
     */
    private fun launchCallActivity() {
        val intent = Intent(context, CallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(ChatrConnectionService.EXTRA_CALL_ID, callId)
            putExtra(ChatrConnectionService.EXTRA_CALLER_NAME, callerName)
            putExtra(ChatrConnectionService.EXTRA_CALLER_PHONE, callerPhone)
            putExtra(ChatrConnectionService.EXTRA_CALLER_AVATAR, callerAvatar)
            putExtra(ChatrConnectionService.EXTRA_IS_VIDEO, isVideo)
            putExtra("is_incoming", isIncoming)
        }
        context.startActivity(intent)
    }
}
