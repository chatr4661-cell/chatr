package com.chatr.app.receivers

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import com.chatr.app.MainActivity
import com.chatr.app.services.ChatrFirebaseMessagingService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * NOTIFICATION ACTION RECEIVER
 * 
 * Handles inline actions from notifications:
 * - Answer/Reject calls
 * - Reply to messages
 * - Mark messages as read
 */
class NotificationActionReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "NotificationAction"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        Log.i(TAG, "📥 Action received: ${intent.action}")

        when (intent.action) {
            "ACTION_ANSWER_CALL" -> handleAnswerCall(context, intent)
            "ACTION_REJECT_CALL" -> handleRejectCall(context, intent)
            "ACTION_REPLY_MESSAGE" -> handleReplyMessage(context, intent)
            "ACTION_MARK_READ" -> handleMarkRead(context, intent)
        }
    }

    private fun handleAnswerCall(context: Context, intent: Intent) {
        val callId = intent.getStringExtra("call_id") ?: return
        Log.i(TAG, "✅ Answering call: $callId")

        // Cancel vibration
        stopVibration(context)

        // Cancel notification
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        notificationManager?.cancel(ChatrFirebaseMessagingService.CALL_NOTIFICATION_ID)

        // Launch MainActivity with answer action
        val mainIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", "answer_call")
            putExtra("call_id", callId)
        }
        context.startActivity(mainIntent)
    }

    private fun handleRejectCall(context: Context, intent: Intent) {
        val callId = intent.getStringExtra("call_id") ?: return
        Log.i(TAG, "❌ Rejecting call: $callId")

        // Cancel vibration
        stopVibration(context)

        // Cancel notification
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        notificationManager?.cancel(ChatrFirebaseMessagingService.CALL_NOTIFICATION_ID)

        // Launch MainActivity with reject action
        val mainIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", "reject_call")
            putExtra("call_id", callId)
        }
        context.startActivity(mainIntent)
    }

    private fun handleReplyMessage(context: Context, intent: Intent) {
        val conversationId = intent.getStringExtra("conversation_id") ?: return
        
        // Get reply text from RemoteInput
        val remoteInput = RemoteInput.getResultsFromIntent(intent)
        val replyText = remoteInput?.getCharSequence(ChatrFirebaseMessagingService.KEY_TEXT_REPLY)?.toString()

        if (replyText.isNullOrBlank()) {
            Log.w(TAG, "Empty reply text")
            return
        }

        Log.i(TAG, "💬 Sending reply to $conversationId: $replyText")

        // Update notification to show "Sending..."
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        val notificationId = 2000 + conversationId.hashCode()
        
        val notification = NotificationCompat.Builder(context, "messages")
            .setSmallIcon(android.R.drawable.ic_menu_send)
            .setContentTitle("Sending...")
            .setContentText(replyText)
            .build()
        
        notificationManager?.notify(notificationId, notification)

        // Send reply via WebView/JavaScript bridge
        CoroutineScope(Dispatchers.IO).launch {
            // The actual send happens when MainActivity opens
            // For now, launch MainActivity with reply data
            val mainIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("action", "send_reply")
                putExtra("conversation_id", conversationId)
                putExtra("reply_text", replyText)
            }
            context.startActivity(mainIntent)
            
            // Dismiss notification after short delay
            kotlinx.coroutines.delay(2000)
            notificationManager?.cancel(notificationId)
        }
    }

    private fun handleMarkRead(context: Context, intent: Intent) {
        val conversationId = intent.getStringExtra("conversation_id") ?: return
        Log.i(TAG, "✓ Marking as read: $conversationId")

        // Cancel notification
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        val notificationId = 2000 + conversationId.hashCode()
        notificationManager?.cancel(notificationId)

        // Mark read via WebView/JavaScript bridge
        // This happens when the app next syncs
    }

    private fun stopVibration(context: Context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator.cancel()
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                vibrator.cancel()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop vibration", e)
        }
    }
}
