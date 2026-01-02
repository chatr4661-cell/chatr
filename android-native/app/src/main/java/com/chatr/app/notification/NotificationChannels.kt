package com.chatr.app.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.getSystemService

/**
 * Notification channel configuration for CHATR
 * Ensures calls and messages have maximum visibility
 */
object NotificationChannels {
    
    const val CHANNEL_CALLS = "chatr_calls"
    const val CHANNEL_INCOMING_CALLS = "chatr_incoming_calls"
    const val CHANNEL_MESSAGES = "chatr_messages"
    const val CHANNEL_SERVICE = "chatr_service"
    
    fun createAllChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        
        val notificationManager = context.getSystemService<NotificationManager>() ?: return
        
        // Incoming Calls Channel - HIGHEST PRIORITY
        val incomingCallChannel = NotificationChannel(
            CHANNEL_INCOMING_CALLS,
            "Incoming Calls",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Notifications for incoming voice and video calls"
            setBypassDnd(true)
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            setShowBadge(true)
            
            // Use default ringtone
            val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            setSound(ringtoneUri, AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            )
        }
        
        // Ongoing Calls Channel
        val callChannel = NotificationChannel(
            CHANNEL_CALLS,
            "Ongoing Calls",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Notifications for active calls"
            setBypassDnd(true)
            enableVibration(false)
            setSound(null, null)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        }
        
        // Messages Channel
        val messageChannel = NotificationChannel(
            CHANNEL_MESSAGES,
            "Messages",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Notifications for new messages"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 250, 250, 250)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
            setShowBadge(true)
            
            val notificationUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            setSound(notificationUri, AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            )
        }
        
        // Foreground Service Channel
        val serviceChannel = NotificationChannel(
            CHANNEL_SERVICE,
            "Background Service",
            NotificationManager.IMPORTANCE_MIN
        ).apply {
            description = "Keeps Chatr running for reliable calls"
            enableVibration(false)
            setSound(null, null)
            setShowBadge(false)
        }
        
        notificationManager.createNotificationChannels(
            listOf(incomingCallChannel, callChannel, messageChannel, serviceChannel)
        )
    }
    
    fun areNotificationsEnabled(context: Context): Boolean {
        return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }
    
    fun isCallChannelEnabled(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return areNotificationsEnabled(context)
        }
        
        val notificationManager = context.getSystemService<NotificationManager>() ?: return false
        val channel = notificationManager.getNotificationChannel(CHANNEL_INCOMING_CALLS)
        
        return channel != null && 
               channel.importance != NotificationManager.IMPORTANCE_NONE &&
               areNotificationsEnabled(context)
    }
    
    fun getNotificationDiagnostics(context: Context): Map<String, Any> {
        val diagnostics = mutableMapOf<String, Any>()
        
        diagnostics["notifications_enabled"] = areNotificationsEnabled(context)
        diagnostics["call_channel_enabled"] = isCallChannelEnabled(context)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService<NotificationManager>()
            
            val channels = listOf(
                CHANNEL_INCOMING_CALLS to "incoming_calls",
                CHANNEL_CALLS to "calls",
                CHANNEL_MESSAGES to "messages",
                CHANNEL_SERVICE to "service"
            )
            
            channels.forEach { (channelId, key) ->
                val channel = notificationManager?.getNotificationChannel(channelId)
                diagnostics["${key}_importance"] = channel?.importance ?: -1
                diagnostics["${key}_bypass_dnd"] = channel?.canBypassDnd() ?: false
            }
        }
        
        return diagnostics
    }
}
