package com.chatr.app.call

import android.content.Intent
import android.os.Build
import android.telecom.*
import android.util.Log
import androidx.annotation.RequiresApi

/**
 * Connection Service for ChatrPlus native call integration
 * 
 * Handles:
 * - Incoming call connections
 * - Outgoing call connections
 * - Call state management (answer, reject, hold, disconnect)
 * - WebRTC integration via broadcast intents
 */
@RequiresApi(Build.VERSION_CODES.M)
class ChatrConnectionService : ConnectionService() {
    
    companion object {
        private const val TAG = "ChatrConnectionService"
        const val ACTION_ANSWER_CALL = "com.chatr.app.ANSWER_CALL"
        const val ACTION_REJECT_CALL = "com.chatr.app.REJECT_CALL"
        const val ACTION_END_CALL = "com.chatr.app.END_CALL"
        const val ACTION_HOLD_CALL = "com.chatr.app.HOLD_CALL"
        const val ACTION_UNHOLD_CALL = "com.chatr.app.UNHOLD_CALL"
        const val EXTRA_CALL_ID = "CALL_ID"
    }
    
    override fun onCreateOutgoingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        Log.d(TAG, "Creating outgoing ChatrPlus connection")
        
        return ChatrConnection().apply {
            setAddress(request?.address, TelecomManager.PRESENTATION_ALLOWED)
            setCallerDisplayName(
                request?.extras?.getString("CALLER_NAME") ?: "ChatrPlus Call",
                TelecomManager.PRESENTATION_ALLOWED
            )
            extras = request?.extras
            setActive()
        }
    }
    
    override fun onCreateIncomingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        Log.d(TAG, "Creating incoming ChatrPlus connection")
        
        return ChatrConnection().apply {
            setAddress(request?.address, TelecomManager.PRESENTATION_ALLOWED)
            setCallerDisplayName(
                request?.extras?.getString("CALLER_NAME") ?: "ChatrPlus Call",
                TelecomManager.PRESENTATION_ALLOWED
            )
            extras = request?.extras
            setRinging()
        }
    }
    
    override fun onCreateOutgoingConnectionFailed(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ) {
        Log.e(TAG, "❌ Failed to create outgoing connection")
    }
    
    override fun onCreateIncomingConnectionFailed(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ) {
        Log.e(TAG, "❌ Failed to create incoming connection")
    }
    
    /**
     * ChatrPlus Connection implementation
     * Handles call lifecycle and integrates with WebRTC via broadcasts
     */
    private inner class ChatrConnection : Connection() {
        
        init {
            connectionProperties = PROPERTY_SELF_MANAGED
            audioModeIsVoip = true
            connectionCapabilities = CAPABILITY_HOLD or CAPABILITY_SUPPORT_HOLD or CAPABILITY_MUTE
        }
        
        override fun onAnswer() {
            Log.d(TAG, "✅ Call answered via system UI")
            setActive()
            
            // Trigger WebRTC call acceptance
            val callId = extras?.getString(EXTRA_CALL_ID)
            sendBroadcast(Intent(ACTION_ANSWER_CALL).apply {
                setPackage(packageName)
                putExtra(EXTRA_CALL_ID, callId)
            })
        }
        
        override fun onAnswer(videoState: Int) {
            Log.d(TAG, "✅ Call answered with video state: $videoState")
            onAnswer()
        }
        
        override fun onReject() {
            Log.d(TAG, "❌ Call rejected via system UI")
            setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
            destroy()
            
            // Trigger WebRTC call rejection
            val callId = extras?.getString(EXTRA_CALL_ID)
            sendBroadcast(Intent(ACTION_REJECT_CALL).apply {
                setPackage(packageName)
                putExtra(EXTRA_CALL_ID, callId)
            })
        }
        
        override fun onReject(rejectReason: Int) {
            Log.d(TAG, "❌ Call rejected with reason: $rejectReason")
            onReject()
        }
        
        override fun onDisconnect() {
            Log.d(TAG, "📞 Call disconnected")
            setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
            destroy()
            
            // Trigger WebRTC call end
            val callId = extras?.getString(EXTRA_CALL_ID)
            sendBroadcast(Intent(ACTION_END_CALL).apply {
                setPackage(packageName)
                putExtra(EXTRA_CALL_ID, callId)
            })
        }
        
        override fun onHold() {
            Log.d(TAG, "⏸️ Call placed on hold")
            setOnHold()
            
            val callId = extras?.getString(EXTRA_CALL_ID)
            sendBroadcast(Intent(ACTION_HOLD_CALL).apply {
                setPackage(packageName)
                putExtra(EXTRA_CALL_ID, callId)
            })
        }
        
        override fun onUnhold() {
            Log.d(TAG, "▶️ Call resumed from hold")
            setActive()
            
            val callId = extras?.getString(EXTRA_CALL_ID)
            sendBroadcast(Intent(ACTION_UNHOLD_CALL).apply {
                setPackage(packageName)
                putExtra(EXTRA_CALL_ID, callId)
            })
        }
        
        override fun onAbort() {
            Log.d(TAG, "🚫 Call aborted")
            setDisconnected(DisconnectCause(DisconnectCause.CANCELED))
            destroy()
        }
        
        override fun onStateChanged(state: Int) {
            val stateName = when (state) {
                STATE_INITIALIZING -> "INITIALIZING"
                STATE_NEW -> "NEW"
                STATE_RINGING -> "RINGING"
                STATE_DIALING -> "DIALING"
                STATE_ACTIVE -> "ACTIVE"
                STATE_HOLDING -> "HOLDING"
                STATE_DISCONNECTED -> "DISCONNECTED"
                else -> "UNKNOWN($state)"
            }
            Log.d(TAG, "📞 Connection state changed: $stateName")
        }
    }
}
