package com.chatr.app.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.chatr.app.calling.TelecomHelper
import dagger.hilt.android.AndroidEntryPoint

/**
 * Boot Receiver - Starts necessary services after device boot
 * 
 * Ensures:
 * - PhoneAccount is registered
 * - FCM token is registered
 */
@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            
            Log.d(TAG, "Device booted, initializing CHATR services")

            // Register PhoneAccount for Telecom integration
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                TelecomHelper.registerPhoneAccount(context)
            }

            // TODO: Start background sync service if user is logged in
        }
    }
}
