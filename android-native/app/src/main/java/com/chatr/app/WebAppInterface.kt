package com.chatr.app

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.telephony.TelephonyManager
import android.webkit.JavascriptInterface
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import org.json.JSONObject

/**
 * WebAppInterface - JavaScript Bridge for Ultra-Low Bandwidth Mode
 * 
 * Exposes native network capabilities to WebView:
 * - Network mode classification (MODE_0 to MODE_4)
 * - Bandwidth estimation
 * - Video policy enforcement
 * - Audio optimization
 */
class WebAppInterface(
    private val context: Context,
    private val onAuthSuccess: (token: String?) -> Unit
) {
    companion object {
        // Network mode constants matching web implementation
        const val MODE_0_OFFLINE = 0
        const val MODE_1_ULTRA_LOW = 1
        const val MODE_2_LOW = 2
        const val MODE_3_NORMAL = 3
        const val MODE_4_HIGH = 4
        
        private const val TAG = "WebAppInterface"
    }
    
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
    
    // Cached values for performance
    private var cachedNetworkMode = MODE_3_NORMAL
    private var lastModeCheck = 0L
    private val MODE_CHECK_INTERVAL = 2000L // 2 seconds
    
    @JavascriptInterface
    fun onAuthSuccess(token: String?) {
        onAuthSuccess.invoke(token)
    }

    @JavascriptInterface
    fun isAppInstalled(packageName: String): Boolean {
        return try {
            context.packageManager.getPackageInfo(packageName, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    @JavascriptInterface
    fun launchApp(packageName: String, fallbackUrl: String) {
        if (isAppInstalled(packageName)) {
            val intent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                return
            }
        }
        // Fallback: Chrome Custom Tab (PWA Mode)
        try {
            val builder = CustomTabsIntent.Builder()
            builder.setToolbarColor(ContextCompat.getColor(context, android.R.color.white))
            val customTabsIntent = builder.build()
            customTabsIntent.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            customTabsIntent.launchUrl(context, Uri.parse(fallbackUrl))
        } catch (e: Exception) {
            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl))
            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(browserIntent)
        }
    }
    
    @JavascriptInterface
    fun showIncomingCall(callerName: String, callId: String, isVideo: Boolean) {
        val intent = Intent(context, com.chatr.app.ui.activities.CallActivity::class.java).apply {
            putExtra("callerName", callerName)
            putExtra("callId", callId)
            putExtra("isVideo", isVideo)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        context.startActivity(intent)
    }
    
    // ========================================
    // ULTRA-LOW BANDWIDTH BRIDGE METHODS
    // ========================================
    
    /**
     * Get current network mode (MODE_0 to MODE_4)
     * Called frequently by web app to check network status
     */
    @JavascriptInterface
    fun getNetworkMode(): Int {
        val now = System.currentTimeMillis()
        
        // Use cached value if recent enough
        if (now - lastModeCheck < MODE_CHECK_INTERVAL) {
            return cachedNetworkMode
        }
        
        lastModeCheck = now
        cachedNetworkMode = classifyNetworkMode()
        return cachedNetworkMode
    }
    
    /**
     * Get detailed network mode info as JSON
     */
    @JavascriptInterface
    fun getNetworkModeInfo(): String {
        val mode = getNetworkMode()
        val bandwidth = getEstimatedBandwidth()
        val rtt = getEstimatedRTT()
        
        val json = JSONObject().apply {
            put("mode", mode)
            put("modeName", getModeName(mode))
            put("description", getModeDescription(mode))
            put("maxAudioBitrate", getMaxAudioBitrate(mode))
            put("maxVideoBitrate", getMaxVideoBitrate(mode))
            put("videoAllowed", isVideoAllowed(mode))
            put("videoOnTapOnly", isVideoTapOnly(mode))
            put("estimatedBandwidth", bandwidth)
            put("rtt", rtt)
            put("isOffline", mode == MODE_0_OFFLINE)
            put("isSatellite", mode == MODE_1_ULTRA_LOW)
        }
        
        return json.toString()
    }
    
    /**
     * Classify network into MODE_0 to MODE_4
     */
    private fun classifyNetworkMode(): Int {
        val network = connectivityManager.activeNetwork ?: return MODE_0_OFFLINE
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return MODE_0_OFFLINE
        
        // Check if actually connected
        if (!capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
            return MODE_0_OFFLINE
        }
        
        val bandwidth = capabilities.linkDownstreamBandwidthKbps
        
        // WiFi detection - usually high bandwidth
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
            return when {
                bandwidth > 5000 -> MODE_4_HIGH
                bandwidth > 500 -> MODE_3_NORMAL
                else -> MODE_2_LOW
            }
        }
        
        // Cellular detection
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
            return classifyCellularNetwork(bandwidth)
        }
        
        // Ethernet - assume high
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
            return MODE_4_HIGH
        }
        
        // Satellite or other transport - treat as ultra-low
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_SATELLITE)) {
            return MODE_1_ULTRA_LOW
        }
        
        // Default based on bandwidth
        return when {
            bandwidth <= 10 -> MODE_1_ULTRA_LOW
            bandwidth <= 30 -> MODE_2_LOW
            bandwidth <= 500 -> MODE_3_NORMAL
            else -> MODE_4_HIGH
        }
    }
    
    /**
     * Classify cellular network type
     */
    private fun classifyCellularNetwork(bandwidth: Int): Int {
        // Try to get network type from TelephonyManager
        val networkType = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                telephonyManager?.dataNetworkType ?: TelephonyManager.NETWORK_TYPE_UNKNOWN
            } else {
                @Suppress("DEPRECATION")
                telephonyManager?.networkType ?: TelephonyManager.NETWORK_TYPE_UNKNOWN
            }
        } catch (e: SecurityException) {
            TelephonyManager.NETWORK_TYPE_UNKNOWN
        }
        
        return when (networkType) {
            // 2G networks - ultra low
            TelephonyManager.NETWORK_TYPE_GPRS,
            TelephonyManager.NETWORK_TYPE_EDGE,
            TelephonyManager.NETWORK_TYPE_CDMA,
            TelephonyManager.NETWORK_TYPE_1xRTT,
            TelephonyManager.NETWORK_TYPE_IDEN -> MODE_1_ULTRA_LOW
            
            // 3G networks - low
            TelephonyManager.NETWORK_TYPE_UMTS,
            TelephonyManager.NETWORK_TYPE_EVDO_0,
            TelephonyManager.NETWORK_TYPE_EVDO_A,
            TelephonyManager.NETWORK_TYPE_HSDPA,
            TelephonyManager.NETWORK_TYPE_HSUPA,
            TelephonyManager.NETWORK_TYPE_HSPA,
            TelephonyManager.NETWORK_TYPE_EVDO_B,
            TelephonyManager.NETWORK_TYPE_EHRPD,
            TelephonyManager.NETWORK_TYPE_HSPAP -> {
                if (bandwidth > 100) MODE_3_NORMAL else MODE_2_LOW
            }
            
            // 4G/LTE - normal to high
            TelephonyManager.NETWORK_TYPE_LTE -> {
                when {
                    bandwidth > 5000 -> MODE_4_HIGH
                    bandwidth > 500 -> MODE_3_NORMAL
                    else -> MODE_2_LOW
                }
            }
            
            // 5G - high
            TelephonyManager.NETWORK_TYPE_NR -> MODE_4_HIGH
            
            // Unknown - use bandwidth
            else -> when {
                bandwidth <= 10 -> MODE_1_ULTRA_LOW
                bandwidth <= 30 -> MODE_2_LOW
                bandwidth <= 500 -> MODE_3_NORMAL
                else -> MODE_4_HIGH
            }
        }
    }
    
    /**
     * Get estimated bandwidth in kbps
     */
    @JavascriptInterface
    fun getEstimatedBandwidth(): Int {
        val network = connectivityManager.activeNetwork ?: return 0
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return 0
        return capabilities.linkDownstreamBandwidthKbps
    }
    
    /**
     * Get estimated RTT in milliseconds
     */
    @JavascriptInterface
    fun getEstimatedRTT(): Int {
        // Android doesn't provide RTT directly
        // Estimate based on network type
        val mode = getNetworkMode()
        return when (mode) {
            MODE_0_OFFLINE -> 0
            MODE_1_ULTRA_LOW -> 2000 // 2 seconds for satellite
            MODE_2_LOW -> 500 // 500ms for 2G/3G
            MODE_3_NORMAL -> 100 // 100ms for 4G
            MODE_4_HIGH -> 30 // 30ms for WiFi/5G
            else -> 200
        }
    }
    
    /**
     * Check if video is allowed for current network
     */
    @JavascriptInterface
    fun isVideoAllowedNow(): Boolean {
        val mode = getNetworkMode()
        return isVideoAllowed(mode)
    }
    
    /**
     * Get maximum audio bitrate for current network
     */
    @JavascriptInterface
    fun getMaxAudioBitrateNow(): Int {
        val mode = getNetworkMode()
        return getMaxAudioBitrate(mode)
    }
    
    /**
     * Get maximum video bitrate for current network
     */
    @JavascriptInterface
    fun getMaxVideoBitrateNow(): Int {
        val mode = getNetworkMode()
        return getMaxVideoBitrate(mode)
    }
    
    /**
     * Check if good enough for video call
     */
    @JavascriptInterface
    fun isGoodForVideoCall(): Boolean {
        val mode = getNetworkMode()
        return mode >= MODE_3_NORMAL
    }
    
    /**
     * Check if good enough for voice call
     */
    @JavascriptInterface
    fun isGoodForVoiceCall(): Boolean {
        val mode = getNetworkMode()
        return mode >= MODE_1_ULTRA_LOW
    }
    
    /**
     * Get user-friendly network status message
     */
    @JavascriptInterface
    fun getNetworkStatusMessage(): String {
        val mode = getNetworkMode()
        return getModeDescription(mode)
    }
    
    // ========================================
    // HELPER METHODS
    // ========================================
    
    private fun getModeName(mode: Int): String = when (mode) {
        MODE_0_OFFLINE -> "OFFLINE"
        MODE_1_ULTRA_LOW -> "ULTRA_LOW"
        MODE_2_LOW -> "LOW"
        MODE_3_NORMAL -> "NORMAL"
        MODE_4_HIGH -> "HIGH"
        else -> "UNKNOWN"
    }
    
    private fun getModeDescription(mode: Int): String = when (mode) {
        MODE_0_OFFLINE -> "Waiting for network…"
        MODE_1_ULTRA_LOW -> "Low signal — voice optimized"
        MODE_2_LOW -> "Weak network — audio only"
        MODE_3_NORMAL -> "Network good"
        MODE_4_HIGH -> "Excellent network"
        else -> "Unknown"
    }
    
    private fun getMaxAudioBitrate(mode: Int): Int = when (mode) {
        MODE_0_OFFLINE -> 0
        MODE_1_ULTRA_LOW -> 12
        MODE_2_LOW -> 24
        MODE_3_NORMAL -> 32
        MODE_4_HIGH -> 48
        else -> 24
    }
    
    private fun getMaxVideoBitrate(mode: Int): Int = when (mode) {
        MODE_0_OFFLINE -> 0
        MODE_1_ULTRA_LOW -> 0
        MODE_2_LOW -> 0
        MODE_3_NORMAL -> 300
        MODE_4_HIGH -> 1500
        else -> 0
    }
    
    private fun isVideoAllowed(mode: Int): Boolean = mode >= MODE_3_NORMAL
    
    private fun isVideoTapOnly(mode: Int): Boolean = mode == MODE_3_NORMAL
}
