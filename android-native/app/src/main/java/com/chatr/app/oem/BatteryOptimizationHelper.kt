package com.chatr.app.oem

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Battery Optimization Helper - Staged Permission Flow
 * 
 * CRITICAL: Avoid "nag fatigue" by staging exemption requests
 * - First failure → subtle hint
 * - Second failure → show OEM flow
 * - Third failure → hard block with explanation
 */
class BatteryOptimizationHelper(private val context: Context) {
    
    companion object {
        private const val TAG = "BatteryOptHelper"
        private const val PREFS_NAME = "chatr_oem_prefs"
        private const val KEY_FAILURE_COUNT = "call_failure_count"
        private const val KEY_LAST_FAILURE_TIME = "last_failure_time"
        private const val KEY_EXEMPTIONS_GRANTED = "exemptions_granted"
        private const val KEY_ONBOARDING_COMPLETE = "onboarding_complete"
        
        // Thresholds for staged flow
        private const val HINT_THRESHOLD = 1
        private const val OEM_FLOW_THRESHOLD = 2
        private const val HARD_BLOCK_THRESHOLD = 3
    }
    
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    private val _permissionState = MutableStateFlow<PermissionFlowState>(PermissionFlowState.IDLE)
    val permissionState: StateFlow<PermissionFlowState> = _permissionState
    
