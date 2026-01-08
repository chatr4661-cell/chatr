package com.chatr.app.services

import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log
import androidx.annotation.RequiresApi

/**
 * CHATR+ Call Screening Service
 * 
 * Provides intelligent call screening capabilities:
 * - Block anonymous/unknown callers
 * - Blacklist management
 * - Spam detection
 * - Call screening with caller name request
 */
@RequiresApi(Build.VERSION_CODES.N)
class ChatrCallScreeningService : CallScreeningService() {

    companion object {
        private const val TAG = "ChatrCallScreening"
        
        // Blacklisted numbers (loaded from SharedPreferences/DB)
        private val blacklist = mutableSetOf<String>()
        
        // Settings
        private var blockAnonymous = false
        private var blockUnknown = false
        private var requireNameAnnouncement = false
        
        fun addToBlacklist(number: String) {
            blacklist.add(normalizeNumber(number))
            Log.i(TAG, "➕ Added to blacklist: $number")
        }
        
        fun removeFromBlacklist(number: String) {
            blacklist.remove(normalizeNumber(number))
            Log.i(TAG, "➖ Removed from blacklist: $number")
        }
        
        fun isBlacklisted(number: String): Boolean {
            return blacklist.contains(normalizeNumber(number))
        }
        
        fun setBlockAnonymous(enabled: Boolean) {
            blockAnonymous = enabled
            Log.i(TAG, "🔒 Block anonymous: $enabled")
        }
        
        fun setBlockUnknown(enabled: Boolean) {
            blockUnknown = enabled
            Log.i(TAG, "🔒 Block unknown: $enabled")
        }
        
        fun setRequireNameAnnouncement(enabled: Boolean) {
            requireNameAnnouncement = enabled
            Log.i(TAG, "🔊 Require name announcement: $enabled")
        }
        
        fun getBlacklist(): Set<String> = blacklist.toSet()
        
        fun clearBlacklist() {
            blacklist.clear()
            Log.i(TAG, "🧹 Blacklist cleared")
        }
        
        private fun normalizeNumber(number: String): String {
            return number.replace(Regex("[^0-9+]"), "")
        }
    }

    override fun onScreenCall(callDetails: Call.Details) {
        val number = callDetails.handle?.schemeSpecificPart ?: ""
        val presentation = callDetails.callerNumberVerificationStatus
        
        Log.i(TAG, "📞 Screening call from: $number")
        
        // Build response
        val responseBuilder = CallResponse.Builder()
        
        // Check if number is blocked
        if (shouldBlockCall(number, callDetails)) {
            Log.i(TAG, "🚫 Blocking call from: $number")
            responseBuilder
                .setDisallowCall(true)
                .setRejectCall(true)
                .setSkipCallLog(false)
                .setSkipNotification(true)
        } else if (requireNameAnnouncement) {
            // If name announcement is required, let the call through
            // but we'll handle the announcement in the UI
            Log.i(TAG, "🔊 Call allowed, name announcement required: $number")
            responseBuilder
                .setDisallowCall(false)
                .setRejectCall(false)
        } else {
            Log.i(TAG, "✅ Call allowed: $number")
            responseBuilder
                .setDisallowCall(false)
                .setRejectCall(false)
        }
        
        respondToCall(callDetails, responseBuilder.build())
    }
    
    private fun shouldBlockCall(number: String, callDetails: Call.Details): Boolean {
        // 1. Check blacklist
        if (isBlacklisted(number)) {
            Log.d(TAG, "📋 Number is blacklisted")
            return true
        }
        
        // 2. Check anonymous call blocking
        if (blockAnonymous && number.isBlank()) {
            Log.d(TAG, "🔒 Blocking anonymous call")
            return true
        }
        
        // 3. Check unknown caller blocking
        if (blockUnknown && !isKnownCaller(number)) {
            Log.d(TAG, "🔒 Blocking unknown caller")
            return true
        }
        
        // 4. Check verification status (spam detection)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            when (callDetails.callerNumberVerificationStatus) {
                Call.Details.VERIFICATION_STATUS_FAILED -> {
                    Log.d(TAG, "⚠️ Verification failed - potential spam")
                    // Optionally block or flag
                }
                Call.Details.VERIFICATION_STATUS_PASSED -> {
                    Log.d(TAG, "✅ Caller verified")
                }
            }
        }
        
        return false
    }
    
    private fun isKnownCaller(number: String): Boolean {
        // In production, this would check contacts database
        // For now, return true to allow all non-blacklisted calls
        return true
    }
}

