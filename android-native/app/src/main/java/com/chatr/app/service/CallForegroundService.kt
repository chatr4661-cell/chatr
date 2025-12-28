package com.chatr.app.service

import android.app.*
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.chatr.app.MainActivity
import com.chatr.app.R

class CallForegroundService : Service() {
    
    companion object {
        const val CHANNEL_ID = "call_service_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START_CALL = "START_CALL"
        const val ACTION_END_CALL = "END_CALL"
        const val EXTRA_CALL_ID = "callId"
        const val EXTRA_CALLER_NAME = "callerName"
        const val EXTRA_IS_VIDEO = "isVideo"
    }
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        android.util.Log.e("FCM_KILLED", "🔥 CallForegroundService.onStartCommand called")
        android.util.Log.e("FCM_KILLED", "🔥 Intent action: ${intent?.action}")
        
        when (intent?.action) {
            ACTION_START_CALL -> {
                val callId = intent.getStringExtra(EXTRA_CALL_ID) ?: ""
                val callerName = intent.getStringExtra(EXTRA_CALLER_NAME) ?: "Unknown Caller"
                val isVideo = intent.getBooleanExtra(EXTRA_IS_VIDEO, false)
                
                android.util.Log.e("FCM_KILLED", "🔥 ACTION_START_CALL: callId=$callId, caller=$callerName, video=$isVideo")
                startForegroundService(callId, callerName, isVideo)
            }
            ACTION_END_CALL -> {
                android.util.Log.e("FCM_KILLED", "🔥 ACTION_END_CALL")
                stopForegroundService()
            }
        }
        return START_NOT_STICKY
    }
    
    private fun startForegroundService(callId: String, callerName: String, isVideo: Boolean) {
        android.util.Log.e("FCM_KILLED", "🔥 startForegroundService: Creating full screen intent")
        
        val fullScreenIntent = Intent(this, com.chatr.app.ui.activities.CallActivity::class.java).apply {
            putExtra("callerName", callerName)
            putExtra("callId", callId)
            putExtra("isVideo", isVideo)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        }

        android.util.Log.e("FCM_KILLED", "🔥 Creating notification with full screen intent")
        val notification = createNotification(callId, callerName, isVideo, fullScreenIntent)
        
        android.util.Log.e("FCM_KILLED", "🔥 Calling startForeground with notification")
        startForeground(NOTIFICATION_ID, notification)

        android.util.Log.e("FCM_KILLED", "🔥 Starting CallActivity")
        // Force the call screen over any existing UI
        startActivity(fullScreenIntent)
        
        android.util.Log.e("FCM_KILLED", "✅ CallForegroundService fully started - call UI should be visible!")
    }
    
    private fun stopForegroundService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }
    
    private fun createNotification(
        callId: String,
        callerName: String,
        isVideo: Boolean,
        fullScreenIntent: Intent
    ): Notification {
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            callId.hashCode(),
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Incoming ${if (isVideo) "video" else "voice"} call")
            .setContentText(callerName)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(fullScreenPendingIntent)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .build()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call Service",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Ongoing call notification"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
}
