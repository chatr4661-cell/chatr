package com.chatr.app.calling

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.util.Log
import javax.inject.Inject
import javax.inject.Singleton

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              NETWORK CALLBACK HANDLER                            ║
 * ║                                                                  ║
 * ║  Handles WiFi ↔ Mobile switches during active calls             ║
 * ║  Triggers ICE restart to prevent call drops                      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
@Singleton
class NetworkCallbackHandler @Inject constructor(
    private val context: Context
) {
    companion object {
        private const val TAG = "NetworkCallbackHandler"
    }

    private var connectivityManager: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var onNetworkChanged: ((NetworkChangeEvent) -> Unit)? = null
    private var currentNetworkType: String = "unknown"
    private var isRegistered = false

    data class NetworkChangeEvent(
        val oldType: String,
        val newType: String,
        val isConnected: Boolean,
        val requiresIceRestart: Boolean
    )

    fun startMonitoring(callback: (NetworkChangeEvent) -> Unit) {
        if (isRegistered) return
        
        onNetworkChanged = callback
        connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        currentNetworkType = getCurrentNetworkType()

        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                val newType = getNetworkType(network)
                Log.d(TAG, "🌐 Network available: $newType (was: $currentNetworkType)")
                
                if (currentNetworkType != "unknown" && currentNetworkType != newType) {
                    // Network type changed (WiFi ↔ Mobile) → ICE restart needed
                    val event = NetworkChangeEvent(
                        oldType = currentNetworkType,
                        newType = newType,
                        isConnected = true,
                        requiresIceRestart = true
                    )
                    currentNetworkType = newType
                    onNetworkChanged?.invoke(event)
                } else {
                    currentNetworkType = newType
                }
            }

            override fun onLost(network: Network) {
                Log.w(TAG, "🌐 Network lost: $currentNetworkType")
                val oldType = currentNetworkType
                currentNetworkType = "disconnected"
                
                onNetworkChanged?.invoke(
                    NetworkChangeEvent(
                        oldType = oldType,
                        newType = "disconnected",
                        isConnected = false,
                        requiresIceRestart = false
                    )
                )
            }

            override fun onCapabilitiesChanged(
                network: Network,
                capabilities: NetworkCapabilities
            ) {
                val newType = when {
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
                    else -> "other"
                }
                
                if (currentNetworkType != newType && currentNetworkType != "unknown") {
                    Log.d(TAG, "🌐 Network capability changed: $currentNetworkType → $newType")
                    val event = NetworkChangeEvent(
                        oldType = currentNetworkType,
                        newType = newType,
                        isConnected = true,
                        requiresIceRestart = true
                    )
                    currentNetworkType = newType
                    onNetworkChanged?.invoke(event)
                }
            }
        }

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .addTransportType(NetworkCapabilities.TRANSPORT_CELLULAR)
            .build()

        connectivityManager?.registerNetworkCallback(request, networkCallback!!)
        isRegistered = true
        Log.d(TAG, "✅ Network monitoring started (current: $currentNetworkType)")
    }

    fun stopMonitoring() {
        if (!isRegistered) return
        
        networkCallback?.let { connectivityManager?.unregisterNetworkCallback(it) }
        networkCallback = null
        onNetworkChanged = null
        isRegistered = false
        Log.d(TAG, "🔌 Network monitoring stopped")
    }

    fun getCurrentNetworkType(): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return "disconnected"
        val caps = cm.getNetworkCapabilities(network) ?: return "unknown"
        
        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
            else -> "other"
        }
    }

    private fun getNetworkType(network: Network): String {
        val caps = connectivityManager?.getNetworkCapabilities(network) ?: return "unknown"
        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
            else -> "other"
        }
    }
}
