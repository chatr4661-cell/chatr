package com.chatr.app.ui.call

import android.os.CountDownTimer
import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chatr.app.copilot.CopilotHint
import kotlinx.coroutines.delay

/**
 * Minimal Call UI - Phone-like, not App-like
 * 
 * UI PHILOSOPHY:
 * - During calls, CHATR branding is minimal
 * - UI feels like the PHONE is handling the call
 * - Intelligence shown subtly, only when it matters
 * - No AI labels, graphs, network bars, or technical stats
 */
@Composable
fun MinimalCallScreen(
    callerName: String,
    callerAvatar: String?,
    callDuration: Long,
    isVideo: Boolean,
    isMuted: Boolean,
    isSpeaker: Boolean,
    copilotHint: CopilotHint?,
    onMuteToggle: () -> Unit,
    onSpeakerToggle: () -> Unit,
    onEndCall: () -> Unit,
    onVideoToggle: (() -> Unit)? = null,
    onSwitchCamera: (() -> Unit)? = null
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF1C1C1E)) // iOS-like dark
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(80.dp))
            
            // Caller name - prominent
            Text(
                text = callerName,
                fontSize = 32.sp,
                fontWeight = FontWeight.Light,
                color = Color.White,
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Call duration - simple timer only
            Text(
                text = formatDuration(callDuration),
                fontSize = 18.sp,
                color = Color.White.copy(alpha = 0.7f)
            )
            
            // Subtle copilot hint - appears and fades
            SubtleHint(hint = copilotHint)
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Call controls - minimal, phone-like
            CallControls(
                isMuted = isMuted,
                isSpeaker = isSpeaker,
                isVideo = isVideo,
                onMuteToggle = onMuteToggle,
                onSpeakerToggle = onSpeakerToggle,
                onVideoToggle = onVideoToggle,
                onSwitchCamera = onSwitchCamera
            )
            
            Spacer(modifier = Modifier.height(40.dp))
            
            // End call button - red, prominent
            EndCallButton(onClick = onEndCall)
            
            Spacer(modifier = Modifier.height(60.dp))
        }
    }
}

/**
 * Subtle hint - appears briefly, non-intrusive
 * Examples: "Call stabilized", "Audio optimized"
 */
@Composable
private fun SubtleHint(hint: CopilotHint?) {
    var visible by remember { mutableStateOf(false) }
    
    LaunchedEffect(hint) {
        if (hint != null) {
            visible = true
            delay(hint.durationMs)
            visible = false
        }
    }
    
    AnimatedVisibility(visible = visible) {
        Text(
            text = hint?.message ?: "",
            fontSize = 14.sp,
            color = Color.White.copy(alpha = 0.5f),
            modifier = Modifier.padding(top = 16.dp)
        )
    }
}

@Composable
private fun AnimatedVisibility(visible: Boolean, content: @Composable () -> Unit) {
    if (visible) {
        content()
    }
}

/**
 * Call control buttons - minimal design
 */
@Composable
private fun CallControls(
    isMuted: Boolean,
    isSpeaker: Boolean,
    isVideo: Boolean,
    onMuteToggle: () -> Unit,
    onSpeakerToggle: () -> Unit,
    onVideoToggle: (() -> Unit)?,
    onSwitchCamera: (() -> Unit)?
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 40.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        // Mute button
        CallControlButton(
            icon = if (isMuted) "🔇" else "🎤",
            label = "mute",
            isActive = isMuted,
            onClick = onMuteToggle
        )
        
        // Speaker button
        CallControlButton(
            icon = if (isSpeaker) "🔊" else "🔈",
            label = "speaker",
            isActive = isSpeaker,
            onClick = onSpeakerToggle
        )
        
        // Video toggle (only if video call)
        if (isVideo && onVideoToggle != null) {
            CallControlButton(
                icon = "📹",
                label = "video",
                isActive = true,
                onClick = onVideoToggle
            )
        }
        
        // Switch camera (only if video call)
        if (isVideo && onSwitchCamera != null) {
            CallControlButton(
                icon = "🔄",
                label = "flip",
                isActive = false,
                onClick = onSwitchCamera
            )
        }
    }
}

@Composable
private fun CallControlButton(
    icon: String,
    label: String,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        IconButton(
            onClick = onClick,
            modifier = Modifier
                .size(60.dp)
                .clip(CircleShape)
                .background(
                    if (isActive) Color.White.copy(alpha = 0.3f)
                    else Color.White.copy(alpha = 0.1f)
                )
        ) {
            Text(
                text = icon,
                fontSize = 24.sp
            )
        }
        
        Text(
            text = label,
            fontSize = 12.sp,
            color = Color.White.copy(alpha = 0.6f),
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}

@Composable
private fun EndCallButton(onClick: () -> Unit) {
    IconButton(
        onClick = onClick,
        modifier = Modifier
            .size(72.dp)
            .clip(CircleShape)
            .background(Color(0xFFFF3B30)) // iOS red
    ) {
        Text(
            text = "📞",
            fontSize = 28.sp
        )
    }
}

private fun formatDuration(seconds: Long): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return "%d:%02d".format(mins, secs)
}
