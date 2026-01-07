package com.chatr.app.services

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.chatr.app.ChatrApplication
import com.chatr.app.R

/**
 * BACKGROUND SYNC SERVICE
 * 
 * Handles message synchronization and data sync in the background.
 * Triggered on network recovery or scheduled intervals.
 */
class BackgroundSyncService : Service() {

    companion object {
        private const val TAG = "BackgroundSyncService"
        const val NOTIFICATION_ID = 4001
        
        const val ACTION_SYNC_MESSAGES = "com.chatr.app.action.SYNC_MESSAGES"
        const val ACTION_SYNC_CONTACTS = "com.chatr.app.action.SYNC_CONTACTS"
        const val ACTION_SYNC_ALL = "com.chatr.app.action.SYNC_ALL"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "🔄 Background sync started: ${intent?.action}")

        // Start as foreground service for reliability
        val notification = NotificationCompat.Builder(this, ChatrApplication.CHANNEL_FOREGROUND)
            .setSmallIcon(R.drawable.ic_sync)
            .setContentTitle("Syncing...")
            .setContentText("Updating your messages and data")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        // Perform sync based on action
        when (intent?.action) {
            ACTION_SYNC_MESSAGES -> syncMessages()
            ACTION_SYNC_CONTACTS -> syncContacts()
            ACTION_SYNC_ALL -> {
                syncMessages()
                syncContacts()
            }
        }

        // Stop service when done
        stopSelf()

        return START_NOT_STICKY
    }

    private fun syncMessages() {
        Log.i(TAG, "📬 Syncing messages...")
        // The actual sync happens in the WebView via JavaScript
        // This service just ensures the app stays alive during sync
    }

    private fun syncContacts() {
        Log.i(TAG, "👥 Syncing contacts...")
        // Contact sync logic
    }

    override fun onDestroy() {
        Log.i(TAG, "✅ Background sync completed")
        super.onDestroy()
    }
}
