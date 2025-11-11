package com.chatr.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import androidx.activity.compose.setContent
import com.chatr.app.ui.theme.ChatrTheme
import com.chatr.app.ui.navigation.ChatrNavHost

/**
 * Main entry point for Chatr+ native Android app
 * 
 * Uses BridgeActivity to preserve Capacitor bridge functionality
 * during the hybrid-to-native migration. This allows existing
 * Capacitor plugins to continue working while we incrementally
 * migrate screens to Jetpack Compose.
 * 
 * Migration Status: Phase 2 - Parallel Compose Setup
 * - Compose UI runs alongside Capacitor bridge
 * - Gradual migration from hybrid to fully native
 */
class MainActivity : BridgeActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Launch Compose UI while preserving Capacitor bridge
        setContent {
            ChatrTheme {
                ChatrNavHost()
            }
        }
    }
}
