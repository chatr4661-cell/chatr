package com.chatr.app.calling.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.chatr.app.ChatrApplication
import com.chatr.app.R
import com.chatr.app.presentation.calling.CallActivity
import dagger.hilt.android.AndroidEntryPoint

/**
 * Foreground Service for active calls
 * 
 * Required for:
 * - Keeping call alive when app is backgrounded
 * - Showing persistent notification during calls
 * - Preventing system from killing the app
 */
@AndroidEntryPoint
class CallForegroundService : Service() {

    companion object {
        private const val TAG = "CallForegroundService"
        private const val NOTIFICATION_ID = 1001

        const val ACTION_START_CALL = "com.chatr.app.ACTION_START_CALL"
        const val ACTION_END_CALL = "com.chatr.app.ACTION_END_CALL"
        const val ACTION_MUTE = "com.chatr.app.ACTION_MUTE"
        const val ACTION_SPEAKER = "com.chatr.app.ACTION_SPEAKER"

        const val EXTRA_CALL_ID = "extra_call_id"
        const val EXTRA_CALLER_NAME = "extra_caller_name"
        const val EXTRA_CALLER_PHONE = "extra_caller_phone"
        const val EXTRA_IS_VIDEO = "extra_is_video"
        const val EXTRA_IS_INCOMING = "extra_is_incoming"

        fun start(
            context: Context,
            callId: String,
            callerName: String,
            callerPhone: String,
            isVideo: Boolean,
            isIncoming: Boolean
        ) {
            val intent = Intent(context, CallForegroundService::class.java).apply {
                action = ACTION_START_CALL
                putExtra(EXTRA_CALL_ID, callId)
                putExtra(EXTRA_CALLER_NAME, callerName)
                putExtra(EXTRA_CALLER_PHONE, callerPhone)
                putExtra(EXTRA_IS_VIDEO, isVideo)
                putExtra(EXTRA_IS_INCOMING, isIncoming)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, CallForegroundService::class.java).apply {
                action = ACTION_END_CALL
            }
            context.startService(intent)
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var currentCallId: String? = null
    private var currentCallerName: String? = null
    private var isVideo: Boolean = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        acquireWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_CALL -> {
                val callId = intent.getStringExtra(EXTRA_CALL_ID) ?: ""
                val callerName = intent.getStringExtra(EXTRA_CALLER_NAME) ?: "Unknown"
                val callerPhone = intent.getStringExtra(EXTRA_CALLER_PHONE) ?: ""
                isVideo = intent.getBooleanExtra(EXTRA_IS_VIDEO, false)
                val isIncoming = intent.getBooleanExtra(EXTRA_IS_INCOMING, false)

                currentCallId = callId
                currentCallerName = callerName

                startForeground(NOTIFICATION_ID, createCallNotification(callerName, callerPhone, isVideo))
            }
            ACTION_END_CALL -> {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            ACTION_MUTE -> {
                // Handle mute toggle
            }
            ACTION_SPEAKER -> {
                // Handle speaker toggle
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        releaseWakeLock()
    }

    private fun createCallNotification(callerName: String, callerPhone: String, isVideo: Boolean): Notification {
        val callType = if (isVideo) "Video call" else "Voice call"
        
        // Intent to open call activity
        val contentIntent = Intent(this, CallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_CALL_ID, currentCallId)
            putExtra(EXTRA_CALLER_NAME, callerName)
        }
        val contentPendingIntent = PendingIntent.getActivity(
            this, 0, contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // End call action
        val endCallIntent = Intent(this, CallForegroundService::class.java).apply {
            action = ACTION_END_CALL
        }
        val endCallPendingIntent = PendingIntent.getService(
            this, 1, endCallIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, ChatrApplication.CHANNEL_CALLS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("ChatrPlus $callType")
            .setContentText(callerName)
            .setSubText(callerPhone)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(contentPendingIntent)
            .addAction(
                R.drawable.ic_call_end,
                "End Call",
                endCallPendingIntent
            )
            .setUsesChronometer(true)
            .build()
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "CHATR::CallWakeLock"
        )
        wakeLock?.acquire(60 * 60 * 1000L) // 1 hour max
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
            }
        }
        wakeLock = null
    }
}
