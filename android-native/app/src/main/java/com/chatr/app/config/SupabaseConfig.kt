package com.chatr.app.config

/**
 * =========================================
 * CHATR+ PLUG & PLAY CONFIGURATION
 * =========================================
 * 
 * INSTRUCTIONS:
 * 1. Enter your Supabase URL below
 * 2. Enter your Supabase Anon Key below
 * 3. Build and Run the app in Android Studio
 * 
 * That's it! No other changes required.
 */
object SupabaseConfig {
    
    // ============================================
    // 👇 ENTER YOUR SUPABASE CREDENTIALS HERE 👇
    // ============================================
    
    const val SUPABASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co"
    const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw"
    
    // ============================================
    // 👆 ENTER YOUR SUPABASE CREDENTIALS ABOVE 👆
    // ============================================
    
    // Edge Functions Base URL
    val FUNCTIONS_URL: String
        get() = "$SUPABASE_URL/functions/v1"
    
    // Storage Base URL
    val STORAGE_URL: String
        get() = "$SUPABASE_URL/storage/v1"
    
    // Realtime Base URL
    val REALTIME_URL: String
        get() = SUPABASE_URL.replace("https://", "wss://") + "/realtime/v1"
    
    // Web Dashboard URL (for WebView screens)
    const val WEB_DASHBOARD_URL = "https://chatr.chat"
    
    // Firebase config (auto-configured via google-services.json)
    // No manual setup required if google-services.json is placed in app/ folder
    
    /**
     * Check if Supabase is configured
     */
    fun isConfigured(): Boolean {
        return SUPABASE_URL.isNotBlank() && 
               SUPABASE_ANON_KEY.isNotBlank() &&
               SUPABASE_URL != "YOUR_SUPABASE_URL_HERE" &&
               SUPABASE_ANON_KEY != "YOUR_SUPABASE_ANON_KEY_HERE"
    }
}
