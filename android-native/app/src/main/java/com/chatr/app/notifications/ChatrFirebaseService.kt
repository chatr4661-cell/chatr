package com.chatr.app.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.chatr.app.MainActivity
import com.chatr.app.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class ChatrFirebaseService : FirebaseMessagingService() {
    
    companion object {
        const val CHANNEL_MESSAGES = "messages"
        const val CHANNEL_CALLS = "calls"
        const val CHANNEL_SYSTEM = "system"
    }
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }
    
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Messages channel
            val messagesChannel = NotificationChannel(
                CHANNEL_MESSAGES,
                "Messages",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "New message notifications"
                enableVibration(true)
            }
            
            // Calls channel - HIGH priority with vibration for lock screen
            val callsChannel = NotificationChannel(
                CHANNEL_CALLS,
                "Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Incoming call notifications"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            
            // System channel
            val systemChannel = NotificationChannel(
                CHANNEL_SYSTEM,
                "System",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "System notifications"
            }
            
            notificationManager.createNotificationChannel(messagesChannel)
            notificationManager.createNotificationChannel(callsChannel)
            notificationManager.createNotificationChannel(systemChannel)
        }
    }
    
    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data

        // 🔥 CRITICAL DEBUG LOG - This MUST appear in logcat when FCM arrives
        // Use android.util.Log.e for MAXIMUM visibility
        android.util.Log.e("FCM_KILLED", "🔥🔥🔥 FCM RECEIVED - App state unknown 🔥🔥🔥")
        android.util.Log.e("FCM_KILLED", "🔥 Data payload: $data")
        android.util.Log.e("FCM_KILLED", "🔥 Type: ${data["type"]}")
        android.util.Log.e("FCM_KILLED", "🔥 Call ID: ${data["call_id"] ?: data["callId"]}")
        android.util.Log.e("FCM_KILLED", "🔥 Caller: ${data["caller_name"] ?: data["callerName"]}")

        // Ensure CPU stays awake long enough to handle high-priority FCM
        val powerManager = getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
        val wakeLock = powerManager.newWakeLock(
            android.os.PowerManager.PARTIAL_WAKE_LOCK or android.os.PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "Chatr:FCM"
        )

        try {
            wakeLock.acquire(10_000)
            
            android.util.Log.e("FCM_KILLED", "🔥 Processing message type: ${data["type"]}")
            
            when (data["type"]) {
                "message" -> handleMessageNotification(data)
                "call" -> {
                    android.util.Log.e("FCM_KILLED", "🔥 CALL TYPE DETECTED - Launching CallForegroundService")
                    handleCallNotification(data)
                }
                else -> handleSystemNotification(data)
            }
        } finally {
            if (wakeLock.isHeld) {
                wakeLock.release()
            }
        }
    }
    
    private fun handleMessageNotification(data: Map<String, String>) {
        android.util.Log.e("FCM_MESSAGE", "🔥 handleMessageNotification START")
        android.util.Log.e("FCM_MESSAGE", "🔥 Raw data: $data")
        
        // Parse the nested JSON data from FCM payload
        val conversationId = data["conversation_id"] 
            ?: data["conversationId"] 
            ?: ""
        
        // Parse sender from JSON string if present
        var senderName = "New Message"
        var senderAvatar = ""
        var messageContent = "You have a new message"
        
        try {
            val senderJson = data["sender"]
            if (senderJson != null) {
                val senderObj = org.json.JSONObject(senderJson)
                senderName = senderObj.optString("username", senderObj.optString("name", "New Message"))
                senderAvatar = senderObj.optString("avatar_url", "")
            } else {
                senderName = data["senderName"] ?: data["sender_name"] ?: "New Message"
            }
            
            val messageJson = data["message"]
            if (messageJson != null) {
                val msgObj = org.json.JSONObject(messageJson)
                messageContent = msgObj.optString("content", "You have a new message")
            } else {
                messageContent = data["messageContent"] 
                    ?: data["message_content"] 
                    ?: data["body"] 
                    ?: "You have a new message"
            }
        } catch (e: Exception) {
            android.util.Log.e("FCM_MESSAGE", "Error parsing message data: ${e.message}")
            // Use fallback values from direct fields
            senderName = data["senderName"] ?: data["sender_name"] ?: "New Message"
            messageContent = data["messageContent"] ?: data["body"] ?: "You have a new message"
        }
        
        android.util.Log.e("FCM_MESSAGE", "🔥 Parsed: sender=$senderName, content=$messageContent, convId=$conversationId")
        
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("conversationId", conversationId)
            putExtra("action", "OPEN_CONVERSATION")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, conversationId.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(this, CHANNEL_MESSAGES)
            .setContentTitle(senderName)
            .setContentText(messageContent)
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setVibrate(longArrayOf(0, 300, 100, 300))
            .setDefaults(NotificationCompat.DEFAULT_SOUND)
            .addAction(
                R.drawable.ic_reply,
                "Reply",
                createReplyIntent(conversationId)
            )
            .build()
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notificationId = if (conversationId.isNotEmpty()) conversationId.hashCode() else System.currentTimeMillis().toInt()
        notificationManager.notify(notificationId, notification)
        
        android.util.Log.e("FCM_MESSAGE", "✅ Message notification displayed")
    }
    
    private fun handleCallNotification(data: Map<String, String>) {
        android.util.Log.e("FCM_KILLED", "🔥 handleCallNotification START")
        android.util.Log.e("FCM_KILLED", "🔥 Raw data map: $data")
        
        // Extract call data with support for both camelCase and snake_case keys
        val callerName = data["callerName"]
            ?: data["caller_name"]
            ?: "Unknown Caller"

        val callerId = data["callerId"]
            ?: data["caller_id"]
            ?: ""

        val callerAvatar = data["callerAvatar"]
            ?: data["caller_avatar"]
            ?: ""

        val callId = data["callId"]
            ?: data["call_id"]
            ?: ""

        val isVideo = data["isVideo"]?.toBoolean()
            ?: data["is_video"]?.toBoolean()
            ?: false

        android.util.Log.e("FCM_KILLED", "🔥 Parsed: callId=$callId, callerName=$callerName, isVideo=$isVideo")

        if (callId.isEmpty()) {
            android.util.Log.e("FCM_KILLED", "❌ CALL ID IS EMPTY - Showing fallback notification")
            showFallbackCallNotification(callerName, isVideo)
            return
        }

        android.util.Log.e("FCM_KILLED", "🔥 Starting CallForegroundService...")

        // Start the foreground service responsible for showing the native call UI
        val serviceIntent = Intent(this, com.chatr.app.service.CallForegroundService::class.java).apply {
            action = com.chatr.app.service.CallForegroundService.ACTION_START_CALL
            putExtra("callerName", callerName)
            putExtra("callerId", callerId)
            putExtra("callerAvatar", callerAvatar)
            putExtra("callId", callId)
            putExtra("isVideo", isVideo)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                android.util.Log.e("FCM_KILLED", "🔥 Calling startForegroundService (Android O+)")
                startForegroundService(serviceIntent)
            } else {
                android.util.Log.e("FCM_KILLED", "🔥 Calling startService (pre-Android O)")
                startService(serviceIntent)
            }
            android.util.Log.e("FCM_KILLED", "✅ Service started successfully!")
        } catch (e: Exception) {
            android.util.Log.e("FCM_KILLED", "❌ Failed to start service: ${e.message}", e)
            // Show fallback notification if service fails
            showFallbackCallNotification(callerName, isVideo)
        }
    }
    
    /**
     * Fallback notification when CallForegroundService fails to start
     * This ensures user ALWAYS sees something even if Android kills the foreground service
     */
    private fun showFallbackCallNotification(callerName: String, isVideo: Boolean) {
        android.util.Log.e("FCM_KILLED", "🔥 Showing FALLBACK call notification")
        
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("action", "ANSWER_CALL")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, System.currentTimeMillis().toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(this, CHANNEL_CALLS)
            .setContentTitle("Incoming ${if (isVideo) "Video" else "Voice"} Call")
            .setContentText(callerName)
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(pendingIntent, true)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setVibrate(longArrayOf(0, 500, 200, 500, 200, 500))
            .setOngoing(true)
            .build()
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(9999, notification)
        
        android.util.Log.e("FCM_KILLED", "✅ Fallback notification displayed")
    }
    
    private fun handleSystemNotification(data: Map<String, String>) {
        android.util.Log.e("FCM_SYSTEM", "🔥 handleSystemNotification: $data")
        
        val title = data["title"] ?: data["notification_title"] ?: "Chatr"
        val body = data["body"] ?: data["notification_body"] ?: data["message"] ?: "You have a notification"
        
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, System.currentTimeMillis().toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(this, CHANNEL_SYSTEM)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
        
        android.util.Log.e("FCM_SYSTEM", "✅ System notification displayed")
    }
    
    private fun createReplyIntent(conversationId: String): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            action = "REPLY_ACTION"
            putExtra("conversationId", conversationId)
        }
        return PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
    
    override fun onNewToken(token: String) {
        // Send token to backend
        sendTokenToServer(token)
    }
    
    private fun sendTokenToServer(token: String) {
        // Implementation to send FCM token to backend
    }
}
