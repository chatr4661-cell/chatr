package com.chatr.app.copilot

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.telephony.TelephonyManager
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.InetSocketAddress
import java.net.Socket

/**
 * Network Quality Predictor - Pre-call Analysis
 * 
 * Silently checks network quality before call starts.
 * User sees nothing - call just "works better"
 */
class NetworkQualityPredictor(private val context: Context) {
    
    companion object {
        private const val TAG = "NetworkQuality"
        private const val PING_HOST = "8.8.8.8"
        private const val PING_PORT = 53
        private const val PING_TIMEOUT_MS = 3000
    }
    
    /**
     * Analyze network quality before placing/accepting call
     */
    suspend fun analyze(): NetworkQuality = withContext(Dispatchers.IO) {
        try {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            
            // Check basic connectivity
            val network = connectivityManager.activeNetwork
            if (network == null) {
                Log.d(TAG, "❌ No active network")
                return@withContext NetworkQuality.OFFLINE
            }
            
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            if (capabilities == null) {
                Log.d(TAG, "❌ No network capabilities")
                return@withContext NetworkQuality.POOR
            }
            
            // Determine network type and base quality
            val baseQuality = when {
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {
                    analyzeWifiQuality(capabilities)
                }
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                    analyzeCellularQuality()
                }
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> {
                    NetworkQuality.EXCELLENT
                }
                else -> NetworkQuality.FAIR
            }
            
            // Measure actual latency
            val latency = measureLatency()
            
            // Adjust based on latency
            val finalQuality = adjustForLatency(baseQuality, latency)
            
            Log.d(TAG, "📶 Network analysis: type=${baseQuality.name}, latency=${latency}ms, final=${finalQuality.name}")
            
            return@withContext finalQuality
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Network analysis failed", e)
            return@withContext NetworkQuality.UNKNOWN
        }
    }
    
    /**
     * Analyze WiFi connection quality
     */
    private fun analyzeWifiQuality(capabilities: NetworkCapabilities): NetworkQuality {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Check bandwidth
            val downBandwidth = capabilities.linkDownstreamBandwidthKbps
            val upBandwidth = capabilities.linkUpstreamBandwidthKbps
            
            Log.d(TAG, "📶 WiFi bandwidth: down=${downBandwidth}kbps, up=${upBandwidth}kbps")
            
            when {
                downBandwidth >= 20_000 && upBandwidth >= 5_000 -> NetworkQuality.EXCELLENT
                downBandwidth >= 5_000 && upBandwidth >= 1_000 -> NetworkQuality.GOOD
                downBandwidth >= 1_000 && upBandwidth >= 500 -> NetworkQuality.FAIR
                else -> NetworkQuality.POOR
            }
        } else {
            // Pre-Q devices - assume good WiFi
            NetworkQuality.GOOD
        }
    }
    
    /**
     * Analyze cellular connection quality based on network type
     */
    private fun analyzeCellularQuality(): NetworkQuality {
        return try {
            val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            
            @Suppress("DEPRECATION")
            val networkType = telephonyManager.networkType
            
            when (networkType) {
                TelephonyManager.NETWORK_TYPE_LTE,
                TelephonyManager.NETWORK_TYPE_HSPAP,
                TelephonyManager.NETWORK_TYPE_HSPA -> {
                    Log.d(TAG, "📶 4G/LTE detected")
                    NetworkQuality.GOOD
                }
                TelephonyManager.NETWORK_TYPE_UMTS,
                TelephonyManager.NETWORK_TYPE_EVDO_0,
                TelephonyManager.NETWORK_TYPE_EVDO_A -> {
                    Log.d(TAG, "📶 3G detected")
                    NetworkQuality.FAIR
                }
                TelephonyManager.NETWORK_TYPE_GPRS,
                TelephonyManager.NETWORK_TYPE_EDGE,
                TelephonyManager.NETWORK_TYPE_CDMA -> {
                    Log.d(TAG, "📶 2G detected - poor quality")
                    NetworkQuality.POOR
                }
                else -> {
                    // Check for 5G
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        Log.d(TAG, "📶 Modern network (possibly 5G)")
                        NetworkQuality.EXCELLENT
                    } else {
                        NetworkQuality.GOOD
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to analyze cellular", e)
            NetworkQuality.FAIR
        }
    }
    
    /**
     * Measure actual network latency via TCP ping
     */
    private fun measureLatency(): Long {
        return try {
            val socket = Socket()
            val startTime = System.currentTimeMillis()
            
            socket.connect(InetSocketAddress(PING_HOST, PING_PORT), PING_TIMEOUT_MS)
            socket.close()
            
            val latency = System.currentTimeMillis() - startTime
            Log.d(TAG, "⏱️ Latency: ${latency}ms")
            latency
            
        } catch (e: Exception) {
            Log.w(TAG, "⏱️ Latency measurement failed - assuming high latency")
            1000L // Assume high latency on failure
        }
    }
    
    /**
     * Adjust quality rating based on measured latency
     */
    private fun adjustForLatency(baseQuality: NetworkQuality, latency: Long): NetworkQuality {
        // Latency thresholds
        return when {
            latency < 50 -> {
                // Excellent latency - can upgrade quality
                if (baseQuality == NetworkQuality.GOOD) NetworkQuality.EXCELLENT else baseQuality
            }
            latency < 150 -> {
                // Good latency - maintain quality
                baseQuality
            }
            latency < 300 -> {
                // High latency - downgrade by one level
                when (baseQuality) {
                    NetworkQuality.EXCELLENT -> NetworkQuality.GOOD
                    NetworkQuality.GOOD -> NetworkQuality.FAIR
                    else -> baseQuality
                }
            }
            else -> {
                // Very high latency - significant downgrade
                when (baseQuality) {
                    NetworkQuality.EXCELLENT -> NetworkQuality.FAIR
                    NetworkQuality.GOOD -> NetworkQuality.POOR
                    else -> baseQuality
                }
            }
        }
    }
}

/**
 * Network quality levels
 */
enum class NetworkQuality {
    EXCELLENT,  // 5G, fast WiFi - HD video OK
    GOOD,       // 4G/LTE, decent WiFi - standard video OK
    FAIR,       // 3G, slow WiFi - audio only recommended
    POOR,       // 2G, very slow - low bitrate audio
    OFFLINE,    // No network
    UNKNOWN;    // Can't determine
    
    val isExcellent: Boolean get() = this == EXCELLENT
    val isGood: Boolean get() = this == GOOD || this == EXCELLENT
    val isFair: Boolean get() = this == FAIR
    val isPoor: Boolean get() = this == POOR
    val isOffline: Boolean get() = this == OFFLINE
}
