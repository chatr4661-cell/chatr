package com.chatr.app.recovery

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject

/**
 * CHATR User Checker - Verifies if phone number is registered
 * 
 * Used by MissedCallWatcher to only show callback suggestions
 * for verified CHATR users (Play Store compliance)
 */
class CallbackSuggestionProvider(private val context: Context) : ChatrUserChecker {
    
    companion object {
        private const val TAG = "CallbackSuggestion"
        private const val SUPABASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co"
        private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw"
        
        // Cache duration for user lookups
        private const val CACHE_DURATION_MS = 60_000L * 60 // 1 hour
    }
    
    private val client = OkHttpClient()
    private val userCache = mutableMapOf<String, CachedResult>()
    
    /**
     * Check if phone number is a registered CHATR user
     */
    override suspend fun isRegisteredUser(phoneNumber: String): Boolean = withContext(Dispatchers.IO) {
        // Normalize phone number
        val normalized = normalizePhoneNumber(phoneNumber)
        
        // Check cache first
        val cached = userCache[normalized]
        if (cached != null && System.currentTimeMillis() - cached.timestamp < CACHE_DURATION_MS) {
            Log.d(TAG, "📋 Cache hit for $normalized: ${cached.isRegistered}")
            return@withContext cached.isRegistered
        }
        
        // Query backend
        try {
            val isRegistered = checkUserRegistration(normalized)
            
            // Cache result
            userCache[normalized] = CachedResult(isRegistered, System.currentTimeMillis())
            
            Log.d(TAG, "✅ Backend check for $normalized: $isRegistered")
            return@withContext isRegistered
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to check user registration", e)
            return@withContext false
        }
    }
    
    /**
     * Query backend to check if user is registered
     */
    private fun checkUserRegistration(phoneNumber: String): Boolean {
        try {
            val request = Request.Builder()
                .url("$SUPABASE_URL/rest/v1/profiles?phone=eq.$phoneNumber&select=id")
                .addHeader("apikey", SUPABASE_ANON_KEY)
                .addHeader("Authorization", "Bearer $SUPABASE_ANON_KEY")
                .get()
                .build()
            
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    Log.e(TAG, "❌ API error: ${response.code}")
                    return false
                }
                
                val body = response.body?.string() ?: "[]"
                
                // Parse JSON array - if not empty, user exists
                return body.trim() != "[]"
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Network error checking user", e)
            return false
        }
    }
    
    /**
     * Normalize phone number to E.164 format
     */
    private fun normalizePhoneNumber(number: String): String {
        // Remove all non-digit characters except +
        var normalized = number.replace(Regex("[^\\d+]"), "")
        
        // Ensure starts with +
        if (!normalized.startsWith("+")) {
            // Assume India if no country code
            if (normalized.length == 10) {
                normalized = "+91$normalized"
            } else if (normalized.startsWith("0")) {
                normalized = "+91${normalized.substring(1)}"
            } else {
                normalized = "+$normalized"
            }
        }
        
        return normalized
    }
    
    /**
     * Clear cache (for testing or logout)
     */
    fun clearCache() {
        userCache.clear()
    }
    
    /**
     * Pre-cache known contacts for faster lookups
     */
    suspend fun preCacheContacts(phoneNumbers: List<String>) = withContext(Dispatchers.IO) {
        // Batch check for efficiency
        try {
            val normalized = phoneNumbers.map { normalizePhoneNumber(it) }
            
            // Build query for multiple numbers
            val phoneList = normalized.joinToString(",") { "\"$it\"" }
            
            val request = Request.Builder()
                .url("$SUPABASE_URL/rest/v1/profiles?phone=in.($phoneList)&select=phone")
                .addHeader("apikey", SUPABASE_ANON_KEY)
                .addHeader("Authorization", "Bearer $SUPABASE_ANON_KEY")
                .get()
                .build()
            
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext
                
                val body = response.body?.string() ?: "[]"
                
                // Parse response and cache results
                val registeredPhones = parseRegisteredPhones(body)
                val now = System.currentTimeMillis()
                
                for (phone in normalized) {
                    val isRegistered = registeredPhones.contains(phone)
                    userCache[phone] = CachedResult(isRegistered, now)
                }
                
                Log.d(TAG, "✅ Pre-cached ${normalized.size} contacts, ${registeredPhones.size} registered")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to pre-cache contacts", e)
        }
    }
    
    /**
     * Parse registered phone numbers from API response
     */
    private fun parseRegisteredPhones(json: String): Set<String> {
        val phones = mutableSetOf<String>()
        try {
            val array = org.json.JSONArray(json)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val phone = obj.optString("phone")
                if (phone.isNotEmpty()) {
                    phones.add(phone)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to parse phones", e)
        }
        return phones
    }
}

/**
 * Cached user lookup result
 */
private data class CachedResult(
    val isRegistered: Boolean,
    val timestamp: Long
)
