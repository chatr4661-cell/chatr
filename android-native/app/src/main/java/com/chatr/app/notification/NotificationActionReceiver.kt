package com.chatr.app.notification

import android.app.RemoteInput
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import dagger.hilt.android.AndroidEntryPoint

/**
 * Handles notification action buttons
 * 
 * Actions:
 * - REPLY: Inline reply to messages
 * - MARK_READ: Mark conversation as read
 * - CALL_BACK: Call back missed call
 */
@AndroidEntryPoint
class NotificationActionReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "NotificationAction"
        const val KEY_REPLY_TEXT = "key_reply_text"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            "REPLY" -> handleReply(context, intent)
            "MARK_READ" -> handleMarkRead(context, intent)
            "CALL_BACK" -> handleCallBack(context, intent)
        }
    }

    private fun handleReply(context: Context, intent: Intent) {
        val conversationId = intent.getStringExtra("conversation_id") ?: return
        val remoteInput = RemoteInput.getResultsFromIntent(intent)
        val replyText = remoteInput?.getCharSequence(KEY_REPLY_TEXT)?.toString()

        if (!replyText.isNullOrBlank()) {
            Log.d(TAG, "Reply to $conversationId: $replyText")
            // TODO: Send message via repository
        }
    }

    private fun handleMarkRead(context: Context, intent: Intent) {
        val conversationId = intent.getStringExtra("conversation_id") ?: return
        Log.d(TAG, "Mark read: $conversationId")
        // TODO: Mark conversation as read via repository
    }

    private fun handleCallBack(context: Context, intent: Intent) {
        val phoneNumber = intent.getStringExtra("phone_number") ?: return
        val callerName = intent.getStringExtra("caller_name") ?: "Unknown"
        Log.d(TAG, "Call back: $phoneNumber")
        // TODO: Initiate call via TelecomHelper
    }
}