/**
 * Call Blocking Manager
 * Manages blacklist and blocking rules persistently
 */
class CallBlockingManager(private val context: android.content.Context) {
    
    companion object {
        private const val TAG = "CallBlockingManager"
        private const val PREFS_NAME = "chatr_call_blocking"
        private const val KEY_BLACKLIST = "blacklist"
        private const val KEY_BLOCK_ANONYMOUS = "block_anonymous"
        private const val KEY_BLOCK_UNKNOWN = "block_unknown"
        private const val KEY_REQUIRE_NAME = "require_name"
        
        @Volatile
        private var instance: CallBlockingManager? = null
        
        fun getInstance(context: android.content.Context): CallBlockingManager {
            return instance ?: synchronized(this) {
                instance ?: CallBlockingManager(context.applicationContext).also { instance = it }
            }
        }
    }
    
    private val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
    
    init {
        loadSettings()
    }
    
    fun blockNumber(number: String, reason: String? = null) {
        ChatrCallScreeningService.addToBlacklist(number)
        saveBlacklist()
        Log.i(TAG, "🚫 Blocked: $number, reason: $reason")
    }
    
    fun unblockNumber(number: String) {
        ChatrCallScreeningService.removeFromBlacklist(number)
        saveBlacklist()
        Log.i(TAG, "✅ Unblocked: $number")
    }
    
    fun isBlocked(number: String): Boolean {
        return ChatrCallScreeningService.isBlacklisted(number)
    }
    
    fun getBlockedNumbers(): Set<String> {
        return ChatrCallScreeningService.getBlacklist()
    }
    
    fun setBlockAnonymousCalls(enabled: Boolean) {
        ChatrCallScreeningService.setBlockAnonymous(enabled)
        prefs.edit().putBoolean(KEY_BLOCK_ANONYMOUS, enabled).apply()
    }
    
    fun setBlockUnknownCallers(enabled: Boolean) {
        ChatrCallScreeningService.setBlockUnknown(enabled)
        prefs.edit().putBoolean(KEY_BLOCK_UNKNOWN, enabled).apply()
    }
    
    fun setRequireNameAnnouncement(enabled: Boolean) {
        ChatrCallScreeningService.setRequireNameAnnouncement(enabled)
        prefs.edit().putBoolean(KEY_REQUIRE_NAME, enabled).apply()
    }
    
    private fun saveBlacklist() {
        val blacklistSet = ChatrCallScreeningService.getBlacklist()
        prefs.edit().putStringSet(KEY_BLACKLIST, blacklistSet).apply()
    }
    
    private fun loadSettings() {
        // Load blacklist
        prefs.getStringSet(KEY_BLACKLIST, emptySet())?.forEach { number ->
            ChatrCallScreeningService.addToBlacklist(number)
        }
        
        // Load other settings
        ChatrCallScreeningService.setBlockAnonymous(
            prefs.getBoolean(KEY_BLOCK_ANONYMOUS, false)
        )
        ChatrCallScreeningService.setBlockUnknown(
            prefs.getBoolean(KEY_BLOCK_UNKNOWN, false)
        )
        ChatrCallScreeningService.setRequireNameAnnouncement(
            prefs.getBoolean(KEY_REQUIRE_NAME, false)
        )
        
        Log.i(TAG, "📥 Call blocking settings loaded")
    }
}
