package com.chatr.app.onboarding

import android.Manifest
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.chatr.app.call.TelecomHelper
import com.chatr.app.oem.BatteryOptimizationHelper
import com.chatr.app.oem.OemDetector
import kotlinx.coroutines.*

/**
 * First Run Experience Manager - The Magic Moment
 * 
 * Goal: User thinks "This is not an app — this is my phone working better"
 * 
 * Flow:
 * 1. Request essential permissions with clear explanations
 * 2. OEM-specific battery optimization (staged, not all at once)
 * 3. Register PhoneAccount
 * 4. Background the app
 * 5. Trigger REAL incoming call to user's phone
 * 6. Ring like GSM call on lock screen → WOW moment
 */
class FirstRunExperienceManager(private val context: Context) {
    
    companion object {
        private const val TAG = "FirstRunExp"
        private const val PREFS_NAME = "chatr_onboarding"
        private const val KEY_ONBOARDING_COMPLETE = "onboarding_complete"
        private const val KEY_DEMO_CALL_SHOWN = "demo_call_shown"
    }
    
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val batteryHelper = BatteryOptimizationHelper(context)
    
    /**
     * Check if onboarding is needed
     */
    fun isOnboardingNeeded(): Boolean {
        return !prefs.getBoolean(KEY_ONBOARDING_COMPLETE, false)
    }
    
    /**
     * Get required permissions for onboarding
     */
    fun getRequiredPermissions(): List<PermissionRequest> {
        val permissions = mutableListOf<PermissionRequest>()
        
        // Phone permission - for calls
        permissions.add(PermissionRequest(
            permission = Manifest.permission.READ_PHONE_STATE,
            title = "Phone",
            description = "To make and receive calls",
            isRequired = true
        ))
        
        // Contacts - for caller names
        permissions.add(PermissionRequest(
            permission = Manifest.permission.READ_CONTACTS,
            title = "Contacts",
            description = "To show caller names",
            isRequired = true
        ))
        
        // Notifications (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(PermissionRequest(
                permission = Manifest.permission.POST_NOTIFICATIONS,
                title = "Notifications",
                description = "To alert you of calls",
                isRequired = true
            ))
        }
        
        // Microphone - for calls
        permissions.add(PermissionRequest(
            permission = Manifest.permission.RECORD_AUDIO,
            title = "Microphone",
            description = "For voice during calls",
            isRequired = true
        ))
        
        // Camera - for video calls (optional)
        permissions.add(PermissionRequest(
            permission = Manifest.permission.CAMERA,
            title = "Camera",
            description = "For video calls",
            isRequired = false
        ))
        
        return permissions
    }
    
    /**
     * Get OEM-specific step (only primary exemption first)
     */
    fun getOemStep(): OnboardingStep? {
        val oem = OemDetector.detect()
        
        // Google Pixel and stock Android don't need special steps
        if (oem == OemDetector.Oem.GOOGLE || oem == OemDetector.Oem.OTHER) {
            return null
        }
        
        val exemptions = OemDetector.getRequiredExemptions()
        val primaryExemption = exemptions.firstOrNull() ?: return null
        
        val intent = OemDetector.getSettingsIntent(primaryExemption, context)
        if (intent == null || !OemDetector.isIntentResolvable(context, intent)) {
            return null
        }
        
        return OnboardingStep(
            title = getOemStepTitle(oem),
            description = getOemStepDescription(oem),
            buttonText = "Open Settings",
            intent = intent
        )
    }
    
    private fun getOemStepTitle(oem: OemDetector.Oem): String {
        return when (oem) {
            OemDetector.Oem.XIAOMI -> "Allow CHATR to run in background"
            OemDetector.Oem.SAMSUNG -> "Keep CHATR active"
            OemDetector.Oem.ONEPLUS -> "Disable battery optimization"
            else -> "Allow background access"
        }
    }
    
    private fun getOemStepDescription(oem: OemDetector.Oem): String {
        return when (oem) {
            OemDetector.Oem.XIAOMI -> "Enable Autostart so you never miss incoming calls"
            OemDetector.Oem.SAMSUNG -> "Remove from Sleeping Apps to receive calls"
            OemDetector.Oem.ONEPLUS -> "Allow CHATR to run for reliable calls"
            else -> "Enable background access for incoming calls"
        }
    }
    
    /**
     * Register PhoneAccount for system calling
     */
    fun registerPhoneAccount() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            TelecomHelper.registerPhoneAccount(context)
        }
    }
    
    /**
     * Complete onboarding
     */
    fun completeOnboarding() {
        prefs.edit().putBoolean(KEY_ONBOARDING_COMPLETE, true).apply()
        batteryHelper.setOnboardingComplete()
        Log.d(TAG, "✅ Onboarding complete")
    }
    
    /**
     * Check if demo call was shown
     */
    fun wasDemoCallShown(): Boolean {
        return prefs.getBoolean(KEY_DEMO_CALL_SHOWN, false)
    }
    
    /**
     * Mark demo call as shown
     */
    fun markDemoCallShown() {
        prefs.edit().putBoolean(KEY_DEMO_CALL_SHOWN, true).apply()
    }
}

data class PermissionRequest(
    val permission: String,
    val title: String,
    val description: String,
    val isRequired: Boolean
)

data class OnboardingStep(
    val title: String,
    val description: String,
    val buttonText: String,
    val intent: Intent
)
