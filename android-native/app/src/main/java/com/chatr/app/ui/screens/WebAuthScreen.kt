package com.chatr.app.ui.screens

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.util.Log
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.chatr.app.config.SupabaseConfig
import com.chatr.app.viewmodel.AuthViewModel
import kotlinx.coroutines.delay

private const val TAG = "WebAuthScreen"
private const val AUTH_URL = "https://www.chatr.chat/auth"

/**
 * Web Authentication Screen - WebView-based authentication
 * Opens chatr.chat/auth and captures session after successful login
 */
@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebAuthScreen(
    navController: NavController,
    viewModel: AuthViewModel = hiltViewModel(),
    onAuthSuccess: () -> Unit = {}
) {
    var isLoading by remember { mutableStateOf(true) }
    var webView by remember { mutableStateOf<WebView?>(null) }
    var currentUrl by remember { mutableStateOf(AUTH_URL) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var authCompleted by remember { mutableStateOf(false) }
    
    // Check for auth success by monitoring URL changes
    LaunchedEffect(currentUrl) {
        Log.d(TAG, "URL changed to: $currentUrl")
        
        // If we navigated away from auth page to main app, auth was successful
        if (currentUrl.contains("/chat") || 
            currentUrl.contains("/home") || 
            currentUrl.contains("/app") ||
            (currentUrl.contains("chatr.chat") && !currentUrl.contains("/auth"))) {
            
            Log.d(TAG, "Auth appears successful, extracting session...")
            delay(1000) // Give time for session to be stored
            
            // Extract session from WebView
            webView?.let { wv ->
                extractSessionFromWebView(wv) { accessToken, refreshToken, userId ->
                    if (accessToken != null && userId != null) {
                        Log.d(TAG, "Session extracted successfully")
                        viewModel.handleWebAuthSuccess(accessToken, refreshToken, userId)
                        authCompleted = true
                    }
                }
            }
        }
    }
    
    // Navigate when auth is complete
    LaunchedEffect(authCompleted) {
        if (authCompleted) {
            onAuthSuccess()
            navController.navigate("chats") {
                popUpTo("auth") { inclusive = true }
            }
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sign In") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { 
                        webView?.reload()
                    }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            AndroidView(
                factory = { context ->
                    WebView(context).apply {
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.databaseEnabled = true
                        settings.setSupportZoom(false)
                        settings.builtInZoomControls = false
                        settings.userAgentString = "ChatrAndroid/1.0 " + settings.userAgentString
                        
                        // Enable cookies
                        CookieManager.getInstance().setAcceptCookie(true)
                        CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                        
                        // Add JavaScript interface to receive auth data
                        addJavascriptInterface(
                            AuthJsInterface { accessToken, refreshToken, userId ->
                                Log.d(TAG, "Received auth from JS interface")
                                viewModel.handleWebAuthSuccess(accessToken, refreshToken, userId)
                                authCompleted = true
                            },
                            "AndroidAuth"
                        )
                        
                        webViewClient = object : WebViewClient() {
                            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                                super.onPageStarted(view, url, favicon)
                                isLoading = true
                                url?.let { currentUrl = it }
                                Log.d(TAG, "Page started: $url")
                            }
                            
                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)
                                isLoading = false
                                Log.d(TAG, "Page finished: $url")
                                
                                // Inject JS to detect auth changes
                                view?.evaluateJavascript("""
                                    (function() {
                                        // Check localStorage for Supabase session
                                        function checkAuth() {
                                            try {
                                                var keys = Object.keys(localStorage);
                                                for (var i = 0; i < keys.length; i++) {
                                                    if (keys[i].includes('supabase') && keys[i].includes('auth')) {
                                                        var data = localStorage.getItem(keys[i]);
                                                        if (data) {
                                                            var parsed = JSON.parse(data);
                                                            if (parsed.access_token && parsed.user) {
                                                                AndroidAuth.onAuthSuccess(
                                                                    parsed.access_token,
                                                                    parsed.refresh_token || '',
                                                                    parsed.user.id
                                                                );
                                                                return true;
                                                            }
                                                        }
                                                    }
                                                }
                                            } catch(e) {
                                                console.log('Auth check error:', e);
                                            }
                                            return false;
                                        }
                                        
                                        // Check immediately
                                        if (checkAuth()) return;
                                        
                                        // Also monitor storage changes
                                        window.addEventListener('storage', function(e) {
                                            if (e.key && e.key.includes('supabase')) {
                                                checkAuth();
                                            }
                                        });
                                        
                                        // Periodic check for auth (in case storage event doesn't fire)
                                        var checkInterval = setInterval(function() {
                                            if (checkAuth()) {
                                                clearInterval(checkInterval);
                                            }
                                        }, 2000);
                                        
                                        // Clear interval after 2 minutes
                                        setTimeout(function() {
                                            clearInterval(checkInterval);
                                        }, 120000);
                                    })();
                                """.trimIndent(), null)
                            }
                            
                            override fun shouldOverrideUrlLoading(
                                view: WebView?,
                                request: WebResourceRequest?
                            ): Boolean {
                                val url = request?.url?.toString()
                                Log.d(TAG, "Should override URL: $url")
                                
                                // Stay within chatr.chat domain
                                if (url?.contains("chatr.chat") == true) {
                                    return false
                                }
                                
                                // Block external URLs
                                return true
                            }
                        }
                        
                        loadUrl(AUTH_URL)
                        webView = this
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
            
            // Loading indicator
            if (isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                )
            }
            
            // Error message
            errorMessage?.let { error ->
                Card(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp)
                ) {
                    Text(
                        text = error,
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

/**
 * JavaScript interface to receive auth data from WebView
 */
class AuthJsInterface(
    private val onSuccess: (accessToken: String, refreshToken: String?, userId: String) -> Unit
) {
    @JavascriptInterface
    fun onAuthSuccess(accessToken: String, refreshToken: String, userId: String) {
        Log.d("AuthJsInterface", "Auth success received: userId=$userId")
        onSuccess(accessToken, refreshToken.takeIf { it.isNotEmpty() }, userId)
    }
}

/**
 * Extract session from WebView localStorage
 */
private fun extractSessionFromWebView(
    webView: WebView,
    callback: (accessToken: String?, refreshToken: String?, userId: String?) -> Unit
) {
    webView.evaluateJavascript("""
        (function() {
            try {
                var keys = Object.keys(localStorage);
                for (var i = 0; i < keys.length; i++) {
                    if (keys[i].includes('supabase') && keys[i].includes('auth')) {
                        var data = localStorage.getItem(keys[i]);
                        if (data) {
                            var parsed = JSON.parse(data);
                            if (parsed.access_token && parsed.user) {
                                return JSON.stringify({
                                    accessToken: parsed.access_token,
                                    refreshToken: parsed.refresh_token || '',
                                    userId: parsed.user.id
                                });
                            }
                        }
                    }
                }
            } catch(e) {
                console.log('Extract error:', e);
            }
            return null;
        })();
    """.trimIndent()) { result ->
        try {
            if (result != null && result != "null") {
                val json = result.trim('"').replace("\\\"", "\"")
                val parsed = org.json.JSONObject(json)
                callback(
                    parsed.optString("accessToken"),
                    parsed.optString("refreshToken"),
                    parsed.optString("userId")
                )
            } else {
                callback(null, null, null)
            }
        } catch (e: Exception) {
            Log.e("WebAuthScreen", "Failed to parse session", e)
            callback(null, null, null)
        }
    }
}
