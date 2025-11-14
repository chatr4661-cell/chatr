package com.chatr.app.call

import android.os.Build
import android.telecom.*
import android.content.Intent
import androidx.annotation.RequiresApi

@RequiresApi(Build.VERSION_CODES.M)
class ChatrConnectionService : ConnectionService() {
    
    override fun onCreateOutgoingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        return ChatrConnection().apply {
            setAddress(request?.address, TelecomManager.PRESENTATION_ALLOWED)
            setCallerDisplayName(
                request?.extras?.getString("CALLER_NAME"),
                TelecomManager.PRESENTATION_ALLOWED
            )
            setActive()
        }
    }
    
    override fun onCreateIncomingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        return ChatrConnection().apply {
            setAddress(request?.address, TelecomManager.PRESENTATION_ALLOWED)
            setCallerDisplayName(
                request?.extras?.getString("CALLER_NAME"),
                TelecomManager.PRESENTATION_ALLOWED
            )
            setRinging()
        }
    }
    
    private inner class ChatrConnection : Connection() {
        
        init {
            connectionProperties = PROPERTY_SELF_MANAGED
            audioModeIsVoip = true
        }
        
        override fun onAnswer() {
            setActive()
            // Trigger call acceptance in CallManager
            val callId = extras?.getString("CALL_ID")
            val intent = Intent("com.chatr.app.ANSWER_CALL").apply {
                putExtra("CALL_ID", callId)
            }
            sendBroadcast(intent)
        }
        
        override fun onReject() {
            setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
            destroy()
            
            // Trigger call rejection in CallManager
            val callId = extras?.getString("CALL_ID")
            val intent = Intent("com.chatr.app.REJECT_CALL").apply {
                putExtra("CALL_ID", callId)
            }
            sendBroadcast(intent)
        }
        
        override fun onDisconnect() {
            setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
            destroy()
            
            // Trigger call end in CallManager
            val callId = extras?.getString("CALL_ID")
            val intent = Intent("com.chatr.app.END_CALL").apply {
                putExtra("CALL_ID", callId)
            }
            sendBroadcast(intent)
        }
        
        override fun onAbort() {
            setDisconnected(DisconnectCause(DisconnectCause.CANCELED))
            destroy()
        }
        
        override fun onStateChanged(state: Int) {
            // Handle state changes
        }
    }
}
