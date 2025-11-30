package com.chatr.app

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.webkit.JavascriptInterface
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat

class WebAppInterface(
    private val context: Context,
    private val onAuthSuccess: (token: String?) -> Unit
) {
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
}
