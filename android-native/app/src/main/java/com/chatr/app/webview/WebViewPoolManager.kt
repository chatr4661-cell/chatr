package com.chatr.app.webview

import android.content.Context
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import com.chatr.app.config.SupabaseConfig
import java.util.concurrent.ConcurrentLinkedQueue
import javax.inject.Inject
import javax.inject.Singleton

/**
 * WebView Pool Manager
 * 
 * Maintains a pool of pre-initialized WebViews for faster loading
 * of web-based screens. Uses lazy initialization and recycling.
 */
@Singleton
class WebViewPoolManager @Inject constructor() {
    
    private val pool = ConcurrentLinkedQueue<WebView>()
    private val maxPoolSize = 3
    
    /**
     * Initialize the WebView pool with pre-warmed instances
     */
    fun initializePool(context: Context) {
        repeat(maxPoolSize) {
            val webView = createWebView(context)
            pool.offer(webView)
        }
    }
    
    /**
     * Get a WebView from the pool, or create a new one if empty
     */
    fun acquireWebView(context: Context): WebView {
        return pool.poll() ?: createWebView(context)
    }
    
    /**
     * Return a WebView to the pool for reuse
     */
    fun releaseWebView(webView: WebView) {
        webView.loadUrl("about:blank")
        webView.clearHistory()
        if (pool.size < maxPoolSize) {
            pool.offer(webView)
        } else {
            webView.destroy()
        }
    }
    
    /**
     * Pre-load the CHATR dashboard in a background WebView
     */
    fun preloadDashboard(context: Context) {
        val webView = acquireWebView(context)
        webView.loadUrl(SupabaseConfig.WEB_DASHBOARD_URL)
        pool.offer(webView)
    }
    
    /**
     * Clear all WebViews from the pool
     */
    fun clearPool() {
        while (pool.isNotEmpty()) {
            pool.poll()?.destroy()
        }
    }
    
    /**
     * Create a configured WebView instance
     */
    private fun createWebView(context: Context): WebView {
        return WebView(context).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                allowFileAccess = true
                allowContentAccess = true
                loadWithOverviewMode = true
                useWideViewPort = true
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                setSupportZoom(true)
                builtInZoomControls = true
                displayZoomControls = false
                
                // Enable service worker for offline support
                javaScriptCanOpenWindowsAutomatically = true
            }
            
            // Enable cookies for session persistence
            CookieManager.getInstance().apply {
                setAcceptCookie(true)
                setAcceptThirdPartyCookies(this@apply, true)
            }
            
            webViewClient = WebViewClient()
        }
    }
}
