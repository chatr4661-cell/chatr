package com.chatr.app.notification

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.chatr.app.ChatrApplication
import com.chatr.app.R
import com.chatr.app.calling.TelecomHelper
import com.chatr.app.presentation.MainActivity
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * Firebase Messaging Service for CHATR
 * 
 * Handles:
 * - Incoming call notifications (data-only, high priority)
 * - Message notifications
 * - Token refresh
 * 
 * Critical: Call notifications MUST be data-only to wake killed apps
 */
@AndroidEntryPoint
class ChatrFirebaseService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "ChatrFirebaseService"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed")
        // Token will be registered when user is authenticated
        // Save to SharedPreferences for later registration
        getSharedPreferences("chatr_prefs", Context.MODE_PRIVATE)
            .edit()
            .putString("pending_fcm_token", token)
            .apply()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "FCM message received: ${remoteMessage.data}")

        val data = remoteMessage.data

        // Handle both camelCase and snake_case keys
        val type = data["type"] ?: data["notification_type"] ?: return

        when (type) {
            "call", "incoming_call" -> handleCallNotification(data)
            "message", "new_message" -> handleMessageNotification(data)
            "missed_call" -> handleMissedCallNotification(data)
            else -> Log.d(TAG, "Unknown notification type: $type")
        }
    }

    /**
     * Handle incoming call notification
     * Uses TelecomManager for native call UI with fallback
     */
    private fun handleCallNotification(data: Map<String, String>) {
        val callId = data["call_id"] ?: data["callId"] ?: return
        val callerId = data["caller_id"] ?: data["callerId"] ?: return
        val callerName = data["caller_name"] ?: data["callerName"] ?: "Unknown"
        val callerPhone = data["caller_phone"] ?: data["callerPhone"] ?: ""
        val callerAvatar = data["caller_avatar"] ?: data["callerAvatar"]
        val callType = data["call_type"] ?: data["callType"] ?: "audio"
        val isVideo = callType == "video"

        Log.d(TAG, "📞 Incoming call from $callerName ($callerPhone), callId: $callId")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                // Use TelecomManager for native call UI
                TelecomHelper.reportIncomingCall(
                    context = this,
                    callId = callId,
                    callerPhone = callerPhone,
                    callerName = callerName,
                    callerAvatar = callerAvatar,
                    isVideo = isVideo
                )
                Log.d(TAG, "✅ Reported call to TelecomManager")
            } catch (e: Exception) {
                Log.e(TAG, "❌ TelecomManager failed, using fallback", e)
                showFallbackCallNotification(callId, callerName, callerPhone, isVideo)
            }
        } else {
            // Fallback for older devices
            showFallbackCallNotification(callId, callerName, callerPhone, isVideo)
        }
    }

    /**
     * Fallback notification for devices without Telecom API
     */
    private fun showFallbackCallNotification(
        callId: String,
        callerName: String,
        callerPhone: String,
        isVideo: Boolean
    ) {
        val callType = if (isVideo) "Video call" else "Voice call"

        val fullScreenIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("call_id", callId)
            putExtra("caller_name", callerName)
            putExtra("is_incoming", true)
            putExtra("is_video", isVideo)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this, 0, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, ChatrApplication.CHANNEL_CALLS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("ChatrPlus $callType")
            .setContentText("$callerName is calling...")
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(false)
            .setOngoing(true)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setVibrate(longArrayOf(0, 500, 200, 500, 200, 500))
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(callId.hashCode(), notification)
    }

    /**
     * Handle message notification
     */
    private fun handleMessageNotification(data: Map<String, String>) {
        val conversationId = data["conversation_id"] ?: data["conversationId"] ?: return
        val senderName = data["sender_name"] ?: data["senderName"] ?: "Unknown"
        val content = data["content"] ?: data["message"] ?: ""
        val senderId = data["sender_id"] ?: data["senderId"] ?: ""

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("conversation_id", conversationId)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, conversationId.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Reply action
        val replyIntent = Intent(this, NotificationActionReceiver::class.java).apply {
            action = "REPLY"
            putExtra("conversation_id", conversationId)
        }
        val replyPendingIntent = PendingIntent.getBroadcast(
            this, conversationId.hashCode() + 1, replyIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )

        val notification = NotificationCompat.Builder(this, ChatrApplication.CHANNEL_MESSAGES)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(senderName)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .addAction(
                R.drawable.ic_reply,
                "Reply",
                replyPendingIntent
            )
            .setStyle(NotificationCompat.BigTextStyle().bigText(content))
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(conversationId.hashCode(), notification)
    }

    /**
     * Handle missed call notification
     */
    private fun handleMissedCallNotification(data: Map<String, String>) {
        val callerName = data["caller_name"] ?: data["callerName"] ?: "Unknown"
        val callerPhone = data["caller_phone"] ?: data["callerPhone"] ?: ""
        val callType = data["call_type"] ?: data["callType"] ?: "audio"

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("open_tab", "calls")
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, ChatrApplication.CHANNEL_MISSED_CALLS)
            .setSmallIcon(R.drawable.ic_missed_call)
            .setContentTitle("Missed $callType call")
            .setContentText("$callerName ($callerPhone)")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify("missed_call".hashCode(), notification)
    }
}
