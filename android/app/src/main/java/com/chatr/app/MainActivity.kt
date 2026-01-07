package com.chatr.app

import android.Manifest
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.chatr.app.services.CallForegroundService
import com.getcapacitor.BridgeActivity

/**
 * CHATR+ MAIN ACTIVITY
 * 
 * Capacitor BridgeActivity with enhanced native-to-web communication.
 * 
 * Features:
 * - Handles incoming call answer/reject from native UI
 * - Direct reply from notifications
 * - Deep link navigation
 * - WebView JavaScript bridge for native features
 */
class MainActivity : BridgeActivity() {

    companion object {
        private const val TAG = "ChatrMainActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.i(TAG, "🚀 MainActivity onCreate")

        // Required for Android 13+: without this, call notifications (and fullscreen intents) will not show.
        ensureNotificationPermission()
        logFullScreenIntentStatus()

        // Handle intent that launched the activity
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        Log.i(TAG, "📥 MainActivity onNewIntent: ${intent?.action}")
        intent?.let { handleIntent(it) }
    }

    /**
     * Handles intents from notifications, incoming calls, and deep links
     */
    private fun handleIntent(intent: Intent) {
        val action = intent.getStringExtra("action")
        Log.i(TAG, "📋 Handling action: $action")

        when (action) {
            "answer_call" -> handleAnswerCall(intent)
            "reject_call" -> handleRejectCall(intent)
            "send_reply" -> handleSendReply(intent)
            else -> handleNavigateTo(intent)
        }
    }

    private fun handleAnswerCall(intent: Intent) {
        val callId = intent.getStringExtra("call_id") ?: return
        val callerId = intent.getStringExtra("caller_id") ?: ""
        val callerName = intent.getStringExtra("caller_name") ?: ""
        val callerAvatar = intent.getStringExtra("caller_avatar") ?: ""
        val callType = intent.getStringExtra("call_type") ?: "audio"
        val conversationId = intent.getStringExtra("conversation_id") ?: ""

        Log.i(TAG, "✅ Answering call via JavaScript: $callId")

        // Start foreground service for ongoing call
        val serviceIntent = Intent(this, CallForegroundService::class.java).apply {
            this.action = CallForegroundService.ACTION_START
            putExtra("call_type", callType)
            putExtra("partner_name", callerName)
        }
        startForegroundService(serviceIntent)

        // Inject JavaScript to answer the call
        val js = """
            (function() {
                console.log('📞 [Native Bridge] Answering call from native: $callId');
                
                // Dispatch custom event for GlobalCallListener
                window.dispatchEvent(new CustomEvent('nativeCallAction', {
                    detail: {
                        action: 'answer',
                        callId: '$callId',
                        callerId: '$callerId',
                        callerName: '$callerName',
                        callerAvatar: '$callerAvatar',
                        callType: '$callType',
                        conversationId: '$conversationId'
                    }
                }));
                
                // Also try direct Supabase update as backup
                if (window.supabase) {
                    window.supabase.from('calls')
                        .update({ status: 'active', started_at: new Date().toISOString() })
                        .eq('id', '$callId')
                        .then(result => console.log('Call answered via Supabase:', result));
                }
            })();
        """.trimIndent()

        executeJavaScript(js)
    }

    private fun handleRejectCall(intent: Intent) {
        val callId = intent.getStringExtra("call_id") ?: return

        Log.i(TAG, "❌ Rejecting call via JavaScript: $callId")

        val js = """
            (function() {
                console.log('📞 [Native Bridge] Rejecting call from native: $callId');
                
                window.dispatchEvent(new CustomEvent('nativeCallAction', {
                    detail: {
                        action: 'reject',
                        callId: '$callId'
                    }
                }));
                
                if (window.supabase) {
                    window.supabase.from('calls')
                        .update({ status: 'ended', ended_at: new Date().toISOString(), missed: false })
                        .eq('id', '$callId')
                        .then(result => console.log('Call rejected via Supabase:', result));
                }
            })();
        """.trimIndent()

        executeJavaScript(js)
    }

    private fun handleSendReply(intent: Intent) {
        val conversationId = intent.getStringExtra("conversation_id") ?: return
        val replyText = intent.getStringExtra("reply_text") ?: return

        Log.i(TAG, "💬 Sending reply via JavaScript: $replyText")

        // Escape the reply text for JavaScript
        val escapedText = replyText
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")

        val js = """
            (function() {
                console.log('💬 [Native Bridge] Sending reply from notification');
                
                window.dispatchEvent(new CustomEvent('nativeReply', {
                    detail: {
                        conversationId: '$conversationId',
                        message: '$escapedText'
                    }
                }));
            })();
        """.trimIndent()

        executeJavaScript(js)
    }

    private fun handleNavigateTo(intent: Intent) {
        val navigateTo = intent.getStringExtra("navigate_to")
        if (navigateTo != null) {
            Log.i(TAG, "🔗 Navigating to: $navigateTo")

            val js = """
                (function() {
                    console.log('🔗 [Native Bridge] Navigating to: $navigateTo');
                    
                    if (window.navigate) {
                        window.navigate('$navigateTo');
                    } else if (window.location) {
                        window.location.href = '$navigateTo';
                    }
                })();
            """.trimIndent()

            executeJavaScript(js)
        }
    }

    /**
     * Execute JavaScript in the WebView
     */
    private fun executeJavaScript(script: String) {
        runOnUiThread {
            try {
                bridge?.webView?.evaluateJavascript(script) { result ->
                    Log.d(TAG, "JavaScript result: $result")
                }
            } catch (e: Exception) {
                Log.e(TAG, "JavaScript execution failed", e)
            }
        }
    }

    /**
     * Ensure notification permission is granted (Android 13+).
     * Without this, call notifications cannot display a fullscreen UI.
     */
    private fun ensureNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return

        val granted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED

        if (!granted) {
            Log.w(TAG, "🔔 POST_NOTIFICATIONS not granted — requesting permission")
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                10001
            )
        }
    }

    /**
     * Android 14+ may require the user to allow Full-screen intents for the app.
     * We only log here to avoid hijacking navigation.
     */
    private fun logFullScreenIntentStatus() {
        if (Build.VERSION.SDK_INT < 34) return
        try {
            val nm = getSystemService(NotificationManager::class.java)
            if (nm != null && !nm.canUseFullScreenIntent()) {
                Log.w(TAG, "📵 Full-screen intents are DISABLED for this app in system settings")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read full-screen intent setting", e)
        }
    }

    /**
     * Stop call foreground service when call ends
     */
    fun stopCallService() {
        val intent = Intent(this, CallForegroundService::class.java).apply {
            action = CallForegroundService.ACTION_STOP
        }
        startService(intent)
    }

    override fun onDestroy() {
        Log.i(TAG, "🔴 MainActivity onDestroy")
        super.onDestroy()
    }
}
