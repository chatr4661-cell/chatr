package com.chatr.app.os

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * CHATR OS - Native App Lifecycle Manager (Android)
 * 
 * Provides native lifecycle hooks and resource monitoring for mini-apps.
 * Simplified version without Capacitor dependency.
 */
@Singleton
class AppLifecycleManager @Inject constructor(
    private val context: Context
) {
    
    private val activityManager: ActivityManager by lazy {
        context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    }
    
    private val runningApps = mutableMapOf<String, AppState>()
    
    data class AppState(
        val appId: String,
        val status: String,
        val startTime: Long,
        val memoryUsage: Long = 0
    )
    
    /**
     * Pause an app (move to background)
     */
    fun pauseApp(appId: String): JSONObject {
        return try {
            runningApps[appId]?.let {
                runningApps[appId] = it.copy(status = "PAUSED")
            }
            JSONObject().apply {
                put("success", true)
                put("appId", appId)
                put("status", "PAUSED")
            }
        } catch (e: Exception) {
            JSONObject().apply {
                put("success", false)
                put("error", e.message)
            }
        }
    }
    
    /**
     * Resume a paused app
     */
    fun resumeApp(appId: String): JSONObject {
        return try {
            runningApps[appId]?.let {
                runningApps[appId] = it.copy(status = "RUNNING")
            }
            JSONObject().apply {
                put("success", true)
                put("appId", appId)
                put("status", "RUNNING")
            }
        } catch (e: Exception) {
            JSONObject().apply {
                put("success", false)
                put("error", e.message)
            }
        }
    }
    
    /**
     * Terminate an app completely
     */
    fun terminateApp(appId: String): JSONObject {
        return try {
            runningApps.remove(appId)
            JSONObject().apply {
                put("success", true)
                put("appId", appId)
                put("status", "TERMINATED")
            }
        } catch (e: Exception) {
            JSONObject().apply {
                put("success", false)
                put("error", e.message)
            }
        }
    }
    
    /**
     * Get memory usage for current process
     */
    fun getMemoryInfo(): JSONObject {
        return try {
            val memoryInfo = ActivityManager.MemoryInfo()
            activityManager.getMemoryInfo(memoryInfo)
            
            val runtime = Runtime.getRuntime()
            val usedMemory = runtime.totalMemory() - runtime.freeMemory()
            val maxHeap = runtime.maxMemory()
            
            JSONObject().apply {
                put("usedMemory", usedMemory)
                put("maxHeap", maxHeap)
                put("availableSystemMemory", memoryInfo.availMem)
                put("totalSystemMemory", memoryInfo.totalMem)
                put("lowMemory", memoryInfo.lowMemory)
            }
        } catch (e: Exception) {
            JSONObject().apply {
                put("error", e.message)
            }
        }
    }
    
    /**
     * Get running apps info
     */
    fun getRunningApps(): JSONObject {
        return JSONObject().apply {
            put("apps", runningApps.values.map { app ->
                JSONObject().apply {
                    put("appId", app.appId)
                    put("status", app.status)
                    put("startTime", app.startTime)
                    put("memoryUsage", app.memoryUsage)
                }
            })
        }
    }
    
    /**
     * Launch/register an app
     */
    fun launchApp(appId: String): JSONObject {
        return try {
            runningApps[appId] = AppState(
                appId = appId,
                status = "RUNNING",
                startTime = System.currentTimeMillis()
            )
            JSONObject().apply {
                put("success", true)
                put("appId", appId)
                put("status", "RUNNING")
            }
        } catch (e: Exception) {
            JSONObject().apply {
                put("success", false)
                put("error", e.message)
            }
        }
    }
}
