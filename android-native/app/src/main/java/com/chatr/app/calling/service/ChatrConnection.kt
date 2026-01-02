package com.chatr.app.calling.service

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.telecom.CallAudioState
import android.telecom.Connection
import android.telecom.DisconnectCause
import android.util.Log
import androidx.annotation.RequiresApi
import com.chatr.app.presentation.calling.CallActivity
import com.chatr.app.webrtc.audio.AudioRoute
import com.chatr.app.webrtc.bridge.TelecomWebRtcBridge

/**
 * CHATR Connection - Telecom-grade call connection with WebRTC bridge
 * 
 * This represents a single call and handles:
 * - Call state management
 * - Audio routing (speaker, bluetooth, earpiece)
 * - Hold/unhold
 * - Answer/reject
 * - DTMF tones
 * - WebRTC lifecycle via TelecomWebRtcBridge
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
    private val onStatusChange: (String) -> Unit,
    private val webRtcBridge: TelecomWebRtcBridge? = null
) : Connection() {

    companion object {
        private const val TAG = "ChatrConnection"
    }

    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null

    init {
        audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        
        connectionProperties = PROPERTY_SELF_MANAGED
        
        connectionCapabilities = 
            CAPABILITY_HOLD or
            CAPABILITY_SUPPORT_HOLD or
            CAPABILITY_MUTE or
            CAPABILITY_CAN_SEND_RESPONSE_VIA_CONNECTION

        if (isVideo) {
            connectionCapabilities = connectionCapabilities or 
                CAPABILITY_SUPPORTS_VT_LOCAL_TX or CAPABILITY_SUPPORTS_VT_REMOTE_RX
        }

        audioModeIsVoip = true
    }

    override fun onAnswer() {
        Log.d(TAG, "onAnswer: $callId")
        setActive()
        onStatusChange("active")
        requestAudioFocus()
        
        // START WEBRTC via bridge
        webRtcBridge?.onCallAnswered()
        
        launchCallActivity()
    }

    override fun onAnswer(videoState: Int) {
        Log.d(TAG, "onAnswer with videoState: $videoState")
        onAnswer()
    }

    override fun onReject() {
        Log.d(TAG, "onReject: $callId")
        onStatusChange("rejected")
        
        // Notify bridge
        webRtcBridge?.onCallRejected()
        
        setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
        releaseAudioFocus()
        destroy()
    }

    override fun onReject(replyMessage: String?) {
        onReject()
    }

    override fun onDisconnect() {
        Log.d(TAG, "onDisconnect: $callId")
        onStatusChange("ended")
        
        // CLOSE WEBRTC via bridge
        webRtcBridge?.onCallDisconnected()
        
        setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
        releaseAudioFocus()
        destroy()
    }

    override fun onAbort() {
        Log.d(TAG, "onAbort: $callId")
        onStatusChange("ended")
        webRtcBridge?.onCallDisconnected()
        setDisconnected(DisconnectCause(DisconnectCause.CANCELED))
        releaseAudioFocus()
        destroy()
    }

    override fun onHold() {
        Log.d(TAG, "onHold: $callId")
        setOnHold()
        onStatusChange("on_hold")
        
        // MUTE RTP via bridge
        webRtcBridge?.onCallHold(true)
    }

    override fun onUnhold() {
        Log.d(TAG, "onUnhold: $callId")
        setActive()
        onStatusChange("active")
        
        // UNMUTE RTP via bridge
        webRtcBridge?.onCallHold(false)
    }

    override fun onCallAudioStateChanged(state: CallAudioState?) {
        Log.d(TAG, "onCallAudioStateChanged: ${state?.route}")
        state?.let {
            val route = when (it.route) {
                CallAudioState.ROUTE_SPEAKER -> AudioRoute.SPEAKER
                CallAudioState.ROUTE_BLUETOOTH -> AudioRoute.BLUETOOTH
                CallAudioState.ROUTE_WIRED_HEADSET -> AudioRoute.WIRED_HEADSET
                else -> AudioRoute.EARPIECE
            }
            webRtcBridge?.setAudioRoute(route)
        }
    }

    override fun onPlayDtmfTone(c: Char) {
        Log.d(TAG, "DTMF tone: $c")
    }

    override fun onStopDtmfTone() {}

    fun setCallConnected() {
        setActive()
        onStatusChange("active")
        requestAudioFocus()
        webRtcBridge?.onCallAnswered()
        launchCallActivity()
    }

    fun endCallRemotely() {
        onStatusChange("ended")
        webRtcBridge?.onCallDisconnected()
        setDisconnected(DisconnectCause(DisconnectCause.REMOTE))
        releaseAudioFocus()
        destroy()
    }

    private fun requestAudioFocus() {
        audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAcceptsDelayedFocusGain(true)
            .setOnAudioFocusChangeListener { }
            .build()

        audioManager?.requestAudioFocus(audioFocusRequest!!)
        audioManager?.mode = AudioManager.MODE_IN_COMMUNICATION
    }

    private fun releaseAudioFocus() {
        audioFocusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
        audioManager?.mode = AudioManager.MODE_NORMAL
    }

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
