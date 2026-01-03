package com.chatr.app.ui.components.chat

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.chatr.app.ui.theme.*

/**
 * Full-screen media viewer with pinch-to-zoom and share options
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MediaViewer(
    isVisible: Boolean,
    mediaUrl: String,
    mediaType: String = "image",
    senderName: String = "",
    timestamp: String = "",
    onDismiss: () -> Unit,
    onShare: () -> Unit = {},
    onDownload: () -> Unit = {}
) {
    if (!isVisible) return
    
    var scale by remember { mutableStateOf(1f) }
    var offsetX by remember { mutableStateOf(0f) }
    var offsetY by remember { mutableStateOf(0f) }
    
    val animatedScale by animateFloatAsState(
        targetValue = scale,
        label = "scale"
    )
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // Top bar
        TopAppBar(
            title = {
                Column {
                    if (senderName.isNotEmpty()) {
                        Text(
                            text = senderName,
                            style = MaterialTheme.typography.titleMedium,
                            color = Color.White
                        )
                    }
                    if (timestamp.isNotEmpty()) {
                        Text(
                            text = timestamp,
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }
                }
            },
            navigationIcon = {
                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.Default.ArrowBack,
                        "Close",
                        tint = Color.White
                    )
                }
            },
            actions = {
                IconButton(onClick = onShare) {
                    Icon(
                        Icons.Default.Share,
                        "Share",
                        tint = Color.White
                    )
                }
                IconButton(onClick = onDownload) {
                    Icon(
                        Icons.Default.Download,
                        "Download",
                        tint = Color.White
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color.Black.copy(alpha = 0.7f)
            ),
            modifier = Modifier.align(Alignment.TopCenter)
        )
        
        // Media content with pinch-to-zoom
        when (mediaType) {
            "image" -> {
                AsyncImage(
                    model = mediaUrl,
                    contentDescription = "Image",
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            scaleX = animatedScale
                            scaleY = animatedScale
                            translationX = offsetX
                            translationY = offsetY
                        }
                        .pointerInput(Unit) {
                            detectTransformGestures { _, pan, zoom, _ ->
                                scale = (scale * zoom).coerceIn(0.5f, 5f)
                                if (scale > 1f) {
                                    offsetX += pan.x
                                    offsetY += pan.y
                                } else {
                                    offsetX = 0f
                                    offsetY = 0f
                                }
                            }
                        }
                        .pointerInput(Unit) {
                            detectTapGestures(
                                onDoubleTap = {
                                    scale = if (scale > 1f) 1f else 2.5f
                                    offsetX = 0f
                                    offsetY = 0f
                                }
                            )
                        },
                    contentScale = ContentScale.Fit
                )
            }
            "video" -> {
                // Video player placeholder
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayCircle,
                            contentDescription = "Play",
                            tint = Color.White,
                            modifier = Modifier.size(72.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Video playback",
                            style = MaterialTheme.typography.bodyLarge,
                            color = Color.White
                        )
                    }
                }
            }
        }
        
        // Reset zoom button
        if (scale != 1f) {
            FloatingActionButton(
                onClick = {
                    scale = 1f
                    offsetX = 0f
                    offsetY = 0f
                },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(16.dp),
                containerColor = Primary
            ) {
                Icon(
                    Icons.Default.ZoomOut,
                    "Reset zoom",
                    tint = PrimaryForeground
                )
            }
        }
    }
}
