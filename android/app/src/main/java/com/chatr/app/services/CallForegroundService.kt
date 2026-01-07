package com.chatr.app.services

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.chatr.app.ChatrApplication
import com.chatr.app.MainActivity
import com.chatr.app.R

/**
 * CALL FOREGROUND SERVICE
 * 
 * Keeps the app alive during active calls.
 * Required for Android 8.0+ to maintain background execution.
 */
class CallForegroundService : Service() {

    companion object {
        private const val TAG = "CallForegroundService"
        const val NOTIFICATION_ID = 3001
        
        const val ACTION_START = "com.chatr.app.action.START_CALL_SERVICE"
        const val ACTION_STOP = "com.chatr.app.action.STOP_CALL_SERVICE"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val callType = intent.getStringExtra("call_type") ?: "audio"
                val partnerName = intent.getStringExtra("partner_name") ?: "Active Call"
                startForegroundWithNotification(callType, partnerName)
            }
            ACTION_STOP -> {
                stopSelf()
            }
        }
        
        return START_STICKY
    }

    private fun startForegroundWithNotification(callType: String, partnerName: String) {
        Log.i(TAG, "🔔 Starting call foreground service: $partnerName ($callType)")

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val endCallIntent = Intent(this, CallForegroundService::class.java).apply {
            action = ACTION_STOP
        }
        val endCallPendingIntent = PendingIntent.getService(
            this, 1, endCallIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val callTypeEmoji = if (callType == "video") "📹" else "📞"
        
        val notification = NotificationCompat.Builder(this, ChatrApplication.CHANNEL_FOREGROUND)
            .setSmallIcon(R.drawable.ic_call)
            .setContentTitle("$callTypeEmoji ${if (callType == "video") "Video" else "Voice"} Call")
            .setContentText("In call with $partnerName")
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setContentIntent(pendingIntent)
            .addAction(R.drawable.ic_call_end, "End Call", endCallPendingIntent)
            .setUsesChronometer(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onDestroy() {
        Log.i(TAG, "🔕 Call foreground service stopped")
        super.onDestroy()
    }
}
