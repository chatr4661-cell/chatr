package com.chatr.app.ui.components.chat

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chatr.app.ui.theme.*
import kotlinx.coroutines.delay

/**
 * Voice recording UI overlay with waveform visualization
 */
@Composable
fun VoiceRecordingUI(
    isRecording: Boolean,
    duration: Int,
    amplitude: Int,
    onCancel: () -> Unit,
    onSend: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (!isRecording) return
    
    val infiniteTransition = rememberInfiniteTransition(label = "recording")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )
    
    // Normalize amplitude for visual display (0-100)
    val normalizedAmplitude = (amplitude / 327.67f).coerceIn(0f, 100f)
    
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = BackgroundSecondary,
        tonalElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Cancel button
            IconButton(onClick = onCancel) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Cancel",
                    tint = Destructive
                )
            }
            
            Spacer(modifier = Modifier.width(8.dp))
            
            // Waveform visualization
            WaveformVisualizer(
                amplitude = normalizedAmplitude,
                modifier = Modifier
                    .weight(1f)
                    .height(40.dp)
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            // Duration
            Text(
                text = formatDuration(duration),
                style = MaterialTheme.typography.titleMedium,
                color = Foreground,
                fontWeight = FontWeight.Medium
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            // Recording indicator
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .graphicsLayer {
                        scaleX = pulseScale
                        scaleY = pulseScale
                    }
                    .clip(CircleShape)
                    .background(Destructive)
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            // Send button
            IconButton(
                onClick = onSend,
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(Primary)
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = "Send",
                    tint = PrimaryForeground
                )
            }
        }
    }
}

@Composable
private fun WaveformVisualizer(
    amplitude: Float,
    modifier: Modifier = Modifier
) {
    val bars = 20
    val baseHeight = 0.2f
    
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(bars) { index ->
            // Create varying heights based on position and amplitude
            val variation = kotlin.math.sin((index * 0.5f + amplitude * 0.02f).toDouble()).toFloat()
            val height = (baseHeight + (amplitude / 100f) * 0.6f * (0.5f + variation * 0.5f))
                .coerceIn(0.1f, 1f)
            
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .fillMaxHeight(height)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Primary.copy(alpha = 0.7f + height * 0.3f))
            )
        }
    }
}

/**
 * Slide-to-cancel voice recording gesture handler
 */
@Composable
fun VoiceRecordButton(
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit,
    onCancelRecording: () -> Unit,
    isRecording: Boolean,
    modifier: Modifier = Modifier
) {
    var dragOffset by remember { mutableStateOf(0f) }
    val cancelThreshold = -100f
    
    Box(
        modifier = modifier
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = {
                        onStartRecording()
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        dragOffset += dragAmount.x
                    },
                    onDragEnd = {
                        if (dragOffset < cancelThreshold) {
                            onCancelRecording()
                        } else {
                            onStopRecording()
                        }
                        dragOffset = 0f
                    },
                    onDragCancel = {
                        onCancelRecording()
                        dragOffset = 0f
                    }
                )
            }
    ) {
        IconButton(
            onClick = { 
                if (isRecording) onStopRecording() else onStartRecording() 
            }
        ) {
            Icon(
                imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.Mic,
                contentDescription = if (isRecording) "Stop Recording" else "Start Recording",
                tint = if (isRecording) Destructive else Primary
            )
        }
    }
}

private fun formatDuration(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return String.format("%02d:%02d", mins, secs)
}
