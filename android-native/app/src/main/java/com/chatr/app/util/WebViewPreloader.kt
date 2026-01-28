package com.chatr.app.util

import android.app.Application
import android.os.Handler
import android.os.Looper
import android.webkit.WebView

/**
 * WEBVIEW PRELOADER
 * Preloads WebView in background during app startup for instant hybrid loading
 * 
 * Usage in Application class:
 * ```kotlin
 * class ChatrApplication : Application() {
 *     override fun onCreate() {
 *         super.onCreate()
 *         WebViewPreloader.init(this)
 *     }
 * }
 * ```
 */
object WebViewPreloader {
    
    private var preloadedWebView: WebView? = null
    private var isInitialized = false
    
    // Default URL to preload
    private const val DEFAULT_URL = "https://chatr.chat"
    
    /**
     * Initialize WebView preloading
     * Call this in Application.onCreate() for best startup performance
     */
    fun init(application: Application, url: String = DEFAULT_URL) {
        if (isInitialized) return
        isInitialized = true
        
        // Delay preload slightly to not block app startup
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                preloadedWebView = PerformanceHelper.createOptimizedWebView(application).apply {
                    loadUrl(url)
                }
                android.util.Log.d("WebViewPreloader", "WebView preloaded successfully")
            } catch (e: Exception) {
                android.util.Log.e("WebViewPreloader", "Failed to preload WebView", e)
            }
        }, 500) // 500ms delay to prioritize main UI thread
    }
    
    /**
     * Get the preloaded WebView
     * Returns the preloaded instance and clears it (one-time use)
     * If no preloaded WebView available, returns null
     */
    fun getPreloaded(): WebView? {
        return preloadedWebView?.also { 
            preloadedWebView = null 
        }
    }
    
    /**
     * Check if a preloaded WebView is available
     */
    fun hasPreloaded(): Boolean = preloadedWebView != null
    
    /**
     * Clean up preloaded WebView (call in Application.onTerminate or when not needed)
     */
    fun cleanup() {
        preloadedWebView?.destroy()
        preloadedWebView = null
        isInitialized = false
    }
}
