package com.chatr.app.presentation.calling

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.chatr.app.services.pstn.PstnRate

/**
 * PSTN Call Screen
 * 
 * UI for calling landlines and non-CHATR mobile numbers
 */
@Composable
fun PSTNCallScreen(
    phoneNumber: String,
    contactName: String?,
    onEndCall: () -> Unit,
    viewModel: PSTNCallViewModel = hiltViewModel()
) {
    val callState by viewModel.callState.collectAsState()
    val callDuration by viewModel.callDuration.collectAsState()
    val rate by viewModel.rate.collectAsState()
    
    LaunchedEffect(phoneNumber) {
        viewModel.initiateCall(phoneNumber)
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF1a1a2e),
                        Color(0xFF16213e),
                        Color(0xFF0f3460)
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(48.dp))
            
            // PSTN indicator
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFF4CAF50).copy(alpha = 0.2f)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Phone,
                        contentDescription = null,
                        tint = Color(0xFF4CAF50),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "PSTN Call",
                        color = Color(0xFF4CAF50),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Avatar
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF6366F1)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = contactName?.firstOrNull()?.uppercase() ?: "#",
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Contact name/number
            Text(
                text = contactName ?: phoneNumber,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            if (contactName != null) {
                Text(
                    text = phoneNumber,
                    fontSize = 16.sp,
                    color = Color.White.copy(alpha = 0.7f)
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Call status
            Text(
                text = when (callState) {
                    PSTNCallState.CONNECTING -> "Connecting to landline..."
                    PSTNCallState.RINGING -> "Ringing..."
                    PSTNCallState.CONNECTED -> formatDuration(callDuration)
                    PSTNCallState.ENDED -> "Call ended"
                    PSTNCallState.FAILED -> "Call failed"
                },
                fontSize = 16.sp,
                color = Color.White.copy(alpha = 0.6f)
            )
            
            // Rate info
            rate?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "${it.currency} ${String.format("%.2f", it.ratePerMinute)}/min",
                    fontSize = 12.sp,
                    color = Color(0xFFFFC107)
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Call controls
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                // Mute
                CallControlButton(
                    icon = Icons.Default.MicOff,
                    label = "Mute",
                    isActive = false,
                    onClick = { viewModel.toggleMute() }
                )
                
                // Keypad
                CallControlButton(
                    icon = Icons.Default.Dialpad,
                    label = "Keypad",
                    isActive = false,
                    onClick = { viewModel.showKeypad() }
                )
                
                // Speaker
                CallControlButton(
                    icon = Icons.Default.VolumeUp,
                    label = "Speaker",
                    isActive = false,
                    onClick = { viewModel.toggleSpeaker() }
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // End call button
            FloatingActionButton(
                onClick = {
                    viewModel.endCall()
                    onEndCall()
                },
                modifier = Modifier.size(72.dp),
                containerColor = Color(0xFFEF4444),
                contentColor = Color.White
            ) {
                Icon(
                    imageVector = Icons.Default.CallEnd,
                    contentDescription = "End Call",
                    modifier = Modifier.size(32.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}

@Composable
private fun CallControlButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        FilledIconButton(
            onClick = onClick,
            modifier = Modifier.size(56.dp),
            colors = IconButtonDefaults.filledIconButtonColors(
                containerColor = if (isActive) Color.White else Color.White.copy(alpha = 0.2f),
                contentColor = if (isActive) Color.Black else Color.White
            )
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            color = Color.White.copy(alpha = 0.7f)
        )
    }
}

private fun formatDuration(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return String.format("%02d:%02d", mins, secs)
}

enum class PSTNCallState {
    CONNECTING,
    RINGING,
    CONNECTED,
    ENDED,
    FAILED
}
