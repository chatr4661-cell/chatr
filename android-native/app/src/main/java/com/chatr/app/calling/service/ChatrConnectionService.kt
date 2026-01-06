package com.chatr.app.calling.service

import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.util.Log
import androidx.annotation.RequiresApi
import com.chatr.app.BuildConfig
import dagger.hilt.android.AndroidEntryPoint
import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.http.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Android Telecom ConnectionService
 * 
 * This makes CHATR calls appear like GSM calls:
 * - Shows in system dialer
 * - Appears in call logs
 * - Works when app is killed
 * - Full lock screen integration
 * 
 * Branded as "ChatrPlus"
 */
@RequiresApi(Build.VERSION_CODES.O)
@AndroidEntryPoint
class ChatrConnectionService : ConnectionService() {

    @Inject
    lateinit var httpClient: HttpClient

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    companion object {
        private const val TAG = "ChatrConnectionService"
        const val EXTRA_CALL_ID = "extra_call_id"
        const val EXTRA_CALLER_NAME = "extra_caller_name"
        const val EXTRA_CALLER_AVATAR = "extra_caller_avatar"
        const val EXTRA_CALLER_PHONE = "extra_caller_phone"
        const val EXTRA_IS_VIDEO = "extra_is_video"
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "ChatrConnectionService created")
    }

    override fun onCreateIncomingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        Log.d(TAG, "onCreateIncomingConnection")
        
        val extras = request?.extras ?: Bundle()
        val callId = extras.getString(EXTRA_CALL_ID) ?: ""
        val callerName = extras.getString(EXTRA_CALLER_NAME) ?: "Unknown"
        val callerPhone = extras.getString(EXTRA_CALLER_PHONE) ?: ""
        val callerAvatar = extras.getString(EXTRA_CALLER_AVATAR)
        val isVideo = extras.getBoolean(EXTRA_IS_VIDEO, false)

        Log.d(TAG, "Incoming call: $callId from $callerName ($callerPhone)")

        val connection = ChatrConnection(
            context = this,
            callId = callId,
            callerName = callerName,
            callerPhone = callerPhone,
            callerAvatar = callerAvatar,
            isVideo = isVideo,
            isIncoming = true,
            onStatusChange = { status ->
                updateCallStatusInBackend(callId, status)
            }
        )

        // Use custom chatr: URI for self-managed apps (must match PhoneAccount scheme)
        connection.setAddress(
            Uri.parse("chatr:$callerPhone"),
            TelecomManager.PRESENTATION_ALLOWED
        )
        connection.setCallerDisplayName(callerName, TelecomManager.PRESENTATION_ALLOWED)
        connection.setRinging()

        // CRITICAL: Self-managed calls must show their own UI immediately!
        // System UI is NOT shown for self-managed connections
        launchIncomingCallActivity(callId, callerName, callerPhone, callerAvatar, isVideo)

        return connection
    }
    
    /**
     * Launch full-screen incoming call activity
     * Self-managed connections require app to show its own UI
     */
    private fun launchIncomingCallActivity(
        callId: String,
        callerName: String,
        callerPhone: String,
        callerAvatar: String?,
        isVideo: Boolean
    ) {
        val intent = Intent(this, com.chatr.app.presentation.calling.CallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or 
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_CALL_ID, callId)
            putExtra(EXTRA_CALLER_NAME, callerName)
            putExtra(EXTRA_CALLER_PHONE, callerPhone)
            putExtra(EXTRA_CALLER_AVATAR, callerAvatar)
            putExtra(EXTRA_IS_VIDEO, isVideo)
            putExtra("is_incoming", true)
        }
        startActivity(intent)
        Log.d(TAG, "Launched incoming call activity for $callerName")
    }

    override fun onCreateOutgoingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        Log.d(TAG, "onCreateOutgoingConnection")

        val extras = request?.extras ?: Bundle()
        val callId = extras.getString(EXTRA_CALL_ID) ?: ""
        val receiverName = extras.getString(EXTRA_CALLER_NAME) ?: "Unknown"
        val receiverPhone = request?.address?.schemeSpecificPart ?: ""
        val isVideo = extras.getBoolean(EXTRA_IS_VIDEO, false)

        val connection = ChatrConnection(
            context = this,
            callId = callId,
            callerName = receiverName,
            callerPhone = receiverPhone,
            callerAvatar = null,
            isVideo = isVideo,
            isIncoming = false,
            onStatusChange = { status ->
                updateCallStatusInBackend(callId, status)
            }
        )

        // Use custom chatr: URI for self-managed apps (must match PhoneAccount scheme)
        connection.setAddress(
            Uri.parse("chatr:$receiverPhone"),
            TelecomManager.PRESENTATION_ALLOWED
        )
        connection.setCallerDisplayName(receiverName, TelecomManager.PRESENTATION_ALLOWED)
        connection.setDialing()

        return connection
    }

    override fun onCreateIncomingConnectionFailed(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ) {
        Log.e(TAG, "onCreateIncomingConnectionFailed")
        super.onCreateIncomingConnectionFailed(connectionManagerPhoneAccount, request)
    }

    override fun onCreateOutgoingConnectionFailed(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ) {
        Log.e(TAG, "onCreateOutgoingConnectionFailed")
        super.onCreateOutgoingConnectionFailed(connectionManagerPhoneAccount, request)
    }

    /**
     * Update call status in backend using native-call-update edge function
     * This bypasses RLS for service-level updates
     */
    private fun updateCallStatusInBackend(callId: String, status: String) {
        if (callId.isEmpty()) return

        serviceScope.launch {
            try {
                val response = httpClient.patch("${BuildConfig.SUPABASE_URL}/functions/v1/native-call-update") {
                    contentType(ContentType.Application.Json)
                    header("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
                    setBody(mapOf(
                        "call_id" to callId,
                        "status" to status,
                        "timestamp" to System.currentTimeMillis()
                    ))
                }
                Log.d(TAG, "Call status updated: $status for $callId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update call status", e)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "ChatrConnectionService destroyed")
    }
}
