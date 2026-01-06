package com.chatr.app.presentation.calling

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chatr.app.calling.service.CallForegroundService
import com.chatr.app.presentation.theme.ChatrTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Native Call Activity - Full-screen call UI
 * 
 * Shows:
 * - Incoming call screen with Answer/Reject for ringing calls
 * - Active call screen for connected calls
 */
@AndroidEntryPoint
class CallActivity : ComponentActivity() {

    private var callId: String = ""
    private var callerName: String = ""
    private var callerPhone: String = ""
    private var callerAvatar: String? = null
    private var isVideo: Boolean = false
    private var isIncoming: Boolean = false
    
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Show over lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        callId = intent.getStringExtra("extra_call_id") ?: ""
        callerName = intent.getStringExtra("extra_caller_name") ?: "Unknown"
        callerPhone = intent.getStringExtra("extra_caller_phone") ?: ""
        callerAvatar = intent.getStringExtra("extra_caller_avatar")
        isVideo = intent.getBooleanExtra("extra_is_video", false)
        isIncoming = intent.getBooleanExtra("is_incoming", false)

        // Start ringtone and vibration for incoming calls
        if (isIncoming) {
            startRingtone()
            startVibration()
        }

        // Start foreground service
        CallForegroundService.start(this, callId, callerName, callerPhone, isVideo, isIncoming)

        setContent {
            ChatrTheme {
                if (isIncoming) {
                    IncomingCallScreen(
                        callerName = callerName,
                        callerPhone = callerPhone,
                        isVideo = isVideo,
                        onAnswer = { answerCall() },
                        onReject = { rejectCall() }
                    )
                } else {
                    ActiveCallScreen(
                        callerName = callerName,
                        callerPhone = callerPhone,
                        isVideo = isVideo,
                        onEndCall = { endCall() }
                    )
                }
            }
        }
    }
    
    private fun startRingtone() {
        try {
            val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(this@CallActivity, ringtoneUri)
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            android.util.Log.e("CallActivity", "Failed to start ringtone", e)
        }
    }
    
    private fun startVibration() {
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        
        val pattern = longArrayOf(0, 500, 200, 500, 200, 500)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(pattern, 0)
        }
    }
    
    private fun stopRingtoneAndVibration() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        vibrator?.cancel()
    }

    private fun answerCall() {
        stopRingtoneAndVibration()
        isIncoming = false
        // The TelecomManager connection.onAnswer() will handle the rest
        // Just update UI to show active call
        setContent {
            ChatrTheme {
                ActiveCallScreen(
                    callerName = callerName,
                    callerPhone = callerPhone,
                    isVideo = isVideo,
                    onEndCall = { endCall() }
                )
            }
        }
    }
    
    private fun rejectCall() {
        stopRingtoneAndVibration()
        CallForegroundService.stop(this)
        finish()
    }

    private fun endCall() {
        stopRingtoneAndVibration()
        CallForegroundService.stop(this)
        finish()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopRingtoneAndVibration()
    }
}

@Composable
fun IncomingCallScreen(
    callerName: String,
    callerPhone: String,
    isVideo: Boolean,
    onAnswer: () -> Unit,
    onReject: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF1A1A2E)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(80.dp))
            
            // Caller info
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                // Avatar placeholder
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF6C63FF)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = callerName.firstOrNull()?.uppercase() ?: "?",
                        fontSize = 48.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Text(
                    text = callerName,
                    style = MaterialTheme.typography.headlineLarge,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = callerPhone,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White.copy(alpha = 0.7f)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (isVideo) "ChatrPlus Video Call" else "ChatrPlus Voice Call",
                    style = MaterialTheme.typography.labelLarge,
                    color = Color(0xFF6C63FF)
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Answer/Reject buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                // Reject button
                IconButton(
                    onClick = onReject,
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFFF4444))
                ) {
                    Icon(
                        imageVector = Icons.Default.CallEnd,
                        contentDescription = "Reject",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }
                
                // Answer button
                IconButton(
                    onClick = onAnswer,
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF4CAF50))
                ) {
                    Icon(
                        imageVector = Icons.Default.Call,
                        contentDescription = "Answer",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}

@Composable
fun ActiveCallScreen(
    callerName: String,
    callerPhone: String,
    isVideo: Boolean,
    onEndCall: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF1A1A2E)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(64.dp))
            
            // Caller info
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF6C63FF)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = callerName.firstOrNull()?.uppercase() ?: "?",
                        fontSize = 40.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = callerName,
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = callerPhone,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.7f)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (isVideo) "Video Call" else "Voice Call",
                    style = MaterialTheme.typography.labelMedium,
                    color = Color(0xFF6C63FF)
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // End call button
            IconButton(
                onClick = onEndCall,
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFFF4444))
            ) {
                Icon(
                    imageVector = Icons.Default.CallEnd,
                    contentDescription = "End Call",
                    tint = Color.White,
                    modifier = Modifier.size(32.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
