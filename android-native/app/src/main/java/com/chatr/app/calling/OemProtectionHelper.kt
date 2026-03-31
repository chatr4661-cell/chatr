package com.chatr.app.calling

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import javax.inject.Inject
import javax.inject.Singleton

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              OEM PROTECTION HELPER                               ║
 * ║                                                                  ║
 * ║  Xiaomi / Vivo / Oppo / Samsung / Huawei kill-protection        ║
 * ║                                                                  ║
 * ║  Even with foreground service, Chinese OEMs aggressively        ║
 * ║  kill background apps. This helper:                              ║
 * ║  1. Requests battery optimization exemption                      ║
 * ║  2. Guides user to OEM-specific autostart settings               ║
 * ║  3. Provides retry logic for service restarts                    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
@Singleton
class OemProtectionHelper @Inject constructor(
    private val context: Context
) {
    companion object {
        private const val TAG = "OemProtectionHelper"
        private const val PREFS_NAME = "chatr_oem_protection"
        private const val KEY_AUTOSTART_PROMPTED = "autostart_prompted"
        private const val KEY_BATTERY_OPT_PROMPTED = "battery_opt_prompted"
    }

    private val prefs by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Check if app is ignoring battery optimizations
     */
    fun isBatteryOptimizationDisabled(): Boolean {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    /**
     * Request battery optimization exemption
     * Returns intent to show to user, or null if already exempt
     */
    fun getBatteryOptimizationIntent(): Intent? {
        if (isBatteryOptimizationDisabled()) return null

        return Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${context.packageName}")
        }
    }

    /**
     * Get OEM-specific autostart settings intent
     * Returns null if OEM is not known to need it
     */
    fun getAutostartIntent(): Intent? {
        val manufacturer = Build.MANUFACTURER.lowercase()
        
        val intentComponents = when {
            manufacturer.contains("xiaomi") || manufacturer.contains("redmi") -> listOf(
                ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
                ComponentName("com.miui.securitycenter", "com.miui.powercenter.PowerSettings")
            )
            manufacturer.contains("oppo") || manufacturer.contains("realme") -> listOf(
                ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
                ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")
            )
            manufacturer.contains("vivo") -> listOf(
                ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
                ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")
            )
            manufacturer.contains("huawei") || manufacturer.contains("honor") -> listOf(
                ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
                ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")
            )
            manufacturer.contains("samsung") -> listOf(
                ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity"),
                ComponentName("com.samsung.android.sm", "com.samsung.android.sm.ui.battery.BatteryActivity")
            )
            manufacturer.contains("oneplus") -> listOf(
                ComponentName("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity")
            )
            else -> null
        }

        intentComponents?.forEach { component ->
            val intent = Intent().setComponent(component)
            if (isIntentAvailable(intent)) {
                Log.d(TAG, "📱 OEM autostart intent found: ${component.className}")
                return intent
            }
        }

        return null
    }

    /**
     * Check if user has already been prompted for autostart
     */
    fun hasPromptedAutostart(): Boolean = prefs.getBoolean(KEY_AUTOSTART_PROMPTED, false)

    fun markAutostartPrompted() {
        prefs.edit().putBoolean(KEY_AUTOSTART_PROMPTED, true).apply()
    }

    fun hasPromptedBatteryOptimization(): Boolean = prefs.getBoolean(KEY_BATTERY_OPT_PROMPTED, false)

    fun markBatteryOptimizationPrompted() {
        prefs.edit().putBoolean(KEY_BATTERY_OPT_PROMPTED, true).apply()
    }

    /**
     * Get manufacturer-specific protection description
     */
    fun getOemProtectionDescription(): String? {
        val manufacturer = Build.MANUFACTURER.lowercase()
        return when {
            manufacturer.contains("xiaomi") || manufacturer.contains("redmi") ->
                "Enable Autostart and disable Battery Saver for CHATR in Settings → Apps → Manage apps → CHATR"
            manufacturer.contains("oppo") || manufacturer.contains("realme") ->
                "Allow CHATR in Auto-startup manager and disable battery optimization"
            manufacturer.contains("vivo") ->
                "Allow CHATR in Background App Management and High Background Power Consumption"
            manufacturer.contains("huawei") || manufacturer.contains("honor") ->
                "Add CHATR to Protected Apps and disable Battery Optimization"
            manufacturer.contains("samsung") ->
                "Add CHATR to Unmonitored Apps in Device Care → Battery"
            else -> null
        }
    }

    /**
     * Check if this OEM is known to aggressively kill apps
     */
    fun isAggressiveOem(): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()
        return manufacturer.contains("xiaomi") ||
               manufacturer.contains("redmi") ||
               manufacturer.contains("oppo") ||
               manufacturer.contains("realme") ||
               manufacturer.contains("vivo") ||
               manufacturer.contains("huawei") ||
               manufacturer.contains("honor") ||
               manufacturer.contains("oneplus")
    }

    private fun isIntentAvailable(intent: Intent): Boolean {
        return context.packageManager.resolveActivity(
            intent, PackageManager.MATCH_DEFAULT_ONLY
        ) != null
    }
}
