package com.chatr.app.ui.components.chat

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import com.chatr.app.ui.theme.*
import kotlinx.coroutines.delay

/**
 * Animated typing indicator showing bouncing dots
 */
@Composable
fun TypingIndicator(
    userName: String? = null,
    modifier: Modifier = Modifier
) {
    val dots = 3
    val delayUnit = 150
    
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Bubble container
        Card(
            colors = CardDefaults.cardColors(containerColor = Card),
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = 4.dp,
                bottomEnd = 16.dp
            )
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(dots) { index ->
                    BouncingDot(
                        delay = index * delayUnit
                    )
                }
            }
        }
        
        // Show user name if provided
        userName?.let {
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "$it is typing...",
                style = MaterialTheme.typography.bodySmall,
                color = MutedForeground
            )
        }
    }
}

@Composable
private fun BouncingDot(
    delay: Int
) {
    val infiniteTransition = rememberInfiniteTransition(label = "dot")
    
    val offsetY by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -8f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = 400,
                delayMillis = delay,
                easing = FastOutSlowInEasing
            ),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bounce"
    )
    
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = 400,
                delayMillis = delay,
                easing = FastOutSlowInEasing
            ),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )
    
    Box(
        modifier = Modifier
            .size(8.dp)
            .graphicsLayer {
                translationY = offsetY
            }
            .clip(CircleShape)
            .background(MutedForeground.copy(alpha = alpha))
    )
}

/**
 * Typing status text for chat list
 */
@Composable
fun TypingStatusText(
    userName: String,
    modifier: Modifier = Modifier
) {
    Text(
        text = "$userName is typing...",
        style = MaterialTheme.typography.bodySmall,
        color = Primary,
        modifier = modifier
    )
}
