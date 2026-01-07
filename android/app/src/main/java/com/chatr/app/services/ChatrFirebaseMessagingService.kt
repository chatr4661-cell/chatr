package com.chatr.app.services

import android.app.KeyguardManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.app.RemoteInput
import androidx.core.graphics.drawable.IconCompat
import com.chatr.app.ChatrApplication
import com.chatr.app.IncomingCallActivity
import com.chatr.app.MainActivity
import com.chatr.app.R
import com.chatr.app.receivers.NotificationActionReceiver
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.net.URL

/**
 * CHATR+ Firebase Messaging Service
 * 
 * Handles all incoming FCM notifications with carrier-grade reliability.
 * 
 * CRITICAL: This service receives DATA-ONLY FCM messages (no notification block)
 * which allows it to run even when the app is killed.
 * 
 * Notification Types:
 * - call: Launches fullscreen IncomingCallActivity
 * - message: Shows rich notification with reply action
 * - urgent: High-priority alert that bypasses DND
 */
class ChatrFirebaseMessagingService : FirebaseMessagingService() {

    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)

    companion object {
        private const val TAG = "ChatrFCM"
        
        // Notification IDs
        const val CALL_NOTIFICATION_ID = 1001
        const val MESSAGE_NOTIFICATION_BASE = 2000
        
        // Remote input key for direct reply
        const val KEY_TEXT_REPLY = "key_text_reply"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.i(TAG, "📱 New FCM token received: ${token.take(20)}...")
        
        // Store token for later registration
        getSharedPreferences("chatr_prefs", MODE_PRIVATE)
            .edit()
            .putString("pending_fcm_token", token)
            .apply()
        
        // TODO: If user is logged in, register token with backend immediately
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        
        val data = message.data
        Log.i(TAG, "📬 FCM message received: $data")

        // Determine notification type (support both camelCase and snake_case)
        val type = data["type"] ?: data["notificationType"] ?: data["notification_type"] ?: "message"

        when (type.lowercase()) {
            "call" -> handleCallNotification(data)
            "message", "chat" -> handleMessageNotification(data)
            "urgent", "alert" -> handleUrgentNotification(data)
            else -> handleGenericNotification(data)
        }
    }

    /**
     * Handles incoming call notifications
     * 
     * CRITICAL: Launches fullscreen IncomingCallActivity that shows over lock screen
     */
    private fun handleCallNotification(data: Map<String, String>) {
        Log.i(TAG, "📞 Handling CALL notification")
        
        // Extract call data (support both formats)
        val callId = data["call_id"] ?: data["callId"] ?: ""
        val callerId = data["caller_id"] ?: data["callerId"] ?: ""
        val callerName = data["caller_name"] ?: data["callerName"] ?: "Unknown"
        val callerAvatar = data["caller_avatar"] ?: data["callerAvatar"]
        val callType = data["call_type"] ?: data["callType"] ?: "audio"
        val conversationId = data["conversation_id"] ?: data["conversationId"] ?: ""

        // Wake up the device
        wakeDevice()

        // Start vibration
        startRingVibration()

        // Launch fullscreen incoming call activity
        val callIntent = Intent(this, IncomingCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or 
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            
            putExtra("call_id", callId)
            putExtra("caller_id", callerId)
            putExtra("caller_name", callerName)
            putExtra("caller_avatar", callerAvatar)
            putExtra("call_type", callType)
            putExtra("conversation_id", conversationId)
        }

        // Create fullscreen pending intent
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this, 0, callIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Also show heads-up notification as fallback
        showCallNotification(
            callId, callerName, callerAvatar, callType, 
            fullScreenPendingIntent, callIntent
        )

        // Starting an Activity directly from a background service is blocked on Android 10+.
        // Rely on the notification's fullScreenIntent instead.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            try {
                startActivity(callIntent)
                Log.i(TAG, "✅ Launched IncomingCallActivity")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to launch IncomingCallActivity", e)
            }
        } else {
            Log.i(TAG, "ℹ️ Skipping direct startActivity on Android 10+; using fullScreenIntent")
        }
    }

    private fun showCallNotification(
        callId: String,
        callerName: String,
        callerAvatar: String?,
        callType: String,
        fullScreenIntent: PendingIntent,
        baseIntent: Intent
    ) {
        val notificationManager = getSystemService(NotificationManager::class.java) ?: return

        // Answer action
        val answerIntent = Intent(this, NotificationActionReceiver::class.java).apply {
            action = "ACTION_ANSWER_CALL"
            putExtra("call_id", callId)
        }
        val answerPendingIntent = PendingIntent.getBroadcast(
            this, 1, answerIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Reject action
        val rejectIntent = Intent(this, NotificationActionReceiver::class.java).apply {
            action = "ACTION_REJECT_CALL"
            putExtra("call_id", callId)
        }
        val rejectPendingIntent = PendingIntent.getBroadcast(
            this, 2, rejectIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val callTypeEmoji = if (callType == "video") "📹" else "📞"
        
        val notification = NotificationCompat.Builder(this, ChatrApplication.CHANNEL_CALLS_HIGH)
            .setSmallIcon(R.drawable.ic_call)
            .setContentTitle("$callTypeEmoji Incoming ${if (callType == "video") "Video" else "Voice"} Call")
            .setContentText(callerName)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreenIntent, true)
            .addAction(R.drawable.ic_call_end, "Reject", rejectPendingIntent)
            .addAction(R.drawable.ic_call, "Answer", answerPendingIntent)
            .setTimeoutAfter(60000) // Auto-dismiss after 60 seconds
            .build()

        notificationManager.notify(CALL_NOTIFICATION_ID, notification)
        Log.i(TAG, "📢 Call notification shown for: $callerName")
    }

    /**
     * Handles message notifications with rich reply support
     */
    private fun handleMessageNotification(data: Map<String, String>) {
        Log.i(TAG, "💬 Handling MESSAGE notification")

        val senderId = data["sender_id"] ?: data["senderId"] ?: ""
        val senderName = data["sender_name"] ?: data["senderName"] ?: "Someone"
        val senderAvatar = data["sender_avatar"] ?: data["senderAvatar"]
        val messageText = data["message"] ?: data["body"] ?: data["content"] ?: "New message"
        val conversationId = data["conversation_id"] ?: data["conversationId"] ?: ""
        val messageId = data["message_id"] ?: data["messageId"] ?: ""

        val notificationManager = getSystemService(NotificationManager::class.java) ?: return

        // Create intent to open chat
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("navigate_to", "/chat/$conversationId")
            putExtra("conversation_id", conversationId)
        }
        val openPendingIntent = PendingIntent.getActivity(
            this, conversationId.hashCode(), openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Direct reply action
        val remoteInput = RemoteInput.Builder(KEY_TEXT_REPLY)
            .setLabel("Reply...")
            .build()

        val replyIntent = Intent(this, NotificationActionReceiver::class.java).apply {
            action = "ACTION_REPLY_MESSAGE"
            putExtra("conversation_id", conversationId)
            putExtra("sender_id", senderId)
        }
        val replyPendingIntent = PendingIntent.getBroadcast(
            this, conversationId.hashCode() + 1, replyIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )

        val replyAction = NotificationCompat.Action.Builder(
            R.drawable.ic_reply, "Reply", replyPendingIntent
        )
            .addRemoteInput(remoteInput)
            .setAllowGeneratedReplies(true)
            .build()

        // Mark as read action
        val markReadIntent = Intent(this, NotificationActionReceiver::class.java).apply {
            action = "ACTION_MARK_READ"
            putExtra("conversation_id", conversationId)
        }
        val markReadPendingIntent = PendingIntent.getBroadcast(
            this, conversationId.hashCode() + 2, markReadIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Build messaging style notification
        val person = Person.Builder()
            .setName(senderName)
            .setKey(senderId)
            .build()

        val messagingStyle = NotificationCompat.MessagingStyle(person)
            .setConversationTitle(senderName)
            .addMessage(messageText, System.currentTimeMillis(), person)

        val notification = NotificationCompat.Builder(this, ChatrApplication.CHANNEL_MESSAGES)
            .setSmallIcon(R.drawable.ic_message)
            .setContentTitle(senderName)
            .setContentText(messageText)
            .setStyle(messagingStyle)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setContentIntent(openPendingIntent)
            .addAction(replyAction)
            .addAction(R.drawable.ic_done, "Mark Read", markReadPendingIntent)
            .setGroup("messages")
            .build()

        // Use unique ID based on conversation to stack messages
        val notificationId = MESSAGE_NOTIFICATION_BASE + conversationId.hashCode()
        notificationManager.notify(notificationId, notification)
        
        Log.i(TAG, "📢 Message notification shown from: $senderName")
    }

    /**
     * Handles urgent notifications that bypass DND
     */
    private fun handleUrgentNotification(data: Map<String, String>) {
        Log.i(TAG, "🚨 Handling URGENT notification")

        val title = data["title"] ?: "Urgent Alert"
        val body = data["body"] ?: data["message"] ?: "You have an urgent notification"
        val clickAction = data["click_action"] ?: data["clickAction"] ?: ""

        val notificationManager = getSystemService(NotificationManager::class.java) ?: return

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (clickAction.isNotEmpty()) {
                putExtra("navigate_to", clickAction)
            }
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, ChatrApplication.CHANNEL_URGENT)
            .setSmallIcon(R.drawable.ic_warning)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
        Log.i(TAG, "📢 Urgent notification shown: $title")
    }

    /**
     * Handles generic notifications
     */
    private fun handleGenericNotification(data: Map<String, String>) {
        val title = data["title"] ?: "Chatr+"
        val body = data["body"] ?: data["message"] ?: ""
        val clickAction = data["click_action"] ?: ""

        if (body.isEmpty()) return

        val notificationManager = getSystemService(NotificationManager::class.java) ?: return

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (clickAction.isNotEmpty()) {
                putExtra("navigate_to", clickAction)
            }
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, ChatrApplication.CHANNEL_MESSAGES)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    /**
     * Wakes the device screen for incoming calls
     */
    private fun wakeDevice() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            val wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or 
                PowerManager.ACQUIRE_CAUSES_WAKEUP or 
                PowerManager.ON_AFTER_RELEASE,
                "chatr:incoming_call"
            )
            wakeLock.acquire(30000) // 30 seconds
            Log.d(TAG, "📱 Device wake lock acquired")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to wake device", e)
        }
    }

    /**
     * Starts call-like vibration pattern
     */
    private fun startRingVibration() {
        try {
            val pattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator.vibrate(
                    VibrationEffect.createWaveform(pattern, 0)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(pattern, 0)
                }
            }
            Log.d(TAG, "📳 Ring vibration started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start vibration", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        job.cancel()
    }
}
