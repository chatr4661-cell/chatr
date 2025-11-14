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
            
            // Calls channel
            val callsChannel = NotificationChannel(
                CHANNEL_CALLS,
                "Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Incoming call notifications"
                setSound(null, null)
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
        message.data.let { data ->
            when (data["type"]) {
                "message" -> handleMessageNotification(data)
                "call" -> handleCallNotification(data)
                else -> handleSystemNotification(data)
            }
        }
    }
    
    private fun handleMessageNotification(data: Map<String, String>) {
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("conversationId", data["conversationId"])
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(this, CHANNEL_MESSAGES)
            .setContentTitle(data["senderName"])
            .setContentText(data["messageText"])
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .addAction(
                R.drawable.ic_reply,
                "Reply",
                createReplyIntent(data["conversationId"] ?: "")
            )
            .build()
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(data["conversationId"].hashCode(), notification)
    }
    
    private fun handleCallNotification(data: Map<String, String>) {
        // Handled by CallManager and ConnectionService
    }
    
    private fun handleSystemNotification(data: Map<String, String>) {
        val notification = NotificationCompat.Builder(this, CHANNEL_SYSTEM)
            .setContentTitle(data["title"])
            .setContentText(data["body"])
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
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
