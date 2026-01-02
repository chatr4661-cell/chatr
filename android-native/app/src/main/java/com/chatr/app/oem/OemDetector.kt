package com.chatr.app.oem

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

/**
 * OEM Detector - Identifies manufacturer-specific behaviors
 * 
 * Critical for Android calling apps to survive aggressive OEM battery optimizations
 * that would otherwise kill background services and block FCM wakeups
 */
object OemDetector {
    
    private const val TAG = "OemDetector"
    
    /**
     * Detected OEM type
     */
    enum class Oem {
        XIAOMI,
        ONEPLUS,
        OPPO,
        VIVO,
        SAMSUNG,
        HUAWEI,
        REALME,
        ASUS,
        GOOGLE,
        OTHER
    }
    
    /**
     * Detect the current OEM
     */
    fun detect(): Oem {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        
        return when {
            manufacturer.contains("xiaomi") || brand.contains("xiaomi") || 
            manufacturer.contains("redmi") || brand.contains("redmi") -> Oem.XIAOMI
            
            manufacturer.contains("oneplus") || brand.contains("oneplus") -> Oem.ONEPLUS
            
            manufacturer.contains("oppo") || brand.contains("oppo") -> Oem.OPPO
            
            manufacturer.contains("vivo") || brand.contains("vivo") -> Oem.VIVO
            
            manufacturer.contains("samsung") || brand.contains("samsung") -> Oem.SAMSUNG
            
            manufacturer.contains("huawei") || brand.contains("huawei") ||
            manufacturer.contains("honor") || brand.contains("honor") -> Oem.HUAWEI
            
            manufacturer.contains("realme") || brand.contains("realme") -> Oem.REALME
            
            manufacturer.contains("asus") || brand.contains("asus") -> Oem.ASUS
            
            manufacturer.contains("google") || brand.contains("google") -> Oem.GOOGLE
            
            else -> Oem.OTHER
        }
    }
    
    /**
     * Get required exemptions for current OEM
     */
    fun getRequiredExemptions(): List<OemExemption> {
        val oem = detect()
        Log.d(TAG, "📱 Detected OEM: $oem (${Build.MANUFACTURER} / ${Build.BRAND})")
        
        return when (oem) {
            Oem.XIAOMI -> listOf(
                OemExemption.BATTERY_SAVER,
                OemExemption.AUTOSTART,
                OemExemption.BACKGROUND_ACTIVITY
            )
            
            Oem.ONEPLUS -> listOf(
                OemExemption.BATTERY_OPTIMIZATION,
                OemExemption.DEEP_OPTIMIZATION
            )
            
            Oem.OPPO, Oem.REALME -> listOf(
                OemExemption.BATTERY_OPTIMIZATION,
                OemExemption.AUTOSTART,
                OemExemption.LOCK_RECENT_APPS
            )
            
            Oem.VIVO -> listOf(
                OemExemption.BATTERY_OPTIMIZATION,
                OemExemption.AUTOSTART,
                OemExemption.BACKGROUND_POWER_CONSUMPTION
            )
            
            Oem.SAMSUNG -> listOf(
                OemExemption.SLEEPING_APPS,
                OemExemption.BATTERY_OPTIMIZATION
            )
            
            Oem.HUAWEI -> listOf(
                OemExemption.BATTERY_OPTIMIZATION,
                OemExemption.AUTOSTART,
                OemExemption.PROTECTED_APPS
            )
            
            Oem.GOOGLE, Oem.ASUS -> listOf(
                OemExemption.BATTERY_OPTIMIZATION
            )
            
            Oem.OTHER -> listOf(
                OemExemption.BATTERY_OPTIMIZATION
            )
        }
    }
    
    /**
     * Get OEM-specific settings intent
     */
    fun getSettingsIntent(exemption: OemExemption, context: Context): Intent? {
        val oem = detect()
        val packageName = context.packageName
        
        return when (exemption) {
            OemExemption.AUTOSTART -> getAutoStartIntent(oem, packageName)
            OemExemption.BATTERY_OPTIMIZATION -> getBatteryOptimizationIntent(packageName)
            OemExemption.BATTERY_SAVER -> getBatterySaverIntent(oem, packageName)
            OemExemption.BACKGROUND_ACTIVITY -> getBackgroundActivityIntent(oem)
            OemExemption.DEEP_OPTIMIZATION -> getDeepOptimizationIntent(oem)
            OemExemption.SLEEPING_APPS -> getSleepingAppsIntent(oem, packageName)
            OemExemption.PROTECTED_APPS -> getProtectedAppsIntent(oem)
            OemExemption.LOCK_RECENT_APPS -> getLockRecentAppsIntent(oem, packageName)
            OemExemption.BACKGROUND_POWER_CONSUMPTION -> getBackgroundPowerIntent(oem)
        }
    }
    
