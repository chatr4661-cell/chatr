package com.chatr.app.ui.screens

import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.chatr.app.config.SupabaseConfig
import com.chatr.app.webview.WebViewBridgeManager
import com.chatr.app.webview.WebViewPoolManager

/**
 * WebView Screen Component
 * 
 * Loads CHATR web pages with session injection
 * Used for advanced features not yet migrated to native
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WebViewScreen(
    navController: NavController,
    path: String = "",
    title: String = "CHATR",
    webViewPoolManager: WebViewPoolManager,
    webViewBridgeManager: WebViewBridgeManager
) {
    val context = LocalContext.current
    var isLoading by remember { mutableStateOf(true) }
    var webView by remember { mutableStateOf<WebView?>(null) }
    
    DisposableEffect(Unit) {
        val wv = webViewPoolManager.acquireWebView(context)
        webViewBridgeManager.configureWebView(wv)
        webView = wv
        
        onDispose {
            webView?.let { webViewPoolManager.releaseWebView(it) }
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { webView?.reload() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh"
                        )
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            webView?.let { wv ->
                AndroidView(
                    factory = { wv },
                    modifier = Modifier.fillMaxSize(),
                    update = { view ->
                        view.webViewClient = object : WebViewClient() {
                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)
                                isLoading = false
                            }
                        }
                        
                        val url = "${SupabaseConfig.WEB_DASHBOARD_URL}$path"
                        if (view.url != url) {
                            view.loadUrl(url)
                        }
                    }
                )
            }
            
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            }
        }
    }
}

/**
 * Chat Thread WebView Screen
 * 
 * Loads full chat thread view from web
 */
@Composable
fun ChatThreadWebView(
    navController: NavController,
    chatId: String,
    webViewPoolManager: WebViewPoolManager,
    webViewBridgeManager: WebViewBridgeManager
) {
    WebViewScreen(
        navController = navController,
        path = "/chat/$chatId",
        title = "Chat",
        webViewPoolManager = webViewPoolManager,
        webViewBridgeManager = webViewBridgeManager
    )
}

/**
 * Profile WebView Screen
 * 
 * Loads advanced profile view from web
 */
@Composable
fun ProfileWebView(
    navController: NavController,
    userId: String,
    webViewPoolManager: WebViewPoolManager,
    webViewBridgeManager: WebViewBridgeManager
) {
    WebViewScreen(
        navController = navController,
        path = "/profile/$userId",
        title = "Profile",
        webViewPoolManager = webViewPoolManager,
        webViewBridgeManager = webViewBridgeManager
    )
}
