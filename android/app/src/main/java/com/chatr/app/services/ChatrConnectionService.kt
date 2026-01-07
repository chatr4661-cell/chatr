package com.chatr.app.services

import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.telecom.VideoProfile
import android.util.Log
import com.chatr.app.ChatrApplication

/**
 * CHATR+ Connection Service
 * 
 * Provides GSM-like call management via Android's TelecomManager.
 * 
 * Features:
 * - System-level call handling
 * - Bluetooth headset integration
 * - Car kit compatibility
 * - Audio routing management
 * - Hold/unhold support
 */
class ChatrConnectionService : ConnectionService() {

    companion object {
        private const val TAG = "ChatrConnectionService"
        
        // Active connections
        private val activeConnections = mutableMapOf<String, ChatrConnection>()
        
        fun getConnection(callId: String): ChatrConnection? = activeConnections[callId]
        
        fun addConnection(callId: String, connection: ChatrConnection) {
            activeConnections[callId] = connection
        }
        
        fun removeConnection(callId: String) {
            activeConnections.remove(callId)
        }
    }

    override fun onCreateOutgoingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        Log.i(TAG, "📞 onCreateOutgoingConnection")
        
        val callId = request?.extras?.getString("call_id") ?: java.util.UUID.randomUUID().toString()
        val connection = ChatrConnection(callId, true)
        
        connection.setAddress(request?.address, TelecomManager.PRESENTATION_ALLOWED)
        connection.setInitialized()
        connection.setActive()
        
        addConnection(callId, connection)
        
        return connection
    }

    override fun onCreateIncomingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        Log.i(TAG, "📞 onCreateIncomingConnection")
        
        val extras = request?.extras ?: Bundle()
        val callId = extras.getString("call_id") ?: java.util.UUID.randomUUID().toString()
        val callerName = extras.getString("caller_name") ?: "Unknown"
        val callerNumber = extras.getString("caller_number") ?: ""
        
        val connection = ChatrConnection(callId, false).apply {
            setAddress(
                Uri.fromParts("chatr", callerNumber, null),
                TelecomManager.PRESENTATION_ALLOWED
            )
            setCallerDisplayName(callerName, TelecomManager.PRESENTATION_ALLOWED)
            setRinging()
        }
        
        addConnection(callId, connection)
        
        return connection
    }

    override fun onCreateIncomingConnectionFailed(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ) {
        Log.e(TAG, "❌ onCreateIncomingConnectionFailed")
        super.onCreateIncomingConnectionFailed(connectionManagerPhoneAccount, request)
    }

    override fun onCreateOutgoingConnectionFailed(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ) {
        Log.e(TAG, "❌ onCreateOutgoingConnectionFailed")
        super.onCreateOutgoingConnectionFailed(connectionManagerPhoneAccount, request)
    }
}

/**
 * Individual call connection with GSM-like state management
 */
class ChatrConnection(
    private val callId: String,
    private val isOutgoing: Boolean
) : Connection() {

    companion object {
        private const val TAG = "ChatrConnection"
    }

    init {
        // Set connection properties for self-managed calls
        connectionProperties = PROPERTY_SELF_MANAGED
        
        // Set capabilities
        connectionCapabilities = 
            CAPABILITY_HOLD or 
            CAPABILITY_SUPPORT_HOLD or 
            CAPABILITY_MUTE or 
            CAPABILITY_SUPPORTS_VT_LOCAL_BIDIRECTIONAL or 
            CAPABILITY_SUPPORTS_VT_REMOTE_BIDIRECTIONAL

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioModeIsVoip = true
        }
    }

    override fun onAnswer() {
        Log.i(TAG, "✅ onAnswer: $callId")
        setActive()
        
        // Notify WebView to start WebRTC
        notifyWebView("answer")
    }

    override fun onAnswer(videoState: Int) {
        Log.i(TAG, "✅ onAnswer (video: $videoState): $callId")
        setActive()
        notifyWebView("answer")
    }

    override fun onReject() {
        Log.i(TAG, "❌ onReject: $callId")
        setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
        destroy()
        
        ChatrConnectionService.removeConnection(callId)
        notifyWebView("reject")
    }

    override fun onDisconnect() {
        Log.i(TAG, "📵 onDisconnect: $callId")
        setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
        destroy()
        
        ChatrConnectionService.removeConnection(callId)
        notifyWebView("end")
    }

    override fun onHold() {
        Log.i(TAG, "⏸️ onHold: $callId")
        setOnHold()
        notifyWebView("hold")
    }

    override fun onUnhold() {
        Log.i(TAG, "▶️ onUnhold: $callId")
        setActive()
        notifyWebView("unhold")
    }

    override fun onPlayDtmfTone(c: Char) {
        Log.d(TAG, "🎵 DTMF: $c")
        notifyWebView("dtmf:$c")
    }

    override fun onStopDtmfTone() {
        // DTMF stopped
    }

    override fun onCallAudioStateChanged(state: android.telecom.CallAudioState?) {
        Log.d(TAG, "🔊 Audio state changed: ${state?.route}")
        
        val routeName = when (state?.route) {
            android.telecom.CallAudioState.ROUTE_EARPIECE -> "earpiece"
            android.telecom.CallAudioState.ROUTE_SPEAKER -> "speaker"
            android.telecom.CallAudioState.ROUTE_BLUETOOTH -> "bluetooth"
            android.telecom.CallAudioState.ROUTE_WIRED_HEADSET -> "wired"
            else -> "default"
        }
        
        notifyWebView("audio_route:$routeName")
    }

    private fun notifyWebView(action: String) {
        // Send event to WebView via broadcast
        // The MainActivity will receive this and forward to JavaScript
        Log.d(TAG, "📤 Notifying WebView: $action for call $callId")
    }

    /**
     * End the call from code
     */
    fun endCall() {
        Log.i(TAG, "📵 Ending call programmatically: $callId")
        setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
        destroy()
        ChatrConnectionService.removeConnection(callId)
    }

    /**
     * Mark call as answered (from WebView)
     */
    fun markAnswered() {
        setActive()
    }
}