    /**
     * Get AutoStart manager intent (Xiaomi, Oppo, Vivo, Huawei)
     */
    private fun getAutoStartIntent(oem: Oem, packageName: String): Intent? {
        val intents = when (oem) {
            Oem.XIAOMI -> listOf(
                Intent().setClassName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.autostart.AutoStartManagementActivity"
                ),
                Intent("miui.intent.action.OP_AUTO_START").addCategory(Intent.CATEGORY_DEFAULT)
            )
            
            Oem.OPPO, Oem.REALME -> listOf(
                Intent().setClassName(
                    "com.coloros.safecenter",
                    "com.coloros.safecenter.startupapp.StartupAppListActivity"
                ),
                Intent().setClassName(
                    "com.oppo.safe",
                    "com.oppo.safe.permission.startup.StartupAppListActivity"
                )
            )
            
            Oem.VIVO -> listOf(
                Intent().setClassName(
                    "com.iqoo.secure",
                    "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"
                ),
                Intent().setClassName(
                    "com.vivo.permissionmanager",
                    "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                )
            )
            
            Oem.HUAWEI -> listOf(
                Intent().setClassName(
                    "com.huawei.systemmanager",
                    "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                ),
                Intent().setClassName(
                    "com.huawei.systemmanager",
                    "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity"
                )
            )
            
            else -> emptyList()
        }
        
        return intents.firstOrNull()
    }
    
    /**
     * Get standard Android battery optimization intent
     */
    private fun getBatteryOptimizationIntent(packageName: String): Intent {
        return Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:$packageName")
        }
    }
    
    /**
     * Get Xiaomi battery saver intent
     */
    private fun getBatterySaverIntent(oem: Oem, packageName: String): Intent? {
        return if (oem == Oem.XIAOMI) {
            Intent("miui.intent.action.POWER_HIDE_MODE_APP_LIST").addCategory(Intent.CATEGORY_DEFAULT)
        } else {
            getBatteryOptimizationIntent(packageName)
        }
    }
    
    /**
     * Get background activity restriction intent
     */
    private fun getBackgroundActivityIntent(oem: Oem): Intent? {
        return when (oem) {
            Oem.XIAOMI -> Intent().setClassName(
                "com.miui.securitycenter",
                "com.miui.permcenter.permissions.PermissionsEditorActivity"
            )
            else -> null
        }
    }
    
    /**
     * Get OnePlus deep optimization intent
     */
    private fun getDeepOptimizationIntent(oem: Oem): Intent? {
        return if (oem == Oem.ONEPLUS) {
            Intent().setClassName(
                "com.oneplus.security",
                "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"
            )
        } else null
    }
    
    /**
     * Get Samsung sleeping apps intent
     */
    private fun getSleepingAppsIntent(oem: Oem, packageName: String): Intent? {
        return if (oem == Oem.SAMSUNG) {
            Intent().setClassName(
                "com.samsung.android.lool",
                "com.samsung.android.sm.battery.ui.BatteryActivity"
            )
        } else null
    }
    
    /**
     * Get Huawei protected apps intent
     */
    private fun getProtectedAppsIntent(oem: Oem): Intent? {
        return if (oem == Oem.HUAWEI) {
            Intent().setClassName(
                "com.huawei.systemmanager",
                "com.huawei.systemmanager.optimize.process.ProtectActivity"
            )
        } else null
    }
    
    /**
     * Get lock in recent apps intent
     */
    private fun getLockRecentAppsIntent(oem: Oem, packageName: String): Intent? {
        // This is usually handled via instructions, not a direct intent
        return null
    }
    
    /**
     * Get Vivo background power consumption intent
     */
    private fun getBackgroundPowerIntent(oem: Oem): Intent? {
        return if (oem == Oem.VIVO) {
            Intent().setClassName(
                "com.iqoo.powermanager",
                "com.iqoo.powermanager.PowerManagerActivity"
            )
        } else null
    }
    
    /**
     * Check if an intent is resolvable
     */
    fun isIntentResolvable(context: Context, intent: Intent): Boolean {
        return context.packageManager.queryIntentActivities(
            intent, PackageManager.MATCH_DEFAULT_ONLY
        ).isNotEmpty()
    }
}

/**
 * Types of OEM-specific exemptions needed for reliable background operation
 */
enum class OemExemption {
    AUTOSTART,                      // Allow app to start on boot
    BATTERY_OPTIMIZATION,           // Standard Android battery optimization
    BATTERY_SAVER,                  // Xiaomi battery saver
    BACKGROUND_ACTIVITY,            // Allow background activity
    DEEP_OPTIMIZATION,              // OnePlus deep optimization
    SLEEPING_APPS,                  // Samsung sleeping apps list
    PROTECTED_APPS,                 // Huawei protected apps
    LOCK_RECENT_APPS,              // Lock in recent apps (Oppo/Vivo)
    BACKGROUND_POWER_CONSUMPTION   // Vivo background power
}
