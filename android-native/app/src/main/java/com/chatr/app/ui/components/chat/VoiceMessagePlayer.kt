package com.chatr.app.ui.components.chat

import android.media.MediaPlayer
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.chatr.app.ui.theme.*
import kotlinx.coroutines.delay

/**
 * Voice Message Player - Plays audio from URL with waveform visualization
 */
@Composable
fun VoiceMessagePlayer(
    audioUrl: String,
    duration: Int = 0,
    isOwnMessage: Boolean = true,
    modifier: Modifier = Modifier
) {
    var isPlaying by remember { mutableStateOf(false) }
    var currentPosition by remember { mutableStateOf(0f) }
    var totalDuration by remember { mutableStateOf(duration.toFloat()) }
    var mediaPlayer by remember { mutableStateOf<MediaPlayer?>(null) }
    
    // Cleanup on disposal
    DisposableEffect(audioUrl) {
        onDispose {
            mediaPlayer?.release()
            mediaPlayer = null
        }
    }
    
    // Progress update loop
    LaunchedEffect(isPlaying) {
        while (isPlaying) {
            delay(100)
            mediaPlayer?.let { player ->
                if (player.isPlaying) {
                    currentPosition = player.currentPosition.toFloat()
                    totalDuration = player.duration.toFloat()
                }
            }
        }
    }
    
    fun togglePlayback() {
        if (isPlaying) {
            mediaPlayer?.pause()
            isPlaying = false
        } else {
            if (mediaPlayer == null) {
                mediaPlayer = MediaPlayer().apply {
                    setDataSource(audioUrl)
                    setOnPreparedListener {
                        start()
                        isPlaying = true
                        totalDuration = duration.toFloat()
                    }
                    setOnCompletionListener {
                        isPlaying = false
                        currentPosition = 0f
                    }
                    setOnErrorListener { _, _, _ ->
                        isPlaying = false
                        true
                    }
                    prepareAsync()
                }
            } else {
                mediaPlayer?.start()
                isPlaying = true
            }
        }
    }
    
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(if (isOwnMessage) Primary.copy(alpha = 0.2f) else Card)
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Play/Pause button
        IconButton(
            onClick = { togglePlayback() },
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(Primary)
        ) {
            Icon(
                imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                contentDescription = if (isPlaying) "Pause" else "Play",
                tint = PrimaryForeground,
                modifier = Modifier.size(24.dp)
            )
        }
        
        Spacer(modifier = Modifier.width(8.dp))
        
        // Progress and waveform
        Column(modifier = Modifier.weight(1f)) {
            // Waveform visualization (simplified as progress bar)
            LinearProgressIndicator(
                progress = { if (totalDuration > 0) currentPosition / totalDuration else 0f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(20.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = Primary,
                trackColor = if (isOwnMessage) PrimaryForeground.copy(alpha = 0.3f) else MutedForeground.copy(alpha = 0.3f),
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Duration display
            Text(
                text = formatTime(if (isPlaying) currentPosition.toInt() else 0) + " / " + formatTime(totalDuration.toInt()),
                style = MaterialTheme.typography.labelSmall,
                color = if (isOwnMessage) Foreground else MutedForeground
            )
        }
    }
}

private fun formatTime(milliseconds: Int): String {
    val totalSeconds = milliseconds / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format("%d:%02d", minutes, seconds)
}
