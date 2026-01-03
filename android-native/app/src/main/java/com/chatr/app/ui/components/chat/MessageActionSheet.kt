package com.chatr.app.ui.components.chat

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chatr.app.ui.theme.*

/**
 * WhatsApp-style message action sheet with reactions and actions
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessageActionSheet(
    isVisible: Boolean,
    messageId: String,
    messageContent: String,
    isOwnMessage: Boolean,
    isStarred: Boolean,
    onDismiss: () -> Unit,
    onReply: () -> Unit,
    onForward: () -> Unit,
    onCopy: () -> Unit,
    onStar: () -> Unit,
    onDelete: () -> Unit,
    onReact: (String) -> Unit,
    onInfo: () -> Unit = {}
) {
    if (!isVisible) return
    
    val reactions = listOf("❤️", "👍", "😂", "😮", "😢", "🙏")
    
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Card,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Quick reaction row
            LazyRow(
                horizontalArrangement = Arrangement.SpaceEvenly,
                modifier = Modifier.fillMaxWidth()
            ) {
                items(reactions) { emoji ->
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = Background,
                        modifier = Modifier
                            .clickable { 
                                onReact(emoji)
                                onDismiss()
                            }
                            .padding(4.dp)
                    ) {
                        Text(
                            text = emoji,
                            style = MaterialTheme.typography.headlineMedium,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            Divider(color = Border)
            Spacer(modifier = Modifier.height(8.dp))
            
            // Action items
            ActionItem(
                icon = Icons.Default.Reply,
                text = "Reply",
                onClick = {
                    onReply()
                    onDismiss()
                }
            )
            
            ActionItem(
                icon = Icons.Default.Forward,
                text = "Forward",
                onClick = {
                    onForward()
                    onDismiss()
                }
            )
            
            ActionItem(
                icon = Icons.Default.ContentCopy,
                text = "Copy",
                onClick = {
                    onCopy()
                    onDismiss()
                }
            )
            
            ActionItem(
                icon = if (isStarred) Icons.Default.Star else Icons.Default.StarBorder,
                text = if (isStarred) "Unstar" else "Star",
                onClick = {
                    onStar()
                    onDismiss()
                }
            )
            
            ActionItem(
                icon = Icons.Default.Info,
                text = "Info",
                onClick = {
                    onInfo()
                    onDismiss()
                }
            )
            
            if (isOwnMessage) {
                ActionItem(
                    icon = Icons.Default.Delete,
                    text = "Delete",
                    textColor = Destructive,
                    onClick = {
                        onDelete()
                        onDismiss()
                    }
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun ActionItem(
    icon: ImageVector,
    text: String,
    textColor: androidx.compose.ui.graphics.Color = Foreground,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        color = Card
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = text,
                style = MaterialTheme.typography.bodyLarge,
                color = textColor,
                modifier = Modifier.weight(1f)
            )
            Icon(
                imageVector = icon,
                contentDescription = text,
                tint = if (textColor == Destructive) Destructive else MutedForeground
            )
        }
    }
}
