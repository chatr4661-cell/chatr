package com.chatr.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ComponentName
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging

/**
 * CHATR+ Application Class
 * 
 * Initializes all critical services for GSM-like reliability:
 * - Firebase for push notifications
 * - Notification channels for calls/messages
 * - TelecomManager registration for system-level call handling
 */
class ChatrApplication : Application() {

    companion object {
        private const val TAG = "ChatrApplication"
        
        // Notification Channel IDs
        const val CHANNEL_CALLS = "calls"
        const val CHANNEL_CALLS_HIGH = "calls_high_v2"
        const val CHANNEL_MESSAGES = "messages"
        const val CHANNEL_URGENT = "urgent"
        const val CHANNEL_LOCATION = "location"
        const val CHANNEL_HEALTH = "health"
        const val CHANNEL_FOREGROUND = "foreground_service"
        
        // Phone Account ID for TelecomManager
        const val PHONE_ACCOUNT_ID = "chatr_calling"
        
        @Volatile
        private var instance: ChatrApplication? = null
        
        fun getInstance(): ChatrApplication = instance 
            ?: throw IllegalStateException("Application not initialized")
    }

    lateinit var phoneAccountHandle: PhoneAccountHandle
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        
        Log.i(TAG, "🚀 CHATR+ Application starting...")

        // Initialize Firebase
        initializeFirebase()
        
        // Create notification channels (MUST be done before any notification)
        createNotificationChannels()
        
        // Register with TelecomManager for GSM-like call handling
        registerPhoneAccount()
        
        // Get FCM token and log it
        logFcmToken()

        Log.i(TAG, "✅ CHATR+ Application initialized successfully")
    }

    private fun initializeFirebase() {
        try {
            FirebaseApp.initializeApp(this)
            Log.i(TAG, "✅ Firebase initialized")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Firebase initialization failed", e)
        }
    }

    private fun logFcmToken() {
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token ->
                Log.i(TAG, "📱 FCM Token: ${token.take(20)}...")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "❌ Failed to get FCM token", e)
            }
    }

    /**
     * Creates notification channels with proper importance levels
     * Critical for Android 8.0+ notification reliability
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val notificationManager = getSystemService(NotificationManager::class.java) ?: return

        // CALLS CHANNEL - Highest priority, fullscreen intent, bypass DND
        val callsChannel = NotificationChannel(
            CHANNEL_CALLS,
            "Incoming Calls",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Incoming voice and video calls"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
            setBypassDnd(true)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            setShowBadge(true)
            
            // Custom ringtone
            val ringtoneUri = Uri.parse("android.resource://${packageName}/raw/ringtone")
            setSound(ringtoneUri, AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build())
        }

        // CALLS HIGH CHANNEL - For fullscreen intents on Android 14+
        val callsHighChannel = NotificationChannel(
            CHANNEL_CALLS_HIGH,
            "Incoming Calls (High Priority)",
            NotificationManager.IMPORTANCE_MAX
        ).apply {
            description = "High priority incoming calls with fullscreen intent"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
            setBypassDnd(true)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC

            // Ensure this channel is treated as "interruptive" (required for heads-up/fullscreen)
            val ringtoneUri = Uri.parse("android.resource://${packageName}/raw/ringtone")
            setSound(
                ringtoneUri,
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
        }

        // MESSAGES CHANNEL
        val messagesChannel = NotificationChannel(
            CHANNEL_MESSAGES,
            "Messages",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Chat messages and replies"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 250, 100, 250)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
            setShowBadge(true)
        }

        // URGENT CHANNEL
        val urgentChannel = NotificationChannel(
            CHANNEL_URGENT,
            "Urgent Notifications",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Important alerts that need immediate attention"
            enableVibration(true)
            setBypassDnd(true)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        }

        // LOCATION CHANNEL
        val locationChannel = NotificationChannel(
            CHANNEL_LOCATION,
            "Location Updates",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Location sharing notifications"
        }

        // HEALTH CHANNEL
        val healthChannel = NotificationChannel(
            CHANNEL_HEALTH,
            "Health Reminders",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Medicine reminders and health alerts"
            enableVibration(true)
        }

        // FOREGROUND SERVICE CHANNEL
        val foregroundChannel = NotificationChannel(
            CHANNEL_FOREGROUND,
            "Background Services",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Ongoing background processes"
            setShowBadge(false)
        }

        // Register all channels
        listOf(
            callsChannel, callsHighChannel, messagesChannel, 
            urgentChannel, locationChannel, healthChannel, foregroundChannel
        ).forEach { channel ->
            notificationManager.createNotificationChannel(channel)
            Log.d(TAG, "📢 Created notification channel: ${channel.id}")
        }

        Log.i(TAG, "✅ All notification channels created")
    }

    /**
     * Registers Chatr+ with TelecomManager for GSM-like call handling
     * This allows system-level call management, Bluetooth integration, etc.
     */
    private fun registerPhoneAccount() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        try {
            val telecomManager = getSystemService(TelecomManager::class.java) ?: return
            
            phoneAccountHandle = PhoneAccountHandle(
                ComponentName(this, com.chatr.app.services.ChatrConnectionService::class.java),
                PHONE_ACCOUNT_ID
            )

            val phoneAccount = PhoneAccount.builder(phoneAccountHandle, "Chatr+ Calls")
                .setCapabilities(
                    PhoneAccount.CAPABILITY_SELF_MANAGED or
                    PhoneAccount.CAPABILITY_VIDEO_CALLING or
                    PhoneAccount.CAPABILITY_SUPPORTS_VIDEO_CALLING
                )
                .setShortDescription("Chatr+ Voice & Video Calls")
                .addSupportedUriScheme("chatr")
                .build()

            telecomManager.registerPhoneAccount(phoneAccount)
            
            Log.i(TAG, "✅ PhoneAccount registered with TelecomManager")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to register PhoneAccount", e)
        }
    }

    /**
     * Get the PhoneAccountHandle for making calls
     */
    fun getPhoneAccountHandle(): PhoneAccountHandle = phoneAccountHandle
}
