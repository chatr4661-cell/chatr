package com.chatr.app.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import com.chatr.app.services.BackgroundSyncService

/**
 * NETWORK CHANGE RECEIVER
 * 
 * Triggers background sync when network becomes available.
 * Ensures messages are delivered after connectivity is restored.
 */
class NetworkChangeReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "NetworkChangeReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null) return

        val isConnected = isNetworkAvailable(context)
        Log.i(TAG, "🌐 Network state changed: connected=$isConnected")

        if (isConnected) {
            // Trigger sync when network becomes available
            val syncIntent = Intent(context, BackgroundSyncService::class.java).apply {
                action = BackgroundSyncService.ACTION_SYNC_MESSAGES
            }
            
            try {
                context.startForegroundService(syncIntent)
                Log.i(TAG, "✅ Sync triggered on network recovery")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to trigger sync", e)
            }
        }
    }

    private fun isNetworkAvailable(context: Context): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
               capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
               capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
    }
}
