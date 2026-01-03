package com.chatr.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.chatr.app.call.TelecomHelper
import com.chatr.app.sync.NetworkRecoveryTrigger
import com.chatr.app.sync.SyncManager
import com.google.firebase.FirebaseApp
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

/**
 * Application class for Chatr+
 * 
 * Initializes:
 * - Hilt dependency injection
 * - Firebase services
 * - Notification channels
 * - WorkManager for background tasks with HiltWorkerFactory
 * - Telecom integration for native calling
 * - GSM-grade network recovery triggers
 */
@HiltAndroidApp
class ChatrApplication : Application(), Configuration.Provider {
    
    @Inject
    lateinit var workerFactory: HiltWorkerFactory
    
    @Inject
    lateinit var networkRecoveryTrigger: NetworkRecoveryTrigger
    
    companion object {
        // Notification channel IDs
        const val CHANNEL_MESSAGES = "chatr_messages"
        const val CHANNEL_CALLS = "chatr_calls"
        const val CHANNEL_MISSED_CALLS = "chatr_missed_calls"
        const val CHANNEL_LOCATION = "chatr_location"
        const val CHANNEL_REMINDERS = "chatr_reminders"
        
        // PhoneAccount ID for Telecom integration
        const val PHONE_ACCOUNT_ID = "chatr_plus_account"
    }
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Firebase
        FirebaseApp.initializeApp(this)
        
        // Create notification channels (Android 8.0+)
        createNotificationChannels()
        
        // Register PhoneAccount for native call integration (Android 8.0+)
        registerPhoneAccount()
        
        // GSM-REPLACEMENT: Start network recovery monitoring
        // This triggers immediate sync when network is restored (like SMS)
        networkRecoveryTrigger.startMonitoring()
        
        // Initialize background sync workers
        SyncManager.initializeAllSync(this)
    }
    
    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()
    
    /**
     * Registers ChatrPlus PhoneAccount with TelecomManager
     * This enables native call UI integration with proper branding
     */
    private fun registerPhoneAccount() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            TelecomHelper.registerPhoneAccount(this)
        }
    }
    
    /**
     * Creates notification channels for Android 8.0+ (API 26+)
     * 
     * Channels:
     * - chatr_messages: Message notifications
     * - chatr_calls: Incoming call notifications  
     * - chatr_location: Location sharing alerts
     * - chatr_reminders: Medicine/appointment reminders
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)
            
            // Messages channel
            val messagesChannel = NotificationChannel(
                "chatr_messages",
                "Messages",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "New message notifications"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250)
                setShowBadge(true)
            }
            
            // Calls channel
            val callsChannel = NotificationChannel(
                "chatr_calls",
                "Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Incoming call notifications"
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
            }
            
            // Location channel
            val locationChannel = NotificationChannel(
                "chatr_location",
                "Location",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Location sharing and geofence alerts"
                enableVibration(true)
            }
            
            // Reminders channel
            val remindersChannel = NotificationChannel(
                "chatr_reminders",
                "Reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Medicine and appointment reminders"
                enableVibration(true)
                setShowBadge(true)
            }
            
            // Register all channels
            notificationManager.createNotificationChannels(
                listOf(messagesChannel, callsChannel, locationChannel, remindersChannel)
            )
        }
    }
}
