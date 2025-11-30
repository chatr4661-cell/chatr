package com.chatr.app.ui.activities

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.chatr.app.ui.theme.ChatrTheme

class CallActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Show on lock screen
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
        
        // Extract call data
        val callerName = intent.getStringExtra("callerName") ?: "Unknown"
        val callId = intent.getStringExtra("callId") ?: ""
        val isVideo = intent.getBooleanExtra("isVideo", false)
        
        setContent {
            ChatrTheme {
                IncomingCallUI(
                    callerName = callerName,
                    isVideo = isVideo,
                    onAccept = {
                        handleAccept(callId, isVideo)
                    },
                    onReject = {
                        handleReject(callId)
                    }
                )
            }
        }
    }
    
    private fun handleAccept(callId: String, isVideo: Boolean) {
        // Send broadcast to web app
        val resultIntent = Intent("com.chatr.app.CALL_ANSWERED")
        resultIntent.putExtra("callId", callId)
        resultIntent.putExtra("isVideo", isVideo)
        sendBroadcast(resultIntent)
        
        // Close this activity and open main app
        finish()
    }
    
    private fun handleReject(callId: String) {
        // Send broadcast to web app
        val resultIntent = Intent("com.chatr.app.CALL_REJECTED")
        resultIntent.putExtra("callId", callId)
        sendBroadcast(resultIntent)
        
        // Close this activity
        finish()
    }
}

@Composable
fun IncomingCallUI(
    callerName: String,
    isVideo: Boolean,
    onAccept: () -> Unit,
    onReject: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF1a1a2e),
                        Color(0xFF16213e)
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(64.dp))
            
            // Caller Info
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                Text(
                    text = if (isVideo) "Incoming video call" else "Incoming call",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White.copy(alpha = 0.7f)
                )
                
                // Avatar
                Surface(
                    modifier = Modifier.size(120.dp),
                    shape = CircleShape,
                    color = Color(0xFF00D9FF).copy(alpha = 0.2f)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = callerName.take(1).uppercase(),
                            style = MaterialTheme.typography.displayLarge,
                            color = Color.White
                        )
                    }
                }
                
                Text(
                    text = callerName,
                    style = MaterialTheme.typography.headlineLarge,
                    color = Color.White
                )
                
                Text(
                    text = "Ringing...",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.7f)
                )
            }
            
            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Reject Button
                Surface(
                    modifier = Modifier.size(72.dp),
                    shape = CircleShape,
                    color = Color.Red,
                    onClick = onReject
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Decline",
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
                
                // Accept Button
                Surface(
                    modifier = Modifier.size(72.dp),
                    shape = CircleShape,
                    color = Color.Green,
                    onClick = onAccept
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (isVideo) Icons.Default.Videocam else Icons.Default.Call,
                            contentDescription = "Accept",
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
