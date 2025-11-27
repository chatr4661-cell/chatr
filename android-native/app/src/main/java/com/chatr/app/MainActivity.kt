package com.chatr.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.*
import com.chatr.app.ui.components.ChatrBottomNavigation
import com.chatr.app.ui.navigation.ChatrNavHost
import com.chatr.app.ui.screens.*
import com.chatr.app.ui.theme.ChatrTheme
import com.chatr.app.viewmodel.AuthState
import com.chatr.app.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private lateinit var webView: android.webkit.WebView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Setup WebView for bridge
        setupWebView()
        
        setContent {
            ChatrApp()
        }
    }
    
    private fun setupWebView() {
        webView = android.webkit.WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.addJavascriptInterface(
            WebAppInterface(this) { token -> 
                android.util.Log.d("ChatrAuth", "Token: $token") 
            }, 
            "Android"
        )
    }
}

@Composable
fun ChatrApp() {
    ChatrTheme {
        val navController = rememberNavController()
        val authViewModel: AuthViewModel = hiltViewModel()
        val authState by authViewModel.authState.collectAsState()
        val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
        
        // Determine start destination based on auth state
        val startDestination = when (authState) {
            is AuthState.Authenticated -> "chats"
            else -> "auth"
        }
        
        // Bottom navigation removed
        
        ChatrNavHost(
            navController = navController,
            startDestination = startDestination
        )
    }
}
