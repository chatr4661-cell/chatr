package com.chatr.app.services.sms

import android.content.Context
import android.os.Build
import android.telephony.SmsManager
import android.telephony.TelephonyManager
import android.util.Log
import com.chatr.app.data.api.SupabaseApi
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * SMS Gateway Service with RCS Detection
 * 
 * CRITICAL FOR GSM REPLACEMENT:
 * - Sends SMS to non-CHATR users
 * - Detects RCS capability for rich messaging
 * - Provides CHATR invite links
 * - Falls back to SMS when data unavailable
 */
@Singleton
class SMSGatewayService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val supabaseApi: SupabaseApi
) {
    companion object {
        private const val TAG = "SMSGateway"
        private const val MAX_SMS_LENGTH = 160
        private const val MAX_MULTIPART_SEGMENTS = 3
        private const val CHATR_INVITE_LINK = "https://chatr.chat/invite"
    }
    
    private val smsManager: SmsManager by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }
    }
    
    private val telephonyManager: TelephonyManager by lazy {
        context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    }
    
    /**
     * Check if recipient supports RCS
     */
    suspend fun checkRcsCapability(phoneNumber: String): RcsCapability = withContext(Dispatchers.IO) {
        Log.d(TAG, "Checking RCS capability for: $phoneNumber")
        
        // In production, this would query Google Jibe or carrier RCS APIs
        // Mock implementation based on heuristics
        val normalized = normalizePhoneNumber(phoneNumber)
        
        // Mock: Assume Android users on major carriers support RCS
        val hasRcsSupport = isLikelyRcsEnabled(normalized)
        
        RcsCapability(
            phoneNumber = normalized,
            supportsRcs = hasRcsSupport,
            supportsRichCards = hasRcsSupport,
            supportsTypingIndicators = hasRcsSupport,
            supportsReadReceipts = hasRcsSupport,
            supportsHighResMedia = hasRcsSupport,
            carrierName = getCarrierName(),
            detectedAt = System.currentTimeMillis()
        )
    }
    
    /**
     * Send SMS message (fallback when CHATR not available)
     */
    suspend fun sendSms(
        recipient: String,
        message: String,
        includeInvite: Boolean = true
    ): SmsResult = withContext(Dispatchers.IO) {
        Log.d(TAG, "Sending SMS to: $recipient")
        
        val normalized = normalizePhoneNumber(recipient)
        val finalMessage = if (includeInvite) {
            "$message\n\n💬 Reply faster on CHATR: $CHATR_INVITE_LINK"
        } else {
            message
        }
        
        try {
            // Check RCS first
            val rcsCapability = checkRcsCapability(normalized)
            
            if (rcsCapability.supportsRcs) {
                // Would use RCS API in production
                Log.d(TAG, "Recipient supports RCS, sending rich message")
                sendRcsMessage(normalized, finalMessage)
            } else {
                // Fall back to SMS
                sendSmsMessage(normalized, finalMessage)
            }
        } catch (e: Exception) {
            Log.e(TAG, "SMS send failed", e)
            SmsResult(
                success = false,
                messageId = null,
                error = e.message,
                deliveryStatus = DeliveryStatus.FAILED
            )
        }
    }
    
    /**
     * Send CHATR invite via SMS
     */
    suspend fun sendChatrInvite(
        recipient: String,
        senderName: String
    ): SmsResult = withContext(Dispatchers.IO) {
        val message = "$senderName invited you to chat on CHATR - the private messaging app with crystal-clear calls.\n\nDownload free: $CHATR_INVITE_LINK"
        
        sendSms(recipient, message, includeInvite = false)
    }
    
    /**
     * Send RCS rich card (mock implementation)
     */
    private suspend fun sendRcsMessage(
        recipient: String,
        message: String
    ): SmsResult {
        // In production, this would use Google Jibe RCS API
        Log.d(TAG, "RCS message to $recipient: $message")
        
        // Mock: Fall back to SMS for now
        return sendSmsMessage(recipient, message)
    }
    
    /**
     * Send SMS via system SMS manager
     */
    private fun sendSmsMessage(
        recipient: String,
        message: String
    ): SmsResult {
        return try {
            if (message.length <= MAX_SMS_LENGTH) {
                smsManager.sendTextMessage(
                    recipient,
                    null,
                    message,
                    null,
                    null
                )
            } else {
                // Multipart message
                val parts = smsManager.divideMessage(message)
                if (parts.size > MAX_MULTIPART_SEGMENTS) {
                    Log.w(TAG, "Message too long, truncating to $MAX_MULTIPART_SEGMENTS segments")
                }
                smsManager.sendMultipartTextMessage(
                    recipient,
                    null,
                    ArrayList(parts.take(MAX_MULTIPART_SEGMENTS)),
                    null,
                    null
                )
            }
            
            SmsResult(
                success = true,
                messageId = "SMS-${System.currentTimeMillis()}",
                error = null,
                deliveryStatus = DeliveryStatus.SENT
            )
        } catch (e: Exception) {
            Log.e(TAG, "SMS send failed", e)
            SmsResult(
                success = false,
                messageId = null,
                error = e.message,
                deliveryStatus = DeliveryStatus.FAILED
            )
        }
    }
    
    private fun normalizePhoneNumber(phone: String): String {
        // Remove non-digit characters except leading +
        val hasPlus = phone.startsWith("+")
        val digits = phone.filter { it.isDigit() }
        return if (hasPlus) "+$digits" else digits
    }
    
    private fun isLikelyRcsEnabled(phoneNumber: String): Boolean {
        // Heuristic: Major carriers in US/India likely have RCS
        val countryCode = if (phoneNumber.startsWith("+1")) "US"
        else if (phoneNumber.startsWith("+91")) "IN"
        else "OTHER"
        
        // Mock: 60% of users on major carriers have RCS
        return countryCode in listOf("US", "IN") && phoneNumber.hashCode() % 10 < 6
    }
    
    private fun getCarrierName(): String {
        return try {
            telephonyManager.networkOperatorName ?: "Unknown"
        } catch (e: Exception) {
            "Unknown"
        }
    }
}

/**
 * RCS capability info
 */
data class RcsCapability(
    val phoneNumber: String,
    val supportsRcs: Boolean,
    val supportsRichCards: Boolean,
    val supportsTypingIndicators: Boolean,
    val supportsReadReceipts: Boolean,
    val supportsHighResMedia: Boolean,
    val carrierName: String?,
    val detectedAt: Long
)

/**
 * SMS send result
 */
data class SmsResult(
    val success: Boolean,
    val messageId: String?,
    val error: String?,
    val deliveryStatus: DeliveryStatus
)

/**
 * Delivery status
 */
enum class DeliveryStatus {
    PENDING,
    SENT,
    DELIVERED,
    READ,
    FAILED
}
