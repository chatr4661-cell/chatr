package com.chatr.app.util

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName

/**
 * PERFORMANCE HELPER
 * Native-side performance optimizations for hybrid WebView
 * 
 * Integrates with web-side optimizations:
 * - src/utils/instantAppShell.ts
 * - src/utils/hybridAppOptimizations.ts
 * - src/utils/advancedCaching.ts
 */
object PerformanceHelper {
    
    private var preloadedWebView: WebView? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    
    /**
     * Performance metrics from web app
     */
    data class WebPerformanceMetrics(
        @SerializedName("domReady") val domReady: Long = 0,
        @SerializedName("loadComplete") val loadComplete: Long = 0,
        @SerializedName("firstPaint") val firstPaint: Long = 0
    )
    
    /**
     * App state from web app
     */
    data class WebAppState(
        @SerializedName("path") val path: String = "/",
        @SerializedName("isAuthenticated") val isAuthenticated: Boolean = false
    )
    
    /**
     * Preload WebView in background for instant display
     * Call this in Application.onCreate() for best results
     */
    fun preloadWebView(context: Context, url: String = "https://chatr.chat") {
        mainHandler.post {
            if (preloadedWebView == null) {
                preloadedWebView = createOptimizedWebView(context).apply {
                    loadUrl(url)
                }
            }
        }
    }
    
    /**
     * Get the preloaded WebView (or create new if not available)
     */
    fun getPreloadedWebView(context: Context): WebView {
        return preloadedWebView?.also { preloadedWebView = null }
            ?: createOptimizedWebView(context)
    }
    
    /**
     * Create a WebView with all performance optimizations applied
     */
    fun createOptimizedWebView(context: Context): WebView {
        return WebView(context).apply {
            // Hardware acceleration for smooth scrolling
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            
            settings.apply {
                // JavaScript required for React app
                javaScriptEnabled = true
                
                // DOM Storage for IndexedDB caching
                domStorageEnabled = true
                databaseEnabled = true
                
                // Cache settings
                cacheMode = WebSettings.LOAD_DEFAULT
                setAppCachePath(context.cacheDir.absolutePath)
                
                // Performance optimizations
                loadsImagesAutomatically = true
                blockNetworkImage = false
                
                // Allow mixed content (if needed)
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                
                // Viewport settings for mobile
                useWideViewPort = true
                loadWithOverviewMode = true
                
                // Custom User-Agent for WebView detection
                userAgentString = "$userAgentString chatr-android-native"
                
                // Media playback
                mediaPlaybackRequiresUserGesture = false
            }
        }
    }
    
    /**
     * Apply optimizations to existing WebView
     */
    fun optimizeWebView(webView: WebView) {
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            
            // Add chatr identifier to user agent
            if (!userAgentString.contains("chatr")) {
                userAgentString = "$userAgentString chatr-android-native"
            }
        }
    }
    
    /**
     * Get performance metrics from web app
     */
    fun getWebMetrics(webView: WebView, callback: (WebPerformanceMetrics) -> Unit) {
        webView.evaluateJavascript(
            "JSON.stringify(window.ChatrWeb?.getMetrics?.() || {})"
        ) { result ->
            try {
                val cleanResult = result.trim('"').replace("\\\"", "\"")
                val metrics = Gson().fromJson(cleanResult, WebPerformanceMetrics::class.java)
                callback(metrics ?: WebPerformanceMetrics())
            } catch (e: Exception) {
                callback(WebPerformanceMetrics())
            }
        }
    }
    
    /**
     * Get current app state from web app
     */
    fun getWebState(webView: WebView, callback: (WebAppState) -> Unit) {
        webView.evaluateJavascript(
            "JSON.stringify(window.ChatrWeb?.getState?.() || {})"
        ) { result ->
            try {
                val cleanResult = result.trim('"').replace("\\\"", "\"")
                val state = Gson().fromJson(cleanResult, WebAppState::class.java)
                callback(state ?: WebAppState())
            } catch (e: Exception) {
                callback(WebAppState())
            }
        }
    }
    
    /**
     * Navigate web app to route
     */
    fun navigateWeb(webView: WebView, route: String) {
        webView.evaluateJavascript(
            "window.ChatrWeb?.navigate?.('$route')",
            null
        )
    }
    
    /**
     * Inject auth token into web app
     */
    fun injectAuthToken(webView: WebView, token: String) {
        webView.evaluateJavascript(
            "window.ChatrWeb?.setAuthToken?.('$token')",
            null
        )
    }
    
    /**
     * Check if web app is ready
     */
    fun isWebReady(webView: WebView, callback: (Boolean) -> Unit) {
        webView.evaluateJavascript(
            "typeof window.ChatrWeb !== 'undefined'"
        ) { result ->
            callback(result == "true")
        }
    }
    
    /**
     * Clear all caches in web app
     */
    fun clearWebCaches(webView: WebView) {
        webView.evaluateJavascript(
            """
            (async () => {
                if (window.clearAllCaches) await window.clearAllCaches();
                localStorage.clear();
                sessionStorage.clear();
            })()
            """.trimIndent(),
            null
        )
        webView.clearCache(true)
    }
    
    /**
     * Log performance metrics
     */
    fun logPerformance(metrics: WebPerformanceMetrics) {
        android.util.Log.d("PerformanceHelper", """
            |Web Performance Metrics:
            |  - DOM Ready: ${metrics.domReady}ms
            |  - Load Complete: ${metrics.loadComplete}ms
            |  - First Paint: ${metrics.firstPaint}ms
        """.trimMargin())
    }
}
