package com.chatr.app.webview

import android.annotation.SuppressLint
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.chatr.app.config.SupabaseConfig
import io.github.jan.supabase.gotrue.Auth
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * WebView Bridge Manager
 * 
 * Handles communication between native app and WebView
 * Injects auth session and handles callbacks
 */
@Singleton
class WebViewBridgeManager @Inject constructor(
    private val auth: Auth
) {
    
    /**
     * Configure WebView with auth session injection
     */
    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    fun configureWebView(webView: WebView, onMessage: (String) -> Unit = {}) {
        webView.addJavascriptInterface(
            WebViewBridge(onMessage),
            "ChatrNative"
        )
        
        // Inject session after page loads
        webView.webViewClient = object : android.webkit.WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectSession(webView)
            }
        }
    }
    
    /**
     * Load CHATR web page with proper session
     */
    fun loadChatrPage(webView: WebView, path: String = "") {
        val url = "${SupabaseConfig.WEB_DASHBOARD_URL}$path"
        webView.loadUrl(url)
    }
    
    /**
     * Inject auth session into WebView
     */
    private fun injectSession(webView: WebView) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val session = auth.currentSessionOrNull()
                session?.let {
                    val accessToken = it.accessToken
                    val refreshToken = it.refreshToken
                    
                    val js = """
                        (function() {
                            try {
                                const session = {
                                    access_token: '$accessToken',
                                    refresh_token: '$refreshToken',
                                    expires_at: ${it.expiresAt?.epochSeconds ?: 0},
                                    user: ${it.user?.let { user -> 
                                        "{id: '${user.id}', email: '${user.email}'}" 
                                    } ?: "null"}
                                };
                                
                                localStorage.setItem('supabase.auth.token', JSON.stringify({
                                    currentSession: session,
                                    expiresAt: ${it.expiresAt?.epochSeconds ?: 0}
                                }));
                                
                                if (window.dispatchEvent) {
                                    window.dispatchEvent(new CustomEvent('chatr:session_injected', { detail: session }));
                                }
                                
                                console.log('CHATR: Session injected successfully');
                            } catch (e) {
                                console.error('CHATR: Failed to inject session', e);
                            }
                        })();
                    """.trimIndent()
                    
                    webView.evaluateJavascript(js, null)
                }
            } catch (e: Exception) {
                android.util.Log.e("WebViewBridge", "Failed to inject session", e)
            }
        }
    }
    
    /**
     * JavaScript interface for WebView communication
     */
    inner class WebViewBridge(private val onMessage: (String) -> Unit) {
        
        @JavascriptInterface
        fun postMessage(message: String) {
            onMessage(message)
        }
        
        @JavascriptInterface
        fun getSupabaseUrl(): String = SupabaseConfig.SUPABASE_URL
        
        @JavascriptInterface
        fun getSupabaseKey(): String = SupabaseConfig.SUPABASE_ANON_KEY
        
        @JavascriptInterface
        fun isNativeApp(): Boolean = true
        
        @JavascriptInterface
        fun getAppVersion(): String = "1.0.0"
        
        @JavascriptInterface
        fun log(message: String) {
            android.util.Log.d("WebViewBridge", message)
        }
    }
}