    /**
     * Check if battery optimization is disabled for this app
     */
    fun isIgnoringBatteryOptimizations(): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return powerManager.isIgnoringBatteryOptimizations(context.packageName)
    }
    
    /**
     * Get current failure count
     */
    fun getFailureCount(): Int {
        return prefs.getInt(KEY_FAILURE_COUNT, 0)
    }
    
    /**
     * Record a call failure (for staged permission flow)
     */
    fun recordCallFailure() {
        val currentCount = getFailureCount()
        prefs.edit()
            .putInt(KEY_FAILURE_COUNT, currentCount + 1)
            .putLong(KEY_LAST_FAILURE_TIME, System.currentTimeMillis())
            .apply()
        
        Log.d(TAG, "📊 Call failure recorded (total: ${currentCount + 1})")
        
        updateFlowState(currentCount + 1)
    }
    
    /**
     * Reset failure count (after successful call or user action)
     */
    fun resetFailureCount() {
        prefs.edit()
            .putInt(KEY_FAILURE_COUNT, 0)
            .apply()
        
        _permissionState.value = PermissionFlowState.IDLE
    }
    
    /**
     * Update the permission flow state based on failures
     */
    private fun updateFlowState(failureCount: Int) {
        _permissionState.value = when {
            failureCount >= HARD_BLOCK_THRESHOLD -> PermissionFlowState.HARD_BLOCK
            failureCount >= OEM_FLOW_THRESHOLD -> PermissionFlowState.SHOW_OEM_FLOW
            failureCount >= HINT_THRESHOLD -> PermissionFlowState.SHOW_HINT
            else -> PermissionFlowState.IDLE
        }
        
        Log.d(TAG, "📊 Permission flow state: ${_permissionState.value}")
    }
    
    /**
     * Get staged action based on current failure count
     * This implements the "don't nag" philosophy
     */
    fun getStagedAction(): StagedAction {
        val failureCount = getFailureCount()
        val exemptions = OemDetector.getRequiredExemptions()
        val oem = OemDetector.detect()
        
        return when {
            failureCount < HINT_THRESHOLD -> {
                // Not enough failures yet - do nothing
                StagedAction.None
            }
            
            failureCount < OEM_FLOW_THRESHOLD -> {
                // First failure - subtle hint
                StagedAction.ShowHint(
                    message = "Enable background access for better call reliability",
                    actionLabel = "Enable"
                )
            }
            
            failureCount < HARD_BLOCK_THRESHOLD -> {
                // Second failure - show OEM-specific flow
                val primaryExemption = exemptions.firstOrNull() ?: OemExemption.BATTERY_OPTIMIZATION
                val intent = OemDetector.getSettingsIntent(primaryExemption, context)
                
                StagedAction.ShowOemFlow(
                    title = getOemFlowTitle(oem),
                    message = getOemFlowMessage(oem),
                    intent = intent,
                    fallbackIntent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:${context.packageName}")
                    }
                )
            }
            
            else -> {
                // Third+ failure - hard block with clear explanation
                StagedAction.HardBlock(
                    title = "Background Access Required",
                    message = getHardBlockMessage(oem),
                    primaryAction = "Open Settings",
                    intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:${context.packageName}")
                    }
                )
            }
        }
    }
    
    /**
     * Get OEM-specific flow title
     */
    private fun getOemFlowTitle(oem: OemDetector.Oem): String {
        return when (oem) {
            OemDetector.Oem.XIAOMI -> "Enable Autostart"
            OemDetector.Oem.ONEPLUS -> "Disable Battery Optimization"
            OemDetector.Oem.OPPO, OemDetector.Oem.REALME -> "Enable Autostart"
            OemDetector.Oem.VIVO -> "Allow Background Running"
            OemDetector.Oem.SAMSUNG -> "Remove from Sleeping Apps"
            OemDetector.Oem.HUAWEI -> "Add to Protected Apps"
            else -> "Disable Battery Optimization"
        }
    }
    
    /**
     * Get OEM-specific flow message
     */
    private fun getOemFlowMessage(oem: OemDetector.Oem): String {
        return when (oem) {
            OemDetector.Oem.XIAOMI -> 
                "Allow CHATR to start automatically so you never miss incoming calls."
            OemDetector.Oem.ONEPLUS -> 
                "Disable battery optimization so CHATR can receive calls in the background."
            OemDetector.Oem.OPPO, OemDetector.Oem.REALME -> 
                "Enable autostart and disable battery optimization for reliable calls."
            OemDetector.Oem.VIVO -> 
                "Allow CHATR to run in background for incoming calls."
            OemDetector.Oem.SAMSUNG -> 
                "Remove CHATR from sleeping apps so you don't miss calls."
            OemDetector.Oem.HUAWEI -> 
                "Add CHATR to protected apps for reliable call delivery."
            else -> 
                "Allow CHATR to run in the background for reliable calls."
        }
    }
    
    /**
     * Get hard block message (after multiple failures)
     */
    private fun getHardBlockMessage(oem: OemDetector.Oem): String {
        val baseMessage = "CHATR needs background access to ring when calls come in."
        
        val oemSpecific = when (oem) {
            OemDetector.Oem.XIAOMI -> 
                "On Xiaomi devices: Enable Autostart AND disable Battery Saver restrictions."
            OemDetector.Oem.ONEPLUS -> 
                "On OnePlus devices: Disable Battery Optimization and Deep Optimization."
            OemDetector.Oem.SAMSUNG -> 
                "On Samsung devices: Remove from Sleeping Apps and disable Adaptive Battery for CHATR."
            OemDetector.Oem.HUAWEI -> 
                "On Huawei devices: Add to Protected Apps and enable Autostart."
            else -> 
                "Go to App Settings and enable all background permissions."
        }
        
        return "$baseMessage\n\n$oemSpecific"
    }
    
    /**
     * Request battery optimization exemption via system dialog
     */
    fun requestBatteryOptimizationExemption(): Intent {
        return Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${context.packageName}")
        }
    }
    
    /**
     * Mark onboarding as complete
     */
    fun setOnboardingComplete() {
        prefs.edit().putBoolean(KEY_ONBOARDING_COMPLETE, true).apply()
    }
    
    /**
     * Check if onboarding is complete
     */
    fun isOnboardingComplete(): Boolean {
        return prefs.getBoolean(KEY_ONBOARDING_COMPLETE, false)
    }
    
    /**
     * Mark specific exemption as granted
     */
    fun markExemptionGranted(exemption: OemExemption) {
        val granted = prefs.getStringSet(KEY_EXEMPTIONS_GRANTED, mutableSetOf())?.toMutableSet() 
            ?: mutableSetOf()
        granted.add(exemption.name)
        prefs.edit().putStringSet(KEY_EXEMPTIONS_GRANTED, granted).apply()
    }
    
    /**
     * Check if exemption was marked as granted
     */
    fun isExemptionGranted(exemption: OemExemption): Boolean {
        val granted = prefs.getStringSet(KEY_EXEMPTIONS_GRANTED, emptySet()) ?: emptySet()
        return granted.contains(exemption.name)
    }
}

/**
 * Permission flow states
 */
enum class PermissionFlowState {
    IDLE,           // No action needed
    SHOW_HINT,      // First failure - subtle hint
    SHOW_OEM_FLOW,  // Second failure - OEM-specific flow
    HARD_BLOCK      // Third+ failure - hard block
}

/**
 * Staged actions for permission flow
 */
sealed class StagedAction {
    object None : StagedAction()
    
    data class ShowHint(
        val message: String,
        val actionLabel: String
    ) : StagedAction()
    
    data class ShowOemFlow(
        val title: String,
        val message: String,
        val intent: Intent?,
        val fallbackIntent: Intent
    ) : StagedAction()
    
    data class HardBlock(
        val title: String,
        val message: String,
        val primaryAction: String,
        val intent: Intent
    ) : StagedAction()
}
