package com.chatr.app.performance

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.Debug
import android.os.Process
import androidx.core.content.getSystemService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Performance monitor for detecting issues that affect call reliability
 */
class PerformanceMonitor(private val context: Context) {
    
    data class PerformanceMetrics(
        val memoryUsageMb: Long,
        val memoryLimitMb: Long,
        val memoryPressure: Float,
        val isLowMemory: Boolean,
        val cpuUsagePercent: Float,
        val batteryLevel: Int,
        val isCharging: Boolean,
        val thermalStatus: String
    )
    
    private val _metrics = MutableStateFlow<PerformanceMetrics?>(null)
    val metrics: StateFlow<PerformanceMetrics?> = _metrics.asStateFlow()
    
    private val activityManager: ActivityManager? = context.getSystemService()
    
    fun collectMetrics(): PerformanceMetrics {
        val memInfo = ActivityManager.MemoryInfo()
        activityManager?.getMemoryInfo(memInfo)
        
        val runtime = Runtime.getRuntime()
        val usedMemory = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024)
        val maxMemory = runtime.maxMemory() / (1024 * 1024)
        
        val memoryPressure = usedMemory.toFloat() / maxMemory.toFloat()
        
        val batteryStatus = context.registerReceiver(
            null,
            android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED)
        )
        val batteryLevel = batteryStatus?.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val isCharging = batteryStatus?.getIntExtra(
            android.os.BatteryManager.EXTRA_STATUS, -1
        ) == android.os.BatteryManager.BATTERY_STATUS_CHARGING
        
        val thermalStatus = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            when (context.getSystemService<android.os.PowerManager>()?.currentThermalStatus) {
                android.os.PowerManager.THERMAL_STATUS_NONE -> "none"
                android.os.PowerManager.THERMAL_STATUS_LIGHT -> "light"
                android.os.PowerManager.THERMAL_STATUS_MODERATE -> "moderate"
                android.os.PowerManager.THERMAL_STATUS_SEVERE -> "severe"
                android.os.PowerManager.THERMAL_STATUS_CRITICAL -> "critical"
                android.os.PowerManager.THERMAL_STATUS_EMERGENCY -> "emergency"
                android.os.PowerManager.THERMAL_STATUS_SHUTDOWN -> "shutdown"
                else -> "unknown"
            }
        } else "unavailable"
        
        val metrics = PerformanceMetrics(
            memoryUsageMb = usedMemory,
            memoryLimitMb = maxMemory,
            memoryPressure = memoryPressure,
            isLowMemory = memInfo.lowMemory,
            cpuUsagePercent = getCpuUsage(),
            batteryLevel = batteryLevel,
            isCharging = isCharging,
            thermalStatus = thermalStatus
        )
        
        _metrics.value = metrics
        return metrics
    }
    
    private fun getCpuUsage(): Float {
        return try {
            val stat = java.io.File("/proc/${Process.myPid()}/stat").readText()
            val values = stat.split(" ")
            if (values.size > 14) {
                val utime = values[13].toLongOrNull() ?: 0
                val stime = values[14].toLongOrNull() ?: 0
                ((utime + stime) % 100).toFloat()
            } else 0f
        } catch (e: Exception) {
            0f
        }
    }
    
    fun isPerformanceDegraded(): Boolean {
        val current = _metrics.value ?: return false
        return current.memoryPressure > 0.85f ||
               current.isLowMemory ||
               current.thermalStatus in listOf("severe", "critical", "emergency", "shutdown")
    }
    
    fun shouldReduceCallQuality(): Boolean {
        val current = _metrics.value ?: return false
        return current.memoryPressure > 0.75f ||
               current.thermalStatus in listOf("moderate", "severe", "critical") ||
               (current.batteryLevel < 15 && !current.isCharging)
    }
    
    companion object {
        fun getNativeMemoryUsage(): Long {
            return Debug.getNativeHeapAllocatedSize() / (1024 * 1024)
        }
        
        fun logMemoryState(tag: String) {
            val runtime = Runtime.getRuntime()
            val usedMb = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024)
            val maxMb = runtime.maxMemory() / (1024 * 1024)
            val nativeMb = getNativeMemoryUsage()
            
            android.util.Log.d(tag, "Memory: Java=$usedMb/$maxMb MB, Native=$nativeMb MB")
        }
    }
}
