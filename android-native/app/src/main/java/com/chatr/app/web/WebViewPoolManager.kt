package com.chatr.app.web

import android.annotation.SuppressLint
import android.content.Context
import android.net.Uri
import android.os.Build
import android.webkit.*
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.compose.ui.viewinterop.AndroidView
import java.util.concurrent.ConcurrentLinkedQueue
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WebViewPoolManager @Inject constructor(
    private val context: Context
) {
    private val pool = ConcurrentLinkedQueue<WebView>()
    private val maxPoolSize = 3
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    init {
        // Pre-warm pool
        repeat(maxPoolSize) {
            pool.offer(createWebView())
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView(): WebView {
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
                builtInZoomControls = false
                displayZoomControls = false
                setSupportZoom(false)
                mediaPlaybackRequiresUserGesture = false
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                
                // Enable geolocation
                setGeolocationEnabled(true)
                
                // User Agent
                userAgentString = "$userAgentString CHATR-Android/1.0"
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    safeBrowsingEnabled = true
                }
            }
            
            // Enable cookies
            CookieManager.getInstance().apply {
                setAcceptCookie(true)
                setAcceptThirdPartyCookies(this@apply, true)
            }
            
            // Clear cache on creation for fresh start
            clearCache(false)
        }
    }

    fun acquire(): WebView {
        return pool.poll() ?: createWebView()
    }

    fun release(webView: WebView) {
        webView.apply {
            stopLoading()
            loadUrl("about:blank")
            clearHistory()
        }
        
        if (pool.size < maxPoolSize) {
            pool.offer(webView)
        } else {
            webView.destroy()
        }
    }

    fun setFileUploadCallback(callback: ValueCallback<Array<Uri>>?) {
        fileUploadCallback = callback
    }

    fun handleFileUploadResult(uris: Array<Uri>?) {
        fileUploadCallback?.onReceiveValue(uris)
        fileUploadCallback = null
    }

    fun destroy() {
        pool.forEach { it.destroy() }
        pool.clear()
    }
}

@Composable
fun WebShell(
    url: String,
    poolManager: WebViewPoolManager,
    sessionToken: String? = null,
    onPageFinished: ((String?) -> Unit)? = null,
    onError: ((String) -> Unit)? = null
) {
    var webView by remember { mutableStateOf<WebView?>(null) }
    
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        poolManager.handleFileUploadResult(uris.toTypedArray())
    }

    DisposableEffect(Unit) {
        webView = poolManager.acquire()
        onDispose {
            webView?.let { poolManager.release(it) }
        }
    }

    webView?.let { wv ->
        AndroidView(
            factory = { wv },
            update = { view ->
                view.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        
                        // Inject session token if available
                        sessionToken?.let { token ->
                            view?.evaluateJavascript(
                                """
                                (function() {
                                    localStorage.setItem('supabase.auth.token', '$token');
                                    window.dispatchEvent(new Event('chatr-session-ready'));
                                })();
                                """.trimIndent(),
                                null
                            )
                        }
                        
                        onPageFinished?.invoke(url)
                    }

                    override fun onReceivedError(
                        view: WebView?,
                        request: WebResourceRequest?,
                        error: WebResourceError?
                    ) {
                        super.onReceivedError(view, request, error)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            onError?.invoke(error?.description?.toString() ?: "Unknown error")
                        }
                    }
                }

                view.webChromeClient = object : WebChromeClient() {
                    override fun onShowFileChooser(
                        webView: WebView?,
                        filePathCallback: ValueCallback<Array<Uri>>?,
                        fileChooserParams: FileChooserParams?
                    ): Boolean {
                        poolManager.setFileUploadCallback(filePathCallback)
                        filePickerLauncher.launch("*/*")
                        return true
                    }

                    override fun onGeolocationPermissionsShowPrompt(
                        origin: String?,
                        callback: GeolocationPermissions.Callback?
                    ) {
                        callback?.invoke(origin, true, false)
                    }

                    override fun onPermissionRequest(request: PermissionRequest?) {
                        request?.grant(request.resources)
                    }
                }

                view.loadUrl(url)
            }
        )
    }
}
