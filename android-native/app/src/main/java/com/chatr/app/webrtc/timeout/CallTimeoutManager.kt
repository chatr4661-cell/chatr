package com.chatr.app.webrtc.timeout

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.chatr.app.ChatrApplication
import com.chatr.app.R
import com.chatr.app.data.local.entity.CallEntity
import com.chatr.app.webrtc.signaling.CallSignalingRepository
import com.chatr.app.webrtc.signaling.RejectReason
import com.chatr.app.webrtc.state.CallState
import com.chatr.app.webrtc.state.CallStateMachine
import com.chatr.app.webrtc.state.FailureReason
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Call Timeout Manager - Handles ring timeout and missed call logic
 * 
 * Telecom-grade requirements:
 * - Ring timeout (configurable, default 60s for infinite-ringing requirement)
 * - Missed call detection
 * - Missed call notifications
 * - Auto cleanup on timeout
 * - Call log persistence
 */
@Singleton
class CallTimeoutManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val signalingRepository: CallSignalingRepository,
    private val callStateMachine: CallStateMachine
) {
    companion object {
        private const val TAG = "CallTimeoutManager"
        
        // Per memory: "30-second auto-reject removed so calls ring indefinitely"
        // But we still need a VERY long timeout for cleanup (e.g., 5 minutes)
        const val RING_TIMEOUT_MS = 5 * 60 * 1000L // 5 minutes max ring
        const val OUTGOING_TIMEOUT_MS = 60 * 1000L // 60 seconds for outgoing
        
        private const val MISSED_CALL_NOTIFICATION_ID = 2001
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var timeoutJob: Job? = null
    private var currentCallId: String? = null
    private var isIncoming: Boolean = false

    private val _timeoutCountdown = MutableStateFlow<Long?>(null)
    val timeoutCountdown: StateFlow<Long?> = _timeoutCountdown.asStateFlow()

    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    /**
     * Start timeout for ringing call
     */
    fun startRingTimeout(
        callId: String,
        incoming: Boolean,
        callerName: String?,
        callerPhone: String?,
        callerAvatar: String?
    ) {
        Log.d(TAG, "Starting ring timeout for call: $callId (incoming: $incoming)")
        
        currentCallId = callId
        isIncoming = incoming
        
        val timeout = if (incoming) RING_TIMEOUT_MS else OUTGOING_TIMEOUT_MS
        
        timeoutJob?.cancel()
        timeoutJob = scope.launch {
            var remaining = timeout
            
            while (remaining > 0) {
                _timeoutCountdown.value = remaining
                delay(1000)
                remaining -= 1000
                
                // Check if call state changed (answered/ended)
                val currentState = callStateMachine.currentState.value
                if (currentState !is CallState.Ringing && currentState !is CallState.Initiating) {
                    Log.d(TAG, "Call state changed to $currentState, canceling timeout")
                    cancel()
                    return@launch
                }
            }
            
            // Timeout reached
            Log.d(TAG, "Ring timeout reached for call: $callId")
            handleTimeout(callId, incoming, callerName, callerPhone, callerAvatar)
        }
    }

    /**
     * Cancel timeout (call answered or ended)
     */
    fun cancelTimeout() {
        Log.d(TAG, "Canceling timeout for call: $currentCallId")
        timeoutJob?.cancel()
        timeoutJob = null
        currentCallId = null
        _timeoutCountdown.value = null
    }

    /**
     * Handle timeout - mark as missed if incoming
     */
    private suspend fun handleTimeout(
        callId: String,
        incoming: Boolean,
        callerName: String?,
        callerPhone: String?,
        callerAvatar: String?
    ) {
        _timeoutCountdown.value = null
        
        if (incoming) {
            // Incoming call timeout = Missed call
            Log.d(TAG, "Incoming call timed out - marking as missed: $callId")
            
            // Update state machine
            callStateMachine.transition(CallState.Failed(FailureReason.TIMEOUT))
            
            // Mark in database
            signalingRepository.markAsMissed(callId)
            
            // Send reject with timeout reason
            signalingRepository.rejectCall(callId, RejectReason.TIMEOUT)
            
            // Show missed call notification
            showMissedCallNotification(callId, callerName, callerPhone, callerAvatar)
            
            // Disconnect signaling
            signalingRepository.disconnect()
            
        } else {
            // Outgoing call timeout = Other party not answering
            Log.d(TAG, "Outgoing call timed out - no answer: $callId")
            
            callStateMachine.transition(CallState.Disconnected)
            
            // Cancel the call
            signalingRepository.cancelCall(callId)
            signalingRepository.disconnect()
        }
        
        currentCallId = null
    }

    /**
     * Show missed call notification
     */
    private fun showMissedCallNotification(
        callId: String,
        callerName: String?,
        callerPhone: String?,
        callerAvatar: String?
    ) {
        val displayName = callerName ?: callerPhone ?: "Unknown"
        
        // Intent to open call history
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("open_tab", "calls")
        }
        
        val pendingIntent = PendingIntent.getActivity(
            context,
            MISSED_CALL_NOTIFICATION_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Callback intent
        val callbackIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
            putExtra("action", "callback")
            putExtra("phone", callerPhone)
            putExtra("name", callerName)
        }
        
        val callbackPendingIntent = PendingIntent.getActivity(
            context,
            MISSED_CALL_NOTIFICATION_ID + 1,
            callbackIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, ChatrApplication.CHANNEL_MISSED_CALLS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Missed call")
            .setContentText(displayName)
            .setSubText(callerPhone)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_MISSED_CALL)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setContentIntent(pendingIntent)
            .addAction(
                R.drawable.ic_call,
                "Call back",
                callbackPendingIntent
            )
            .build()

        notificationManager.notify(MISSED_CALL_NOTIFICATION_ID, notification)
        Log.d(TAG, "Missed call notification shown for: $displayName")
    }

    /**
     * Clear missed call notifications
     */
    fun clearMissedCallNotifications() {
        notificationManager.cancel(MISSED_CALL_NOTIFICATION_ID)
    }
}
