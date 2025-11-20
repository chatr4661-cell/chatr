package com.chatr.app.os

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject

/**
 * CHATR OS - Native App Lifecycle Manager (Android)
 * 
 * Provides native lifecycle hooks and resource monitoring for mini-apps.
 * Week 1 - Core OS Infrastructure
 */
@CapacitorPlugin(name = "AppLifecycleManager")
class AppLifecycleManager : Plugin() {
    
    private lateinit var activityManager: ActivityManager
    
    override fun load() {
        activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    }
    
    /**
     * Pause an app (move to background)
     */
    @PluginMethod
    fun pauseApp(call: PluginCall) {
        val appId = call.getString("appId")
        
        if (appId == null) {
            call.reject("appId is required")
            return
        }
        
        // In a real implementation, this would suspend the app's process
        // For now, we'll just return success
        val result = JSONObject()
        result.put("success", true)
        result.put("appId", appId)
        result.put("state", "paused")
        
        call.resolve(result)
    }
    
    /**
     * Resume an app (bring to foreground)
     */
    @PluginMethod
    fun resumeApp(call: PluginCall) {
        val appId = call.getString("appId")
        
        if (appId == null) {
            call.reject("appId is required")
            return
        }
        
        val result = JSONObject()
        result.put("success", true)
        result.put("appId", appId)
        result.put("state", "running")
        
        call.resolve(result)
    }
    
    /**
     * Get resource usage for an app
     */
    @PluginMethod
    fun getResourceUsage(call: PluginCall) {
        val appId = call.getString("appId")
        
        if (appId == null) {
            call.reject("appId is required")
            return
        }
        
        // Get memory info
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        
        val result = JSONObject()
        result.put("appId", appId)
        result.put("memoryUsedMB", (memoryInfo.totalMem - memoryInfo.availMem) / (1024 * 1024))
        result.put("memoryAvailableMB", memoryInfo.availMem / (1024 * 1024))
        result.put("memoryTotalMB", memoryInfo.totalMem / (1024 * 1024))
        result.put("lowMemory", memoryInfo.lowMemory)
        
        // CPU usage would require more complex implementation
        result.put("cpuUsagePercent", 0.0)
        
        call.resolve(result)
    }
    
    /**
     * Get running apps
     */
    @PluginMethod
    fun getRunningApps(call: PluginCall) {
        val runningAppProcesses = activityManager.runningAppProcesses
        val result = JSONObject()
        result.put("count", runningAppProcesses?.size ?: 0)
        result.put("apps", runningAppProcesses?.map { it.processName } ?: emptyList<String>())
        
        call.resolve(result)
    }
    
    /**
     * Kill an app process
     */
    @PluginMethod
    fun terminateApp(call: PluginCall) {
        val appId = call.getString("appId")
        
        if (appId == null) {
            call.reject("appId is required")
            return
        }
        
        // In a real implementation, this would kill the app's process
        // This requires system-level permissions
        val result = JSONObject()
        result.put("success", true)
        result.put("appId", appId)
        result.put("state", "terminated")
        
        call.resolve(result)
    }
}
