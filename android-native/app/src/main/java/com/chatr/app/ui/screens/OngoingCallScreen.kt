package com.chatr.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chatr.app.ui.theme.*
import com.chatr.app.webrtc.AudioRoute
import kotlinx.coroutines.delay

@Composable
fun OngoingCallScreen(
    callerName: String,
    isMuted: Boolean,
    audioRoute: AudioRoute,
    onToggleMute: () -> Unit,
    onToggleAudioRoute: () -> Unit,
    onEndCall: () -> Unit
) {
    var duration by remember { mutableStateOf(0) }
    
    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            duration++
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        ChatrDark,
                        ChatrDarker
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
            // Top section
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 64.dp)
            ) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(CircleShape)
                        .background(ChatrPrimary.copy(alpha = 0.2f)),
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
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = formatDuration(duration),
                    fontSize = 18.sp,
                    color = Color.White.copy(alpha = 0.7f)
                )
            }
            
            // Control buttons
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(bottom = 48.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    // Mute button
                    IconButton(
                        onClick = onToggleMute,
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(if (isMuted) Color.Red else ChatrSecondary)
                    ) {
                        Icon(
                            imageVector = if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                            contentDescription = "Toggle Mute",
                            tint = Color.White
                        )
                    }
                    
                    // Speaker button
                    IconButton(
                        onClick = onToggleAudioRoute,
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(if (audioRoute == AudioRoute.SPEAKER) ChatrPrimary else ChatrSecondary)
                    ) {
                        Icon(
                            imageVector = when (audioRoute) {
                                AudioRoute.SPEAKER -> Icons.Default.VolumeUp
                                AudioRoute.BLUETOOTH -> Icons.Default.Bluetooth
                                else -> Icons.Default.VolumeDown
                            },
                            contentDescription = "Toggle Speaker",
                            tint = Color.White
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(32.dp))
                
                // End call button
                FloatingActionButton(
                    onClick = onEndCall,
                    modifier = Modifier.size(72.dp),
                    containerColor = Color.Red,
                    contentColor = Color.White
                ) {
                    Icon(
                        imageVector = Icons.Default.CallEnd,
                        contentDescription = "End Call",
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        }
    }
}

private fun formatDuration(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return String.format("%02d:%02d", mins, secs)
}
