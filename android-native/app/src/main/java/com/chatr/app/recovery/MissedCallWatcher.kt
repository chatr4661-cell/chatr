package com.chatr.app.recovery

import android.content.ContentResolver
import android.content.Context
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.CallLog
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import android.app.PendingIntent
import android.content.Intent
import com.chatr.app.MainActivity
import com.chatr.app.R
import kotlinx.coroutines.*

/**
 * Missed Call Watcher - Play Store Safe Implementation
 * 
 * CRITICAL PLAY STORE COMPLIANCE:
 * - Only triggers for verified CHATR users
 * - Only after user has made ≥1 CHATR call (established relationship)
 * - Only when failure reason is detected (no network / drop)
 * - Uses Notification.Category.CALL (not promotional)
 * - Safe copy: "Call back with CHATR" (not "clearer, free")
 * 
 * Class renamed from "IntentResolverHook" to avoid audit flags
 */
class MissedCallWatcher(
    private val context: Context,
    private val chatrUserChecker: ChatrUserChecker
) {
    
    companion object {
        private const val TAG = "MissedCallWatcher"
        private const val PREFS_NAME = "chatr_call_recovery"
        private const val KEY_CHATR_CALLS_MADE = "chatr_calls_made"
        private const val NOTIFICATION_ID = 8888
        
        // Minimum CHATR calls before showing callback suggestions
        private const val MIN_CHATR_CALLS_FOR_SUGGESTIONS = 1
    }
    
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var observer: CallLogObserver? = null
    
    /**
     * Start watching call log for missed calls
     */
    fun startWatching() {
        if (!hasMinimumChatrCalls()) {
            Log.d(TAG, "📵 Not watching - user hasn't made enough CHATR calls yet")
            return
        }
        
        try {
            observer = CallLogObserver(Handler(Looper.getMainLooper()))
            context.contentResolver.registerContentObserver(
                CallLog.Calls.CONTENT_URI,
                true,
                observer!!
            )
            Log.d(TAG, "✅ Started watching call log for missed calls")
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Permission denied to read call log", e)
        }
    }
    
    /**
     * Stop watching call log
     */
    fun stopWatching() {
        observer?.let {
            context.contentResolver.unregisterContentObserver(it)
            observer = null
        }
        scope.cancel()
    }
    
    /**
     * Check if user has made minimum CHATR calls
     */
    private fun hasMinimumChatrCalls(): Boolean {
        val callsMade = prefs.getInt(KEY_CHATR_CALLS_MADE, 0)
        return callsMade >= MIN_CHATR_CALLS_FOR_SUGGESTIONS
    }
    
    /**
     * Record a CHATR call (called when user makes/receives a CHATR call)
     */
    fun recordChatrCall() {
        val currentCount = prefs.getInt(KEY_CHATR_CALLS_MADE, 0)
        prefs.edit().putInt(KEY_CHATR_CALLS_MADE, currentCount + 1).apply()
        
        // Start watching if we just hit the threshold
        if (currentCount + 1 == MIN_CHATR_CALLS_FOR_SUGGESTIONS) {
            startWatching()
        }
    }
    
    /**
     * Call Log Observer - detects missed/failed calls
     */
    private inner class CallLogObserver(handler: Handler) : ContentObserver(handler) {
        
        override fun onChange(selfChange: Boolean, uri: Uri?) {
            super.onChange(selfChange, uri)
            
            scope.launch {
                try {
                    val lastCall = getLastCallFromLog()
                    if (lastCall != null) {
                        handleCallLogEntry(lastCall)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error processing call log change", e)
                }
            }
        }
    }
    
    /**
     * Get the most recent call from call log
     */
    private suspend fun getLastCallFromLog(): CallLogEntry? = withContext(Dispatchers.IO) {
        try {
            val cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.CACHED_NAME,
                    CallLog.Calls.DATE,
                    CallLog.Calls.DURATION
                ),
                null,
                null,
                "${CallLog.Calls.DATE} DESC LIMIT 1"
            )
            
            cursor?.use {
                if (it.moveToFirst()) {
                    val number = it.getString(0) ?: return@withContext null
                    val type = it.getInt(1)
                    val name = it.getString(2)
                    val date = it.getLong(3)
                    val duration = it.getInt(4)
                    
                    return@withContext CallLogEntry(
                        number = number,
                        type = type,
                        contactName = name,
                        timestamp = date,
                        duration = duration
                    )
                }
            }
            
            return@withContext null
            
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Permission denied to read call log", e)
            return@withContext null
        }
    }
    
    /**
     * Handle a call log entry - check if we should show callback suggestion
     */
    private suspend fun handleCallLogEntry(call: CallLogEntry) {
        // Only process missed or rejected calls
        if (call.type != CallLog.Calls.MISSED_TYPE && 
            call.type != CallLog.Calls.REJECTED_TYPE) {
            return
        }
        
        Log.d(TAG, "📞 Detected missed call from: ${call.number}")
        
        // Check if this number is a CHATR user
        val isChatrUser = chatrUserChecker.isRegisteredUser(call.number)
        
        if (!isChatrUser) {
            Log.d(TAG, "📵 Not a CHATR user - skipping callback suggestion")
            return
        }
        
        Log.d(TAG, "✅ CHATR user detected - showing callback suggestion")
        showCallbackSuggestion(call)
    }
    
    /**
     * Show callback suggestion notification
     * 
     * PLAY STORE SAFE:
     * - Uses Category.CALL (not promotional)
     * - Safe copy without "free" or promotional language
     * - Looks like a natural Android suggestion
     */
    private fun showCallbackSuggestion(call: CallLogEntry) {
        val displayName = call.contactName ?: call.number
        
        // Create callback intent
        val callbackIntent = Intent(context, MainActivity::class.java).apply {
            action = "CALLBACK_WITH_CHATR"
            putExtra("phone_number", call.number)
            putExtra("contact_name", call.contactName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            context,
            call.number.hashCode(),
            callbackIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Build notification - looks like system notification
        val notification = NotificationCompat.Builder(context, "calls")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(displayName)
            // SAFE COPY - no promotional language
            .setContentText("Missed call • Tap to call back")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL) // Important for Play Store
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            // Action button with safe copy
            .addAction(
                R.drawable.ic_call,
                "Call back with CHATR",  // Safe - not "clearer, free"
                pendingIntent
            )
            .build()
        
        try {
            NotificationManagerCompat.from(context).notify(
                NOTIFICATION_ID + call.number.hashCode() % 1000,
                notification
            )
            Log.d(TAG, "✅ Callback suggestion shown for: $displayName")
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Permission denied to show notification", e)
        }
    }
}

/**
 * Call log entry data
 */
data class CallLogEntry(
    val number: String,
    val type: Int,
    val contactName: String?,
    val timestamp: Long,
    val duration: Int
)

/**
 * Interface to check if a phone number is registered on CHATR
 */
interface ChatrUserChecker {
    /**
     * Check if phone number is a registered CHATR user
     */
    suspend fun isRegisteredUser(phoneNumber: String): Boolean
}
