package com.chatr.app.webrtc.handoff

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import com.chatr.app.webrtc.state.CallStateMachine
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Network Handoff Manager - Seamless WiFi ↔ LTE Transitions
 * 
 * GSM-GRADE REQUIREMENT:
 * - Zero-interruption call continuity during network switches
 * - Predictive handoff (detect weak WiFi before drop)
 * - ICE restart orchestration
 * - Bitrate pre-adjustment for mobile networks
 * 
 * This is what makes CHATR calls feel like GSM calls
 */
@Singleton
class NetworkHandoffManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val callStateMachine: CallStateMachine
) {
    companion object {
        private const val TAG = "NetworkHandoff"
        
        // Thresholds for predictive handoff
        private const val WIFI_RSSI_WEAK = -70      // dBm
        private const val WIFI_RSSI_CRITICAL = -80  // dBm
        private const val LTE_RSRP_WEAK = -110      // dBm
        
        // Handoff timing
        private const val HANDOFF_DEBOUNCE_MS = 2000L
        private const val ICE_RESTART_DELAY_MS = 500L
    }
    
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    private val _currentNetwork = MutableStateFlow<NetworkType>(NetworkType.UNKNOWN)
    val currentNetwork: StateFlow<NetworkType> = _currentNetwork.asStateFlow()
    
    private val _networkQuality = MutableStateFlow<NetworkQualityLevel>(NetworkQualityLevel.GOOD)
    val networkQuality: StateFlow<NetworkQualityLevel> = _networkQuality.asStateFlow()
    
    private val _isHandoffInProgress = MutableStateFlow(false)
    val isHandoffInProgress: StateFlow<Boolean> = _isHandoffInProgress.asStateFlow()
    
    private var onHandoffRequired: (() -> Unit)? = null
    private var lastHandoffTime = 0L
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    
    /**
     * Start monitoring network for active call
     */
    fun startMonitoring(onHandoff: () -> Unit) {
        onHandoffRequired = onHandoff
        
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .addTransportType(NetworkCapabilities.TRANSPORT_CELLULAR)
            .build()
        
        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.d(TAG, "📶 Network available: ${getNetworkType(network)}")
                handleNetworkChange(network)
            }
            
            override fun onLost(network: Network) {
                Log.w(TAG, "📶 Network lost: ${getNetworkType(network)}")
                handleNetworkLoss()
            }
            
            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                updateNetworkQuality(capabilities)
            }
            
            override fun onLosing(network: Network, maxMsToLive: Int) {
                Log.w(TAG, "📶 Network losing in ${maxMsToLive}ms - initiating predictive handoff")
                initiatePredictiveHandoff()
            }
        }
        
        connectivityManager.registerNetworkCallback(request, networkCallback!!)
        
        // Initial network detection
        detectCurrentNetwork()
        
        Log.d(TAG, "📶 Network monitoring started for call")
    }
    
    /**
     * Stop monitoring (call ended)
     */
    fun stopMonitoring() {
        networkCallback?.let {
            try {
                connectivityManager.unregisterNetworkCallback(it)
            } catch (e: Exception) {
                Log.e(TAG, "Error unregistering callback", e)
            }
        }
        networkCallback = null
        onHandoffRequired = null
        
        Log.d(TAG, "📶 Network monitoring stopped")
    }
    
    /**
     * Handle network change during call
     */
    private fun handleNetworkChange(network: Network) {
        val newType = getNetworkType(network)
        val oldType = _currentNetwork.value
        
        if (newType == oldType) return
        
        // Debounce rapid switches
        val now = System.currentTimeMillis()
        if (now - lastHandoffTime < HANDOFF_DEBOUNCE_MS) {
            Log.d(TAG, "📶 Handoff debounced")
            return
        }
        
        Log.d(TAG, "📶 Network handoff: $oldType → $newType")
        lastHandoffTime = now
        
        _currentNetwork.value = newType
        _isHandoffInProgress.value = true
        
        // Trigger ICE restart with delay for network stabilization
        scope.launch {
            delay(ICE_RESTART_DELAY_MS)
            
            Log.d(TAG, "📶 Triggering ICE restart for handoff")
            onHandoffRequired?.invoke()
            
            delay(1000)
            _isHandoffInProgress.value = false
        }
    }
    
    /**
     * Handle complete network loss
     */
    private fun handleNetworkLoss() {
        _currentNetwork.value = NetworkType.NONE
        _networkQuality.value = NetworkQualityLevel.DISCONNECTED
        
        Log.w(TAG, "📶 Complete network loss - call may drop")
        
        // Start reconnection timer
        scope.launch {
            delay(5000)
            
            if (_currentNetwork.value == NetworkType.NONE) {
                Log.e(TAG, "📶 Network not recovered after 5s")
            }
        }
    }
    
    /**
     * Initiate predictive handoff (before network fully drops)
     */
    private fun initiatePredictiveHandoff() {
        if (_isHandoffInProgress.value) return
        
        Log.d(TAG, "📶 Predictive handoff initiated")
        _isHandoffInProgress.value = true
        
        scope.launch {
            // Pre-condition the call for network switch
            onHandoffRequired?.invoke()
            
            delay(2000)
            _isHandoffInProgress.value = false
        }
    }
    
    /**
     * Update network quality from capabilities
     */
    private fun updateNetworkQuality(capabilities: NetworkCapabilities) {
        val downstreamBandwidth = capabilities.linkDownstreamBandwidthKbps
        val upstreamBandwidth = capabilities.linkUpstreamBandwidthKbps
        
        val quality = when {
            downstreamBandwidth > 10000 && upstreamBandwidth > 2000 -> NetworkQualityLevel.EXCELLENT
            downstreamBandwidth > 5000 && upstreamBandwidth > 1000 -> NetworkQualityLevel.GOOD
            downstreamBandwidth > 1000 && upstreamBandwidth > 300 -> NetworkQualityLevel.FAIR
            downstreamBandwidth > 0 -> NetworkQualityLevel.POOR
            else -> NetworkQualityLevel.DISCONNECTED
        }
        
        if (quality != _networkQuality.value) {
            Log.d(TAG, "📶 Network quality: ${_networkQuality.value} → $quality")
            _networkQuality.value = quality
        }
    }
    
    /**
     * Detect current network type
     */
    private fun detectCurrentNetwork() {
        val network = connectivityManager.activeNetwork
        if (network != null) {
            _currentNetwork.value = getNetworkType(network)
        } else {
            _currentNetwork.value = NetworkType.NONE
        }
    }
    
    /**
     * Get network type from Network object
     */
    private fun getNetworkType(network: Network): NetworkType {
        val capabilities = connectivityManager.getNetworkCapabilities(network)
            ?: return NetworkType.UNKNOWN
        
        return when {
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkType.WIFI
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                if (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)) {
                    NetworkType.LTE_UNLIMITED
                } else {
                    NetworkType.LTE
                }
            }
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> NetworkType.ETHERNET
            else -> NetworkType.UNKNOWN
        }
    }
    
    /**
     * Get recommended bitrate for current network
     */
    fun getRecommendedBitrate(isVideo: Boolean): Int {
        return when (_networkQuality.value) {
            NetworkQualityLevel.EXCELLENT -> if (isVideo) 8_000_000 else 128_000
            NetworkQualityLevel.GOOD -> if (isVideo) 4_000_000 else 64_000
            NetworkQualityLevel.FAIR -> if (isVideo) 1_500_000 else 32_000
            NetworkQualityLevel.POOR -> if (isVideo) 500_000 else 16_000
            NetworkQualityLevel.DISCONNECTED -> 0
        }
    }
    
    /**
     * Should video be disabled for current network?
     */
    fun shouldDisableVideo(): Boolean {
        return _networkQuality.value in listOf(
            NetworkQualityLevel.POOR,
            NetworkQualityLevel.DISCONNECTED
        ) || _currentNetwork.value == NetworkType.LTE // Preserve data on metered
    }
}

/**
 * Network types
 */
enum class NetworkType {
    WIFI,
    LTE,
    LTE_UNLIMITED,
    ETHERNET,
    NONE,
    UNKNOWN
}

/**
 * Network quality levels
 */
enum class NetworkQualityLevel {
    EXCELLENT,
    GOOD,
    FAIR,
    POOR,
    DISCONNECTED
}
