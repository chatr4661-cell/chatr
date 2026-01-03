package com.chatr.app.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * NetworkRecoveryTrigger - GSM-grade network restoration handler
 * 
 * CRITICAL FOR GSM REPLACEMENT:
 * When network is restored after being offline, this IMMEDIATELY triggers
 * message sync - just like SMS does when you regain signal.
 * 
 * This is what makes messaging "just work" like cellular.
 */
@Singleton
class NetworkRecoveryTrigger @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "NetworkRecovery"
    }
    
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    
    private val _isOnline = MutableStateFlow(false)
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()
    
    private val _lastOnlineTime = MutableStateFlow(0L)
    val lastOnlineTime: StateFlow<Long> = _lastOnlineTime.asStateFlow()
    
    private var wasOffline = false
    private var isRegistered = false
    
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            Log.d(TAG, "📶 Network AVAILABLE")
            handleNetworkRestored()
        }
        
        override fun onLost(network: Network) {
            Log.d(TAG, "📶 Network LOST")
            handleNetworkLost()
        }
        
        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
            val hasInternet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                    capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            
            if (hasInternet && !_isOnline.value) {
                handleNetworkRestored()
            } else if (!hasInternet && _isOnline.value) {
                handleNetworkLost()
            }
        }
    }
    
    /**
     * Start monitoring network state
     * Call this from Application.onCreate()
     */
    fun startMonitoring() {
        if (isRegistered) return
        
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        
        try {
            connectivityManager.registerNetworkCallback(request, networkCallback)
            isRegistered = true
            
            // Check initial state
            val activeNetwork = connectivityManager.activeNetwork
            val capabilities = activeNetwork?.let { connectivityManager.getNetworkCapabilities(it) }
            _isOnline.value = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
            
            Log.d(TAG, "📶 Network monitoring started (online: ${_isOnline.value})")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register network callback", e)
        }
    }
    
    /**
     * Stop monitoring
     */
    fun stopMonitoring() {
        if (!isRegistered) return
        
        try {
            connectivityManager.unregisterNetworkCallback(networkCallback)
            isRegistered = false
            Log.d(TAG, "📶 Network monitoring stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to unregister network callback", e)
        }
    }
    
    /**
     * Handle network restoration - THIS IS THE GSM-REPLACEMENT MAGIC
     * 
     * Like SMS queued while in airplane mode, immediately send when signal returns
     */
    private fun handleNetworkRestored() {
        val previouslyOffline = wasOffline
        _isOnline.value = true
        _lastOnlineTime.value = System.currentTimeMillis()
        wasOffline = false
        
        if (previouslyOffline) {
            Log.d(TAG, "📶 Network RESTORED after being offline - triggering immediate sync")
            
            // CRITICAL: Trigger immediate message sync
            scope.launch {
                try {
                    // One-time immediate sync
                    MessageSyncWorker.scheduleOneTimeSync(context)
                    
                    Log.d(TAG, "📶 Immediate sync triggered - pending messages will be sent")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to trigger immediate sync", e)
                }
            }
        }
    }
    
    private fun handleNetworkLost() {
        Log.d(TAG, "📶 Going offline - messages will queue")
        wasOffline = true
        _isOnline.value = false
    }
    
    /**
     * Check if we can send messages right now
     */
    fun canSendMessages(): Boolean {
        val activeNetwork = connectivityManager.activeNetwork
        val capabilities = activeNetwork?.let { connectivityManager.getNetworkCapabilities(it) }
        return capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
    }
    
    /**
     * Get network quality for adaptive sending
     */
    fun getNetworkQuality(): NetworkQuality {
        val activeNetwork = connectivityManager.activeNetwork
        val capabilities = activeNetwork?.let { connectivityManager.getNetworkCapabilities(it) } ?: return NetworkQuality.OFFLINE
        
        return when {
            !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) -> NetworkQuality.OFFLINE
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkQuality.EXCELLENT
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                val downstreamBandwidth = capabilities.linkDownstreamBandwidthKbps
                when {
                    downstreamBandwidth > 10000 -> NetworkQuality.EXCELLENT // 4G/5G
                    downstreamBandwidth > 1000 -> NetworkQuality.GOOD      // 3G
                    downstreamBandwidth > 100 -> NetworkQuality.POOR       // 2G
                    else -> NetworkQuality.VERY_POOR
                }
            }
            else -> NetworkQuality.GOOD
        }
    }
}

enum class NetworkQuality {
    EXCELLENT,
    GOOD,
    POOR,
    VERY_POOR,
    OFFLINE
}
