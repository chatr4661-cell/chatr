package com.chatr.app.services

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.telecom.PhoneAccount
import android.telecom.TelecomManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.app.RemoteInput
import com.chatr.app.ChatrApplication
import com.chatr.app.ChatrSystemContactSync
import com.chatr.app.MainActivity
import com.chatr.app.NativeCallMode
import com.chatr.app.NativeIncomingCallActivity
import com.chatr.app.R
import com.chatr.app.receivers.NotificationActionReceiver

object ChatrNotificationCoordinator {

    private const val TAG = "ChatrNotifications"
    private const val CALL_NOTIFICATION_BASE = 100_000
    private const val MESSAGE_NOTIFICATION_BASE = 1_100_000
    private const val DUPLICATE_CALL_ALERT_WINDOW_MS = 12_000L
    private const val DUPLICATE_TELECOM_REGISTRATION_WINDOW_MS = 45_000L

    private val recentIncomingCallAlerts =
        java.util.Collections.synchronizedMap(
            object : java.util.LinkedHashMap<String, Long>(128, 0.75f, true) {
                override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Long>): Boolean {
                    return size > 128
                }
            },
        )

    fun showIncomingCall(
        context: Context,
        callId: String,
        callerId: String,
        callerName: String,
        callerAvatar: String?,
        callerPhone: String,
        callType: String,
        conversationId: String,
        source: String = "unknown",
    ) {
        if (callId.isBlank()) {
            Log.w(TAG, "Ignoring incoming call without callId from $source")
            return
        }

        val appContext = context.applicationContext

        if (!registerIncomingCallAlert(appContext, callId)) {
            Log.i(TAG, "Skipping duplicate incoming call alert for $callId from $source")
            return
        }

        val sanitizedCallType = NativeCallMode.sanitizeCallType(appContext, callType)
        val resolvedCallerNumber = resolveCallerNumber(callerPhone, callerName)
        val sanitizedCallerName = ChatrVoipCallRegistry.resolveDisplayName(
            context = appContext,
            callId = callId,
            callerId = callerId,
            proposedName = callerName,
            callerPhone = resolvedCallerNumber.ifBlank { callerPhone },
        )
        val resolvedCallerAvatar = ChatrVoipCallRegistry.resolveAvatar(
            context = appContext,
            callId = callId,
            callerId = callerId,
            proposedAvatar = callerAvatar,
            callerPhone = resolvedCallerNumber.ifBlank { callerPhone },
            proposedName = callerName,
        )
        val callerAddress = resolvedCallerNumber
            .takeIf { it.isNotBlank() }
            ?.let { Uri.fromParts(PhoneAccount.SCHEME_TEL, it, null) }

        Log.i(TAG, "Showing incoming call for $callId from $sanitizedCallerName via $source")

        ChatrVoipCallRegistry.markIncoming(
            context = appContext,
            callId = callId,
            callerId = callerId,
            callerName = sanitizedCallerName,
            callerAvatar = resolvedCallerAvatar,
            callerPhone = resolvedCallerNumber,
            callType = sanitizedCallType,
            conversationId = conversationId,
        )

        NativeCallBootstrapService.start(
            context = appContext,
            callId = callId,
            callerId = callerId,
            callerName = sanitizedCallerName,
            callerPhone = resolvedCallerNumber,
            callType = sanitizedCallType,
            conversationId = conversationId,
            callerAvatar = resolvedCallerAvatar,
        )
        CallProcessWarmupService.start(
            context = appContext,
            reason = "incoming_notification",
            keepAliveMs = 20_000L,
            wakeLockMs = 20_000L,
            callId = callId,
            callerId = callerId,
            callType = sanitizedCallType,
            conversationId = conversationId,
        )

        try {
            ChatrSystemContactSync.ensureContact(appContext, resolvedCallerNumber, sanitizedCallerName, callerId)
            ChatrSystemContactSync.syncAsync(appContext, resolvedCallerNumber, sanitizedCallerName, callerAvatar, callerId)
        } catch (error: Exception) {
            Log.e(TAG, "Contact sync failed for incoming call $callId", error)
        }

        wakeDevice(appContext)

        var telecomRegistered = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val telecomManager = appContext.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                val app = appContext as? ChatrApplication

                if (telecomManager != null && app != null) {
                    val extras = Bundle().apply {
                        putString("call_id", callId)
                        putString("caller_id", callerId)
                        putString("caller_name", sanitizedCallerName)
                        putString("caller_avatar", resolvedCallerAvatar)
                        putString("caller_phone", resolvedCallerNumber)
                        putString("caller_number", resolvedCallerNumber)
                        putString("call_type", sanitizedCallType)
                        putString("conversation_id", conversationId)
                        if (callerAddress != null) {
                            putParcelable(TelecomManager.EXTRA_INCOMING_CALL_ADDRESS, callerAddress)
                        }
                    }

                    if (ChatrVoipCallRegistry.registerIncomingTelecom(
                            appContext,
                            callId,
                            DUPLICATE_TELECOM_REGISTRATION_WINDOW_MS,
                        )
                    ) {
                        telecomManager.addNewIncomingCall(app.phoneAccountHandle, extras)
                        telecomRegistered = true
                        CallLatencyMetrics.markTelecomRegistered(appContext, callId)
                        Log.i(TAG, "Registered incoming call with TelecomManager for $callId")
                    } else {
                        Log.i(TAG, "Skipping duplicate Telecom incoming call registration for $callId")
                    }
                }
            } catch (error: Exception) {
                Log.e(TAG, "Failed to register TelecomManager incoming call for $callId", error)
            }
        }

        val callIntent = Intent(appContext, NativeIncomingCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("call_id", callId)
            putExtra("caller_id", callerId)
            putExtra("caller_name", sanitizedCallerName)
            putExtra("caller_avatar", resolvedCallerAvatar)
            putExtra("caller_phone", resolvedCallerNumber)
            putExtra("caller_number", resolvedCallerNumber)
            putExtra("call_type", sanitizedCallType)
            putExtra("conversation_id", conversationId)
        }

        val requestCodeBase = stableRequestCode(callId)
        val fullScreenPendingIntent = PendingIntent.getActivity(
            appContext,
            requestCodeBase,
            callIntent,
            immutablePendingIntentFlags(),
        )

        if (telecomRegistered) {
            Log.i(TAG, "Telecom registered for $callId; arming Chatr fullscreen fallback as well")
        }

        showCallNotification(
            context = appContext,
            callId = callId,
            callerId = callerId,
            callerName = sanitizedCallerName,
            callerAvatar = resolvedCallerAvatar,
            callerPhone = resolvedCallerNumber,
            callType = sanitizedCallType,
            conversationId = conversationId,
            fullScreenIntent = fullScreenPendingIntent,
        )
        launchIncomingCallUi(appContext, fullScreenPendingIntent, callIntent)
    }

    fun triggerIncomingCallFallback(
        context: Context,
        callId: String,
        callerId: String,
        callerName: String,
        callerAvatar: String?,
        callerPhone: String,
        callType: String,
        conversationId: String,
    ) {
        val appContext = context.applicationContext
        
        if (!registerIncomingCallAlert(appContext, callId)) {
            Log.i(TAG, "Skipping duplicate incoming call fallback for $callId")
            return
        }

        val sanitizedCallType = NativeCallMode.sanitizeCallType(appContext, callType)
        val resolvedCallerNumber = resolveCallerNumber(callerPhone, callerName)
        val sanitizedCallerName = ChatrVoipCallRegistry.resolveDisplayName(
            context = appContext,
            callId = callId,
            callerId = callerId,
            proposedName = callerName,
            callerPhone = resolvedCallerNumber.ifBlank { callerPhone },
        )
        val resolvedCallerAvatar = ChatrVoipCallRegistry.resolveAvatar(
            context = appContext,
            callId = callId,
            callerId = callerId,
            proposedAvatar = callerAvatar,
            callerPhone = resolvedCallerNumber.ifBlank { callerPhone },
            proposedName = callerName,
        )

        Log.i(TAG, "Executing high-reliability fallback incoming call UI & notification for $callId")

        ChatrVoipCallRegistry.markIncoming(
            context = appContext,
            callId = callId,
            callerId = callerId,
            callerName = sanitizedCallerName,
            callerAvatar = resolvedCallerAvatar,
            callerPhone = resolvedCallerNumber,
            callType = sanitizedCallType,
            conversationId = conversationId,
        )

        val callIntent = Intent(appContext, NativeIncomingCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("call_id", callId)
            putExtra("caller_id", callerId)
            putExtra("caller_name", sanitizedCallerName)
            putExtra("caller_avatar", resolvedCallerAvatar)
            putExtra("caller_phone", resolvedCallerNumber)
            putExtra("caller_number", resolvedCallerNumber)
            putExtra("call_type", sanitizedCallType)
            putExtra("conversation_id", conversationId)
        }

        val requestCodeBase = stableRequestCode(callId)
        val fullScreenPendingIntent = PendingIntent.getActivity(
            appContext,
            requestCodeBase,
            callIntent,
            immutablePendingIntentFlags(),
        )

        showCallNotification(
            context = appContext,
            callId = callId,
            callerId = callerId,
            callerName = sanitizedCallerName,
            callerAvatar = resolvedCallerAvatar,
            callerPhone = resolvedCallerNumber,
            callType = sanitizedCallType,
            conversationId = conversationId,
            fullScreenIntent = fullScreenPendingIntent,
        )
        launchIncomingCallUi(appContext, fullScreenPendingIntent, callIntent)
    }

    fun showMessageNotification(
        context: Context,
        senderId: String,
        senderName: String,
        messageText: String,
        conversationId: String,
    ) {
        val appContext = context.applicationContext
        val notificationManager = appContext.getSystemService(NotificationManager::class.java) ?: return
        val notificationSeed = conversationId.ifBlank { senderId.ifBlank { messageText } }

        val openIntent = Intent(appContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (conversationId.isNotBlank()) {
                putExtra("navigate_to", "/chat/$conversationId")
                putExtra("conversation_id", conversationId)
            }
        }
        val openPendingIntent = PendingIntent.getActivity(
            appContext,
            stableRequestCode(notificationSeed),
            openIntent,
            immutablePendingIntentFlags(),
        )

        val remoteInput = RemoteInput.Builder(ChatrFirebaseMessagingService.KEY_TEXT_REPLY)
            .setLabel("Reply...")
            .build()

        val replyIntent = Intent(appContext, NotificationActionReceiver::class.java).apply {
            action = "ACTION_REPLY_MESSAGE"
            putExtra("conversation_id", conversationId)
            putExtra("sender_id", senderId)
        }
        val replyPendingIntent = PendingIntent.getBroadcast(
            appContext,
            stableRequestCode(notificationSeed) + 1,
            replyIntent,
            mutablePendingIntentFlags(),
        )

        val markReadIntent = Intent(appContext, NotificationActionReceiver::class.java).apply {
            action = "ACTION_MARK_READ"
            putExtra("conversation_id", conversationId)
        }
        val markReadPendingIntent = PendingIntent.getBroadcast(
            appContext,
            stableRequestCode(notificationSeed) + 2,
            markReadIntent,
            immutablePendingIntentFlags(),
        )

        val person = Person.Builder()
            .setName(senderName.ifBlank { "Someone" })
            .setKey(senderId.ifBlank { notificationSeed })
            .setIcon(NotificationBranding.personIcon(appContext))
            .build()
        val messageChannelId = NotificationToneManager.messageChannelId(appContext)

        val notification = NotificationCompat.Builder(appContext, messageChannelId)
            .setSmallIcon(NotificationBranding.SMALL_ICON)
            .setLargeIcon(NotificationBranding.largeIcon(appContext))
            .setContentTitle(senderName.ifBlank { "Someone" })
            .setContentText(messageText.ifBlank { "New message" })
            .setStyle(
                NotificationCompat.MessagingStyle(person)
                    .setConversationTitle(senderName.ifBlank { "Someone" })
                    .addMessage(
                        messageText.ifBlank { "New message" },
                        System.currentTimeMillis(),
                        person,
                    ),
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setContentIntent(openPendingIntent)
            .addAction(
                NotificationCompat.Action.Builder(
                    R.drawable.ic_reply,
                    "Reply",
                    replyPendingIntent,
                ).addRemoteInput(remoteInput)
                    .setAllowGeneratedReplies(true)
                    .build(),
            )
            .addAction(R.drawable.ic_done, "Mark Read", markReadPendingIntent)
            .setGroup("messages")
            .build()

        notificationManager.notify(messageNotificationId(notificationSeed), notification)
    }

    fun cancelIncomingCallNotification(context: Context, callId: String?) {
        if (callId.isNullOrBlank()) return
        val notificationManager = context.applicationContext.getSystemService(NotificationManager::class.java)
        notificationManager?.cancel(callNotificationId(callId))
        recentIncomingCallAlerts.remove(callId)
    }

    fun cancelMessageNotification(context: Context, notificationSeed: String?) {
        if (notificationSeed.isNullOrBlank()) return
        val notificationManager = context.applicationContext.getSystemService(NotificationManager::class.java)
        notificationManager?.cancel(messageNotificationId(notificationSeed))
    }

    fun messageNotificationIdForSeed(notificationSeed: String): Int {
        return messageNotificationId(notificationSeed)
    }

    private fun showCallNotification(
        context: Context,
        callId: String,
        callerId: String,
        callerName: String,
        callerAvatar: String?,
        callerPhone: String,
        callType: String,
        conversationId: String,
        fullScreenIntent: PendingIntent,
    ) {
        val notificationManager = context.getSystemService(NotificationManager::class.java) ?: return
        val requestCodeBase = stableRequestCode(callId)

        val answerIntent = Intent(context, NotificationActionReceiver::class.java).apply {
            action = "ACTION_ANSWER_CALL"
            putExtra("call_id", callId)
            putExtra("caller_id", callerId)
            putExtra("caller_name", callerName)
            putExtra("caller_avatar", callerAvatar)
            putExtra("caller_phone", callerPhone)
            putExtra("caller_number", callerPhone)
            putExtra("call_type", callType)
            putExtra("conversation_id", conversationId)
        }
        val answerPendingIntent = PendingIntent.getBroadcast(
            context,
            requestCodeBase + 1,
            answerIntent,
            immutablePendingIntentFlags(),
        )

        val rejectIntent = Intent(context, NotificationActionReceiver::class.java).apply {
            action = "ACTION_REJECT_CALL"
            putExtra("call_id", callId)
            putExtra("caller_id", callerId)
            putExtra("caller_name", callerName)
            putExtra("caller_avatar", callerAvatar)
            putExtra("caller_phone", callerPhone)
            putExtra("caller_number", callerPhone)
            putExtra("call_type", callType)
            putExtra("conversation_id", conversationId)
        }
        val rejectPendingIntent = PendingIntent.getBroadcast(
            context,
            requestCodeBase + 2,
            rejectIntent,
            immutablePendingIntentFlags(),
        )

        val caller = Person.Builder()
            .setName(callerName)
            .setIcon(NotificationBranding.personIcon(context))
            .build()
        val title = if (NativeCallMode.mediaEngineEnabled(context)) {
            "Incoming ${if (callType == "video") "Video" else "Voice"} Call"
        } else {
            "Incoming Call"
        }

        val notification = NotificationCompat.Builder(context, ChatrApplication.CHANNEL_CALLS_HIGH)
            .setSmallIcon(NotificationBranding.SMALL_ICON)
            .setLargeIcon(NotificationBranding.largeIcon(context))
            .setContentTitle(title)
            .setContentText(callerName)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(fullScreenIntent)
            .setFullScreenIntent(fullScreenIntent, true)
            .setStyle(NotificationCompat.CallStyle.forIncomingCall(caller, rejectPendingIntent, answerPendingIntent))
            .setTimeoutAfter(60_000)
            .build()

        notificationManager.notify(callNotificationId(callId), notification)
    }

    private fun launchIncomingCallUi(
        context: Context,
        fullScreenPendingIntent: PendingIntent,
        callIntent: Intent,
    ) {
        var fullScreenRequested = false
        try {
            fullScreenPendingIntent.send()
            fullScreenRequested = true
            Log.i(TAG, "Requested IncomingCallActivity via fullscreen PendingIntent")
        } catch (error: PendingIntent.CanceledException) {
            Log.w(TAG, "Fullscreen PendingIntent was cancelled, trying direct launch", error)
        } catch (error: Exception) {
            Log.w(TAG, "Fullscreen PendingIntent launch failed, trying direct launch", error)
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            try {
                context.startActivity(callIntent)
                Log.i(
                    TAG,
                    if (fullScreenRequested) {
                        "Launched IncomingCallActivity directly after fullscreen request"
                    } else {
                        "Launched IncomingCallActivity directly"
                    },
                )
            } catch (error: Exception) {
                if (fullScreenRequested) {
                    Log.w(TAG, "Direct IncomingCallActivity launch blocked; waiting for fullscreen intent", error)
                } else {
                    Log.e(TAG, "Failed to launch IncomingCallActivity directly", error)
                }
            }
        } else {
            Log.i(TAG, "Skipping direct startActivity on Android 10+; relying on fullScreenIntent")
        }
    }

    private fun wakeDevice(context: Context) {
        try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
            val wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or
                    PowerManager.ACQUIRE_CAUSES_WAKEUP or
                    PowerManager.ON_AFTER_RELEASE,
                "chatr:incoming_call",
            )
            wakeLock.acquire(30_000)
        } catch (error: Exception) {
            Log.e(TAG, "Failed to wake device", error)
        }
    }

    private fun registerIncomingCallAlert(context: Context, callId: String): Boolean {
        val now = System.currentTimeMillis()
        val lastAlertAt = recentIncomingCallAlerts[callId]
        if (lastAlertAt != null && now - lastAlertAt < DUPLICATE_CALL_ALERT_WINDOW_MS) {
            return false
        }
        if (!ChatrVoipCallRegistry.registerIncomingAlert(context, callId, DUPLICATE_CALL_ALERT_WINDOW_MS)) {
            return false
        }
        recentIncomingCallAlerts[callId] = now
        return true
    }

    private fun resolveCallerNumber(primary: String?, fallback: String?): String {
        val candidates = listOf(primary, fallback)
        for (candidate in candidates) {
            val sanitized = candidate
                ?.trim()
                ?.replace(Regex("[^+\\d]"), "")
                .orEmpty()
            if (sanitized.any { it.isDigit() }) {
                return sanitized
            }
        }
        return ""
    }

    fun stableRequestCode(value: String): Int {
        if (value.isBlank()) {
            return (System.currentTimeMillis() and 0x7fffffffL).toInt()
        }
        return value.hashCode() and 0x7fffffff
    }

    private fun callNotificationId(callId: String): Int {
        return CALL_NOTIFICATION_BASE + (stableRequestCode(callId) % 900_000)
    }

    private fun messageNotificationId(seed: String): Int {
        return MESSAGE_NOTIFICATION_BASE + (stableRequestCode(seed) % 900_000)
    }

    private fun immutablePendingIntentFlags(): Int {
        return PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    }

    private fun mutablePendingIntentFlags(): Int {
        return PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
    }
}
