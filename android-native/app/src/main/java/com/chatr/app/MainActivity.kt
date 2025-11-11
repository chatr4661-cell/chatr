package com.chatr.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.chatr.app.ui.navigation.ChatrNavHost
import com.chatr.app.ui.theme.ChatrTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Main entry point for Chatr+ native Android app
 * 
 * This activity hosts the Jetpack Compose UI and replaces
 * the previous Capacitor WebView-based hybrid approach.
 * 
 * Migration Status: Phase 2 - Parallel Compose Setup
 * - Native UI runs alongside existing Capacitor web assets
 * - Feature flag controlled: USE_NATIVE_UI (default: false)
 * - Gradual migration from hybrid to fully native
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Enable edge-to-edge display
        enableEdgeToEdge()
        
        setContent {
            ChatrTheme {
                // Main app surface with Material 3 theming
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    // Navigation host - manages all screen routing
                    ChatrNavHost()
                }
            }
        }
    }
    
    override fun onResume() {
        super.onResume()
        // Handle deep links from notifications
        handleDeepLink(intent)
    }
    
    private fun handleDeepLink(intent: android.content.Intent?) {
        intent?.extras?.let { bundle ->
            // Extract notification data
            val conversationId = bundle.getString("conversation_id")
            val callId = bundle.getString("call_id")
            
            // Navigate to appropriate screen
            // TODO: Implement deep link navigation
        }
    }
}
