package com.chatr.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chatr.app.ui.theme.*
import com.chatr.app.webrtc.*
import kotlinx.coroutines.delay
import org.webrtc.VideoTrack

@Composable
fun VideoCallScreen(
    callerName: String,
    localVideoTrack: VideoTrack?,
    remoteVideoTrack: VideoTrack?,
    isMuted: Boolean,
    isVideoEnabled: Boolean,
    audioRoute: AudioRoute,
    onToggleMute: () -> Unit,
    onToggleVideo: () -> Unit,
    onSwitchCamera: () -> Unit,
    onToggleAudioRoute: () -> Unit,
    onEndCall: () -> Unit
) {
    var duration by remember { mutableStateOf(0) }
    var showControls by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            duration++
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ChatrDark)
    ) {
        // Remote video (full screen)
        if (remoteVideoTrack != null) {
            VideoRenderer(
                videoTrack = remoteVideoTrack,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(ChatrDarker),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Connecting...",
                    color = Color.White,
                    fontSize = 18.sp
                )
            }
        }
        
        // Local video (PIP - top right)
        if (isVideoEnabled && localVideoTrack != null) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(16.dp)
                    .width(120.dp)
                    .height(160.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .border(2.dp, ChatrPrimary, RoundedCornerShape(12.dp))
            ) {
                VideoRenderer(
                    videoTrack = localVideoTrack,
                    modifier = Modifier.fillMaxSize(),
                    mirror = true
                )
            }
        }
        
        // Top bar with caller name and duration
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .background(Color.Black.copy(alpha = 0.3f))
                .padding(16.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = callerName,
                    color = Color.White,
                    fontSize = 18.sp
                )
                Text(
                    text = formatDuration(duration),
                    color = Color.White.copy(alpha = 0.7f),
                    fontSize = 14.sp
                )
            }
        }
        
        // Bottom controls
        if (showControls) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.5f))
                    .padding(vertical = 24.dp, horizontal = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    // Mute button
                    IconButton(
                        onClick = onToggleMute,
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(if (isMuted) Color.Red else ChatrSecondary)
                    ) {
                        Icon(
                            imageVector = if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                            contentDescription = "Toggle Mute",
                            tint = Color.White
                        )
                    }
                    
                    // Video toggle button
                    IconButton(
                        onClick = onToggleVideo,
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(if (!isVideoEnabled) Color.Red else ChatrSecondary)
                    ) {
                        Icon(
                            imageVector = if (isVideoEnabled) Icons.Default.Videocam else Icons.Default.VideocamOff,
                            contentDescription = "Toggle Video",
                            tint = Color.White
                        )
                    }
                    
                    // Switch camera button
                    IconButton(
                        onClick = onSwitchCamera,
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(ChatrSecondary)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Cameraswitch,
                            contentDescription = "Switch Camera",
                            tint = Color.White
                        )
                    }
                    
                    // Speaker button
                    IconButton(
                        onClick = onToggleAudioRoute,
                        modifier = Modifier
                            .size(56.dp)
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
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // End call button
                FloatingActionButton(
                    onClick = onEndCall,
                    modifier = Modifier.size(64.dp),
                    containerColor = Color.Red,
                    contentColor = Color.White
                ) {
                    Icon(
                        imageVector = Icons.Default.CallEnd,
                        contentDescription = "End Call",
                        modifier = Modifier.size(28.dp)
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
