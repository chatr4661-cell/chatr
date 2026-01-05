package com.chatr.app.services.pstn

import android.content.Context
import android.util.Log
import com.chatr.app.data.api.SupabaseApi
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

/**
 * PSTN Outbound Calling Service
 * 
 * CRITICAL FOR GSM REPLACEMENT:
 * - Calls landlines and non-VoIP numbers
 * - Uses Twilio/Vonage for PSTN bridge
 * - Handles international dialing codes
 * - Manages call credits/billing
 */
@Singleton
class PSTNCallingService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val supabaseApi: SupabaseApi
) {
    companion object {
        private const val TAG = "PSTNCalling"
        private const val EDGE_FUNCTION_URL = "https://sbayuqgomlflmxgicplz.supabase.co/functions/v1/pstn-call"
        
        // PSTN rate per minute (USD)
        private val RATES = mapOf(
            "US" to 0.01,
            "CA" to 0.01,
            "UK" to 0.02,
            "IN" to 0.03,
            "AU" to 0.03,
            "DEFAULT" to 0.05
        )
    }
    
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
        .build()
    
    private val json = Json { ignoreUnknownKeys = true }
    
    /**
     * Check if number is PSTN (landline or mobile without CHATR)
     */
    fun isPstnNumber(phoneNumber: String): Boolean {
        val normalized = normalizePhoneNumber(phoneNumber)
        
        // Check if it's a CHATR user (would query backend in production)
        // For now, assume numbers not in contacts are PSTN
        return !phoneNumber.contains("@") && normalized.length >= 10
    }
    
    /**
     * Get estimated call rate
     */
    fun getCallRate(phoneNumber: String): PstnRate {
        val countryCode = detectCountryCode(phoneNumber)
        val ratePerMinute = RATES[countryCode] ?: RATES["DEFAULT"]!!
        
        return PstnRate(
            countryCode = countryCode,
            ratePerMinute = ratePerMinute,
            currency = "USD",
            connectionFee = 0.0,
            minimumDuration = 60
        )
    }
    
    /**
     * Check user's PSTN call balance
     */
    suspend fun getCallBalance(userId: String): PstnBalance = withContext(Dispatchers.IO) {
        // Would query backend for user's credit balance
        // Mock implementation returns demo balance
        PstnBalance(
            userId = userId,
            balance = 5.00,
            currency = "USD",
            minutesRemaining = 250, // Based on US rate
            lowBalanceWarning = false
        )
    }
    
    /**
     * Initiate PSTN call via edge function
     */
    suspend fun initiateCall(
        userId: String,
        accessToken: String,
        toNumber: String,
        fromNumber: String? = null
    ): PstnCallResult = withContext(Dispatchers.IO) {
        Log.d(TAG, "Initiating PSTN call to: $toNumber")
        
        val normalized = normalizePhoneNumber(toNumber)
        val rate = getCallRate(normalized)
        val balance = getCallBalance(userId)
        
        // Check balance
        if (balance.balance < rate.ratePerMinute) {
            return@withContext PstnCallResult(
                success = false,
                callId = null,
                error = "Insufficient balance. Please add credits.",
                estimatedCost = null
            )
        }
        
        try {
            val requestBody = PstnCallRequest(
                toNumber = normalized,
                fromNumber = fromNumber,
                userId = userId
            )
            
            val request = Request.Builder()
                .url(EDGE_FUNCTION_URL)
                .addHeader("Authorization", "Bearer $accessToken")
                .addHeader("Content-Type", "application/json")
                .post(json.encodeToString(PstnCallRequest.serializer(), requestBody)
                    .toRequestBody("application/json".toMediaType()))
                .build()
            
            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string()
            
            if (response.isSuccessful && responseBody != null) {
                val result = json.decodeFromString<PstnCallResponse>(responseBody)
                PstnCallResult(
                    success = true,
                    callId = result.callId,
                    error = null,
                    estimatedCost = rate.ratePerMinute * 5 // Estimate 5 min call
                )
            } else {
                PstnCallResult(
                    success = false,
                    callId = null,
                    error = "PSTN service unavailable: ${response.code}",
                    estimatedCost = null
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "PSTN call failed", e)
            PstnCallResult(
                success = false,
                callId = null,
                error = e.message ?: "Connection failed",
                estimatedCost = null
            )
        }
    }
    
    /**
     * End PSTN call
     */
    suspend fun endCall(callId: String): Boolean = withContext(Dispatchers.IO) {
        Log.d(TAG, "Ending PSTN call: $callId")
        // Would call edge function to terminate
        true
    }
    
    /**
     * Get PSTN call history
     */
    suspend fun getCallHistory(userId: String): List<PstnCallRecord> = withContext(Dispatchers.IO) {
        // Would query backend for call history
        emptyList()
    }
    
    private fun normalizePhoneNumber(phone: String): String {
        val hasPlus = phone.startsWith("+")
        val digits = phone.filter { it.isDigit() }
        return if (hasPlus) "+$digits" else "+1$digits" // Default to US
    }
    
    private fun detectCountryCode(phoneNumber: String): String {
        val normalized = normalizePhoneNumber(phoneNumber)
        return when {
            normalized.startsWith("+1") -> if (normalized.length == 12) "US" else "CA"
            normalized.startsWith("+44") -> "UK"
            normalized.startsWith("+91") -> "IN"
            normalized.startsWith("+61") -> "AU"
            else -> "DEFAULT"
        }
    }
}

@Serializable
data class PstnCallRequest(
    val toNumber: String,
    val fromNumber: String?,
    val userId: String
)

@Serializable
data class PstnCallResponse(
    val callId: String,
    val status: String
)

/**
 * PSTN call rate
 */
data class PstnRate(
    val countryCode: String,
    val ratePerMinute: Double,
    val currency: String,
    val connectionFee: Double,
    val minimumDuration: Int
)

/**
 * User's PSTN balance
 */
data class PstnBalance(
    val userId: String,
    val balance: Double,
    val currency: String,
    val minutesRemaining: Int,
    val lowBalanceWarning: Boolean
)

/**
 * PSTN call result
 */
data class PstnCallResult(
    val success: Boolean,
    val callId: String?,
    val error: String?,
    val estimatedCost: Double?
)

/**
 * PSTN call history record
 */
data class PstnCallRecord(
    val callId: String,
    val toNumber: String,
    val duration: Int,
    val cost: Double,
    val timestamp: Long,
    val status: String
)
