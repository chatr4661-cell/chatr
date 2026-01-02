package com.chatr.app.permissions

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.getSystemService

/**
 * OEM-specific battery optimization and background execution manager
 * Critical for call reliability on aggressive OEM skins
 */
object OemSurvivalKit {
    
    enum class Manufacturer {
        XIAOMI,
        OPPO,
        VIVO,
        ONEPLUS,
        SAMSUNG,
        HUAWEI,
        REALME,
        ASUS,
        LENOVO,
        MOTOROLA,
        GOOGLE,
        UNKNOWN
    }
    
    fun getManufacturer(): Manufacturer {
        return when (Build.MANUFACTURER.lowercase()) {
            "xiaomi", "redmi", "poco" -> Manufacturer.XIAOMI
            "oppo" -> Manufacturer.OPPO
            "vivo" -> Manufacturer.VIVO
            "oneplus" -> Manufacturer.ONEPLUS
            "samsung" -> Manufacturer.SAMSUNG
            "huawei", "honor" -> Manufacturer.HUAWEI
            "realme" -> Manufacturer.REALME
            "asus" -> Manufacturer.ASUS
            "lenovo" -> Manufacturer.LENOVO
            "motorola" -> Manufacturer.MOTOROLA
            "google" -> Manufacturer.GOOGLE
            else -> Manufacturer.UNKNOWN
        }
    }
    
    fun isAggressiveOem(): Boolean {
        return getManufacturer() in listOf(
            Manufacturer.XIAOMI,
            Manufacturer.OPPO,
            Manufacturer.VIVO,
            Manufacturer.ONEPLUS,
            Manufacturer.HUAWEI,
            Manufacturer.REALME
        )
    }
    
    fun isBatteryOptimizationDisabled(context: Context): Boolean {
        val powerManager = context.getSystemService<PowerManager>() ?: return false
        return powerManager.isIgnoringBatteryOptimizations(context.packageName)
    }
    
    fun getAutoStartIntent(context: Context): Intent? {
        val manufacturer = getManufacturer()
        val packageName = context.packageName
        
        val intents = when (manufacturer) {
            Manufacturer.XIAOMI -> listOf(
                Intent().apply {
                    component = android.content.ComponentName(
                        "com.miui.securitycenter",
                        "com.miui.permcenter.autostart.AutoStartManagementActivity"
                    )
                },
                Intent().apply {
                    component = android.content.ComponentName(
                        "com.miui.securitycenter",
                        "com.miui.powercenter.PowerSettings"
                    )
                }
            )
            
            Manufacturer.OPPO -> listOf(
                Intent().apply {
                    component = android.content.ComponentName(
                        "com.coloros.safecenter",
                        "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                    )
                },
                Intent().apply {
                    component = android.content.ComponentName(
                        "com.oppo.safe",
                        "com.oppo.safe.permission.startup.StartupAppListActivity"
                    )
                }
            )
            
            Manufacturer.VIVO -> listOf(
                Intent().apply {
                    component = android.content.ComponentName(
                        "com.vivo.permissionmanager",
                        "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                    )
                },
                Intent().apply {
                    component = android.content.ComponentName(
                        "com.iqoo.secure",
                        "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"
                    )
                }
            )
            
            Manufacturer.ONEPLUS -> listOf(
                Intent().apply {
                    component = android.content.ComponentName(
                        "com.oneplus.security",
                        "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"
                    )
                }
            )
            
            Manufacturer.HUAWEI -> listOf(
                Intent().apply {
                    component = android.content.ComponentName(
                        "com.huawei.systemmanager",
                        "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                    )
                },
                Intent().apply {
                    component = android.content.ComponentName(
                        "com.huawei.systemmanager",
                        "com.huawei.systemmanager.optimize.process.ProtectActivity"
                    )
                }
            )
            
            Manufacturer.SAMSUNG -> listOf(
                Intent().apply {
                    component = android.content.ComponentName(
                        "com.samsung.android.lool",
                        "com.samsung.android.sm.ui.battery.BatteryActivity"
                    )
                }
            )
            
            Manufacturer.REALME -> listOf(
                Intent().apply {
                    component = android.content.ComponentName(
                        "com.coloros.safecenter",
                        "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                    )
                }
            )
            
            else -> emptyList()
        }
        
        return intents.firstOrNull { intent ->
            context.packageManager.resolveActivity(intent, 0) != null
        }
    }
    
    fun getBatteryOptimizationIntent(context: Context): Intent {
        return Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${context.packageName}")
        }
    }
    
    fun getAppSettingsIntent(context: Context): Intent {
        return Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.parse("package:${context.packageName}")
        }
    }
    
    fun getOemSpecificInstructions(): String {
        return when (getManufacturer()) {
            Manufacturer.XIAOMI -> """
                To ensure calls ring reliably:
                1. Go to Settings → Apps → Manage apps → Chatr
                2. Enable "Autostart"
                3. Set Battery saver to "No restrictions"
                4. Lock Chatr in recent apps (swipe down on the app card)
            """.trimIndent()
            
            Manufacturer.ONEPLUS -> """
                To ensure calls ring reliably:
                1. Go to Settings → Battery → Battery optimization
                2. Find Chatr and select "Don't optimize"
                3. Go to Settings → Apps → Chatr → Battery
                4. Disable "Adaptive battery"
            """.trimIndent()
            
            Manufacturer.SAMSUNG -> """
                To ensure calls ring reliably:
                1. Go to Settings → Apps → Chatr → Battery
                2. Disable "Put app to sleep"
                3. Enable "Allow background activity"
                4. Go to Device care → Battery → App power management
                5. Add Chatr to "Never sleeping apps"
            """.trimIndent()
            
            Manufacturer.HUAWEI -> """
                To ensure calls ring reliably:
                1. Go to Settings → Apps → Chatr → Battery
                2. Disable "Power-intensive prompt"
                3. Enable "Launch manually" and all toggles
                4. Go to Settings → Battery → Launch and select Chatr
                5. Enable "Manage manually" with all toggles ON
            """.trimIndent()
            
            Manufacturer.OPPO, Manufacturer.REALME -> """
                To ensure calls ring reliably:
                1. Go to Settings → App Management → Chatr
                2. Enable "Allow Auto-start"
                3. Go to Battery → Chatr → Enable "Allow background activity"
                4. Disable "Pause app activity if unused"
            """.trimIndent()
            
            Manufacturer.VIVO -> """
                To ensure calls ring reliably:
                1. Go to Settings → Battery → High background power consumption
                2. Enable Chatr
                3. Go to Settings → Apps → Chatr → Autostart → Enable
            """.trimIndent()
            
            else -> """
                To ensure calls ring reliably:
                1. Go to Settings → Apps → Chatr → Battery
                2. Select "Unrestricted" or "Don't optimize"
                3. Enable background activity
            """.trimIndent()
        }
    }
}
