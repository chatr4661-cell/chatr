package com.chatr.app.webrtc.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Network Monitor - Detects network changes for seamless handover
 * 
 * Critical for:
 * - WiFi ↔ LTE switching without call drops
 * - Network quality assessment
 * - ICE restart triggering
 */
@Singleton
class NetworkMonitor @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "NetworkMonitor"
    }

    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private val _networkState = MutableStateFlow(NetworkState.UNKNOWN)
    val networkState: StateFlow<NetworkState> = _networkState.asStateFlow()

    private val _networkType = MutableStateFlow(NetworkType.UNKNOWN)
    val networkType: StateFlow<NetworkType> = _networkType.asStateFlow()

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    private var onNetworkChange: ((NetworkType) -> Unit)? = null

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            Log.d(TAG, "Network available: $network")
            _isConnected.value = true
            _networkState.value = NetworkState.CONNECTED
            updateNetworkType(network)
        }

        override fun onLost(network: Network) {
            Log.d(TAG, "Network lost: $network")
            _isConnected.value = false
            _networkState.value = NetworkState.DISCONNECTED
            _networkType.value = NetworkType.NONE
            onNetworkChange?.invoke(NetworkType.NONE)
        }

        override fun onCapabilitiesChanged(
            network: Network,
            networkCapabilities: NetworkCapabilities
        ) {
            updateNetworkType(network)
            
            // Check bandwidth for quality
            val downstreamBandwidth = networkCapabilities.linkDownstreamBandwidthKbps
            val upstreamBandwidth = networkCapabilities.linkUpstreamBandwidthKbps
            
            Log.d(TAG, "Network capabilities changed - Down: ${downstreamBandwidth}kbps, Up: ${upstreamBandwidth}kbps")
        }

        override fun onLosing(network: Network, maxMsToLive: Int) {
            Log.d(TAG, "Network losing: $network (${maxMsToLive}ms to live)")
            _networkState.value = NetworkState.LOSING
        }
    }

    /**
     * Start monitoring network changes
     */
    fun startMonitoring(onChange: ((NetworkType) -> Unit)? = null) {
        Log.d(TAG, "Starting network monitoring")
        onNetworkChange = onChange

        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .addTransportType(NetworkCapabilities.TRANSPORT_CELLULAR)
            .build()

        connectivityManager.registerNetworkCallback(networkRequest, networkCallback)
        
        // Initial check
        checkCurrentNetwork()
    }

    /**
     * Stop monitoring
     */
    fun stopMonitoring() {
        Log.d(TAG, "Stopping network monitoring")
        try {
            connectivityManager.unregisterNetworkCallback(networkCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering network callback", e)
        }
        onNetworkChange = null
    }

    /**
     * Get current network type
     */
    fun getCurrentNetworkType(): NetworkType {
        return _networkType.value
    }

    /**
     * Check if good for video
     */
    fun isGoodForVideo(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        
        val downstreamBandwidth = capabilities.linkDownstreamBandwidthKbps
        
        // Require at least 1.5 Mbps for video
        return downstreamBandwidth > 1500
    }

    /**
     * Get estimated bandwidth
     */
    fun getEstimatedBandwidth(): Int {
        val network = connectivityManager.activeNetwork ?: return 0
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return 0
        return capabilities.linkDownstreamBandwidthKbps
    }

    private fun checkCurrentNetwork() {
        val network = connectivityManager.activeNetwork
        if (network != null) {
            _isConnected.value = true
            _networkState.value = NetworkState.CONNECTED
            updateNetworkType(network)
        } else {
            _isConnected.value = false
            _networkState.value = NetworkState.DISCONNECTED
            _networkType.value = NetworkType.NONE
        }
    }

    private fun updateNetworkType(network: Network) {
        val capabilities = connectivityManager.getNetworkCapabilities(network)
        val previousType = _networkType.value

        val newType = when {
            capabilities == null -> NetworkType.UNKNOWN
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkType.WIFI
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                // Determine cellular generation
                determineCellularType(capabilities)
            }
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> NetworkType.ETHERNET
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> NetworkType.VPN
            else -> NetworkType.UNKNOWN
        }

        _networkType.value = newType

        // Notify if type changed (network handover)
        if (previousType != newType && previousType != NetworkType.UNKNOWN) {
            Log.d(TAG, "Network type changed: $previousType -> $newType")
            onNetworkChange?.invoke(newType)
        }
    }

    private fun determineCellularType(capabilities: NetworkCapabilities): NetworkType {
        val bandwidth = capabilities.linkDownstreamBandwidthKbps
        
        return when {
            bandwidth > 100000 -> NetworkType.CELLULAR_5G // 5G typically > 100 Mbps
            bandwidth > 20000 -> NetworkType.CELLULAR_4G  // LTE typically 20-50 Mbps
            bandwidth > 2000 -> NetworkType.CELLULAR_3G   // 3G typically 2-10 Mbps
            else -> NetworkType.CELLULAR_2G               // 2G/Edge < 2 Mbps
        }
    }
}

/**
 * Network connection state
 */
enum class NetworkState {
    UNKNOWN,
    CONNECTED,
    DISCONNECTED,
    LOSING
}

/**
 * Network type classification
 */
enum class NetworkType {
    UNKNOWN,
    NONE,
    WIFI,
    CELLULAR_2G,
    CELLULAR_3G,
    CELLULAR_4G,
    CELLULAR_5G,
    ETHERNET,
    VPN;

    val isCellular: Boolean
        get() = this in listOf(CELLULAR_2G, CELLULAR_3G, CELLULAR_4G, CELLULAR_5G)

    val isHighSpeed: Boolean
        get() = this in listOf(WIFI, CELLULAR_4G, CELLULAR_5G, ETHERNET)
}
