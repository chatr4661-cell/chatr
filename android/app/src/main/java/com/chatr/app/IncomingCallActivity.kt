package com.chatr.app

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.bumptech.glide.Glide
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL

/**
 * FULLSCREEN INCOMING CALL ACTIVITY
 * 
 * Shows a beautiful fullscreen call UI that appears over the lock screen
 * when the app receives an incoming call notification.
 * 
 * Features:
 * - Shows over lock screen
 * - Turns on screen
 * - Plays ringtone
 * - Haptic vibration
 * - Answer/Reject buttons
 * - Swipe-to-answer gesture
 * - Auto-timeout after 60 seconds
 */
class IncomingCallActivity : ComponentActivity() {

    companion object {
        private const val TAG = "IncomingCallActivity"
        private const val CALL_TIMEOUT_MS = 60000L // 60 seconds
    }

    private var callId: String = ""
    private var callerId: String = ""
    private var callerName: String = ""
    private var callerAvatar: String? = null
    private var callType: String = "audio"
    private var conversationId: String = ""

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var timeoutJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Main)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.i(TAG, "🔔 IncomingCallActivity onCreate")

        // Setup fullscreen over lock screen
        setupFullscreenOverLockscreen()

        // Extract call data
        extractCallData()

        // Set content view
        setContentView(R.layout.activity_incoming_call)

        // Setup UI
        setupUI()

        // Start ringtone and vibration
        startRinging()

        // Set timeout to auto-end
        setupTimeout()
    }

    private fun setupFullscreenOverLockscreen() {
        // Show over lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        // Make fullscreen
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).let { controller ->
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    private fun extractCallData() {
        callId = intent.getStringExtra("call_id") ?: ""
        callerId = intent.getStringExtra("caller_id") ?: ""
        callerName = intent.getStringExtra("caller_name") ?: "Unknown"
        callerAvatar = intent.getStringExtra("caller_avatar")
        callType = intent.getStringExtra("call_type") ?: "audio"
        conversationId = intent.getStringExtra("conversation_id") ?: ""

        Log.i(TAG, "📞 Call from: $callerName ($callerId), type: $callType")
    }

    private fun setupUI() {
        // Set caller info
        findViewById<TextView>(R.id.callerNameText)?.text = callerName
        findViewById<TextView>(R.id.callTypeText)?.text = 
            if (callType == "video") "📹 Incoming Video Call" else "📞 Incoming Voice Call"

        // Load avatar
        val avatarView = findViewById<ImageView>(R.id.callerAvatarImage)
        if (!callerAvatar.isNullOrEmpty() && avatarView != null) {
            scope.launch(Dispatchers.IO) {
                try {
                    // Simple image loading
                    val url = URL(callerAvatar)
                    val connection = url.openConnection() as HttpURLConnection
                    connection.doInput = true
                    connection.connect()
                    val input = connection.inputStream
                    val bitmap = android.graphics.BitmapFactory.decodeStream(input)
                    
                    launch(Dispatchers.Main) {
                        avatarView.setImageBitmap(bitmap)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to load avatar", e)
                }
            }
        }

        // Answer button
        findViewById<ImageButton>(R.id.answerButton)?.setOnClickListener {
            answerCall()
        }

        // Reject button
        findViewById<ImageButton>(R.id.rejectButton)?.setOnClickListener {
            rejectCall()
        }
    }

    private fun startRinging() {
        // Start vibration
        try {
            val pattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
            
            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Vibration failed", e)
        }

        // Play ringtone
        try {
            val ringtoneUri = try {
                Uri.parse("android.resource://${packageName}/raw/ringtone")
            } catch (e: Exception) {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            }

            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(this@IncomingCallActivity, ringtoneUri)
                isLooping = true
                prepare()
                start()
            }
            Log.d(TAG, "🔔 Ringtone started")
        } catch (e: Exception) {
            Log.e(TAG, "Ringtone failed", e)
        }
    }

    private fun stopRinging() {
        try {
            vibrator?.cancel()
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
            Log.d(TAG, "🔕 Ringing stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping ringing", e)
        }
    }

    private fun setupTimeout() {
        timeoutJob = scope.launch {
            delay(CALL_TIMEOUT_MS)
            Log.i(TAG, "⏰ Call timeout - treating as missed")
            missedCall()
        }
    }

    private fun answerCall() {
        Log.i(TAG, "✅ Call ANSWERED: $callId")
        
        stopRinging()
        timeoutJob?.cancel()

        // Cancel the notification
        val notificationManager = getSystemService(android.app.NotificationManager::class.java)
        notificationManager?.cancel(com.chatr.app.services.ChatrFirebaseMessagingService.CALL_NOTIFICATION_ID)

        // Open MainActivity with call data
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", "answer_call")
            putExtra("call_id", callId)
            putExtra("caller_id", callerId)
            putExtra("caller_name", callerName)
            putExtra("caller_avatar", callerAvatar)
            putExtra("call_type", callType)
            putExtra("conversation_id", conversationId)
        }
        startActivity(intent)
        
        finish()
    }

    private fun rejectCall() {
        Log.i(TAG, "❌ Call REJECTED: $callId")
        
        stopRinging()
        timeoutJob?.cancel()

        // Cancel the notification
        val notificationManager = getSystemService(android.app.NotificationManager::class.java)
        notificationManager?.cancel(com.chatr.app.services.ChatrFirebaseMessagingService.CALL_NOTIFICATION_ID)

        // Send reject action to WebView
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", "reject_call")
            putExtra("call_id", callId)
        }
        startActivity(intent)
        
        finish()
    }

    private fun missedCall() {
        Log.i(TAG, "📵 Call MISSED: $callId")
        
        stopRinging()

        // Cancel the notification
        val notificationManager = getSystemService(android.app.NotificationManager::class.java)
        notificationManager?.cancel(com.chatr.app.services.ChatrFirebaseMessagingService.CALL_NOTIFICATION_ID)

        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopRinging()
        timeoutJob?.cancel()
    }

    override fun onBackPressed() {
        // Prevent back button from closing call screen
        // User must answer or reject
    }
}
