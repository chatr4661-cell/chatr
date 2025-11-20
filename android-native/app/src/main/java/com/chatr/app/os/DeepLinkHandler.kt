package com.chatr.app.os

import android.content.Intent
import android.net.Uri
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * CHATR OS - Deep Link Handler Plugin
 * 
 * Handles deep linking on Android for chatr:// protocol
 * Forwards deep links to the web layer (DeepLinkManager.ts)
 * 
 * Week 1 - Core OS Infrastructure
 */
@CapacitorPlugin(name = "DeepLinkHandler")
class DeepLinkHandler : Plugin() {

    /**
     * Called when the app is launched with a deep link
     * This is called from MainActivity
     */
    fun handleIntent(intent: Intent?) {
        intent?.data?.let { uri ->
            if (uri.scheme == "chatr") {
                val deepLink = uri.toString()
                notifyWebLayer(deepLink)
            }
        }
    }

    /**
     * Notify the web layer about a deep link
     */
    private fun notifyWebLayer(url: String) {
        val ret = JSObject()
        ret.put("url", url)
        notifyListeners("deepLinkReceived", ret)
    }

    /**
     * Check if there's a pending deep link
     * Called from web layer on initialization
     */
    @PluginMethod
    fun getPendingDeepLink(call: PluginCall) {
        val intent = activity.intent
        val uri = intent?.data
        
        if (uri != null && uri.scheme == "chatr") {
            val ret = JSObject()
            ret.put("url", uri.toString())
            call.resolve(ret)
        } else {
            call.resolve()
        }
    }

    /**
     * Register a custom deep link handler
     */
    @PluginMethod
    fun registerDeepLinkScheme(call: PluginCall) {
        val scheme = call.getString("scheme") ?: "chatr"
        // Android automatically handles this via AndroidManifest.xml
        call.resolve()
    }
}
