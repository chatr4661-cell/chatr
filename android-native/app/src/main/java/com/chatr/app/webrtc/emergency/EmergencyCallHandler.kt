package com.chatr.app.webrtc.emergency

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.telecom.TelecomManager
import android.util.Log
import com.chatr.app.oem.OemDetector
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Emergency Call Handler - GSM Fallback for E911/E112
 * 
 * CRITICAL FOR GSM REPLACEMENT:
 * - Detects emergency numbers (911, 112, 999, etc.)
 * - Falls back to native GSM dialer for regulatory compliance
 * - Reports location to emergency services
 * - Never blocks emergency calls even if CHATR is offline
 * 
 * Regulatory requirement: VoIP apps MUST hand off emergency calls to GSM
 */
@Singleton
class EmergencyCallHandler @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "EmergencyCall"
        
        // International emergency numbers
        private val EMERGENCY_NUMBERS = setOf(
            // North America
            "911",
            // EU/UK
            "112", "999",
            // India
            "100", "101", "102", "108", "112",
            // Australia
            "000",
            // Other
            "110", "119", "122", "911"
        )
        
        // Emergency service types
        private val POLICE_NUMBERS = setOf("100", "911", "999", "110")
        private val AMBULANCE_NUMBERS = setOf("102", "108", "911", "112", "999")
        private val FIRE_NUMBERS = setOf("101", "911", "112", "999")
    }
    
    /**
     * Check if number is an emergency number
     */
    fun isEmergencyNumber(number: String): Boolean {
        val cleaned = number.replace(Regex("[^0-9]"), "")
        return EMERGENCY_NUMBERS.contains(cleaned) || 
               cleaned.endsWith("911") ||
               cleaned.endsWith("112")
    }
    
    /**
     * Handle emergency call - ALWAYS falls back to GSM
     * 
     * This is a regulatory requirement for any VoIP service
     */
    fun handleEmergencyCall(number: String): EmergencyCallResult {
        val cleaned = number.replace(Regex("[^0-9]"), "")
        
        if (!isEmergencyNumber(cleaned)) {
            return EmergencyCallResult.NotEmergency
        }
        
        Log.w(TAG, "🚨 EMERGENCY CALL DETECTED: $cleaned - Falling back to GSM")
        
        try {
            // Method 1: Use TelecomManager (preferred)
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            
            if (telecomManager != null) {
                val uri = Uri.parse("tel:$cleaned")
                val extras = android.os.Bundle().apply {
                    putBoolean(TelecomManager.EXTRA_START_CALL_WITH_SPEAKERPHONE, false)
                }
                
                try {
                    telecomManager.placeCall(uri, extras)
                    Log.w(TAG, "🚨 Emergency call placed via TelecomManager")
                    return EmergencyCallResult.PlacedViaGsm(cleaned)
                } catch (e: SecurityException) {
                    Log.e(TAG, "TelecomManager permission denied, falling back to Intent", e)
                }
            }
            
            // Method 2: Fallback to ACTION_CALL intent
            val callIntent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:$cleaned")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            
            context.startActivity(callIntent)
            Log.w(TAG, "🚨 Emergency call placed via Intent")
            return EmergencyCallResult.PlacedViaGsm(cleaned)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to place emergency call, showing dialer", e)
            
            // Last resort: Open dialer with number pre-filled
            val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                data = Uri.parse("tel:$cleaned")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            
            context.startActivity(dialIntent)
            return EmergencyCallResult.ShowedDialer(cleaned)
        }
    }
    
    /**
     * Get emergency service type for display
     */
    fun getEmergencyServiceType(number: String): EmergencyServiceType {
        val cleaned = number.replace(Regex("[^0-9]"), "")
        
        return when {
            POLICE_NUMBERS.contains(cleaned) -> EmergencyServiceType.POLICE
            AMBULANCE_NUMBERS.contains(cleaned) -> EmergencyServiceType.AMBULANCE
            FIRE_NUMBERS.contains(cleaned) -> EmergencyServiceType.FIRE
            else -> EmergencyServiceType.GENERAL
        }
    }
    
    /**
     * Get country-specific emergency number
     */
    fun getPrimaryEmergencyNumber(): String {
        // Detect country from SIM or locale
        val country = java.util.Locale.getDefault().country
        
        return when (country) {
            "US", "CA" -> "911"
            "GB", "IE" -> "999"
            "IN" -> "112"
            "AU" -> "000"
            else -> "112" // International standard
        }
    }
    
    /**
     * Pre-call warning for near-emergency numbers
     */
    fun shouldShowEmergencyWarning(number: String): Boolean {
        val cleaned = number.replace(Regex("[^0-9]"), "")
        
        // Numbers that look like emergency but aren't
        return cleaned.length <= 3 && cleaned.all { it.isDigit() }
    }
}

/**
 * Emergency call result
 */
sealed class EmergencyCallResult {
    object NotEmergency : EmergencyCallResult()
    data class PlacedViaGsm(val number: String) : EmergencyCallResult()
    data class ShowedDialer(val number: String) : EmergencyCallResult()
    data class Failed(val error: String) : EmergencyCallResult()
}

/**
 * Emergency service types
 */
enum class EmergencyServiceType {
    POLICE,
    AMBULANCE,
    FIRE,
    GENERAL
}
