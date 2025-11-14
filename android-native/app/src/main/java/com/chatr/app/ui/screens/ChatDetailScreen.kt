package com.chatr.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chatr.app.data.model.Message
import com.chatr.app.data.model.MessageStatus
import com.chatr.app.data.model.MessageType
import com.chatr.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatDetailScreen(
    conversationId: String,
    contactName: String,
    currentUserId: String,
    onNavigate: (String) -> Unit,
    onBack: () -> Unit
) {
    var messageText by remember { mutableStateOf("") }
    var isTyping by remember { mutableStateOf(false) }
    var showReactionMenu by remember { mutableStateOf<String?>(null) }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    
    // Mock messages - in real app, these come from ViewModel
    val messages = remember {
        mutableStateListOf(
            Message(
                id = "1",
                conversationId = conversationId,
                senderId = "other",
                senderName = contactName,
                content = "Hey! How are you doing?",
                type = MessageType.TEXT,
                timestamp = System.currentTimeMillis() - 3600000,
                status = MessageStatus.READ
            ),
            Message(
                id = "2",
                conversationId = conversationId,
                senderId = currentUserId,
                senderName = "You",
                content = "I'm doing great! Thanks for asking 😊",
                type = MessageType.TEXT,
                timestamp = System.currentTimeMillis() - 3500000,
                status = MessageStatus.READ
            ),
            Message(
                id = "3",
                conversationId = conversationId,
                senderId = "other",
                senderName = contactName,
                content = "Want to catch up later?",
                type = MessageType.TEXT,
                timestamp = System.currentTimeMillis() - 60000,
                status = MessageStatus.DELIVERED
            )
        )
    }
    
    val listState = rememberLazyListState()
    
    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        selectedImageUri = uri
        // Handle image upload
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Primary.copy(alpha = 0.3f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = contactName.first().toString(),
                                style = MaterialTheme.typography.titleMedium,
                                color = Primary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        
                        Spacer(modifier = Modifier.width(12.dp))
                        
                        Column {
                            Text(
                                text = contactName,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            if (isTyping) {
                                Text(
                                    text = "typing...",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Primary
                                )
                            } else {
                                Text(
                                    text = "Online",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MutedForeground
                                )
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { onNavigate("voice-call/$conversationId") }) {
                        Icon(
                            imageVector = Icons.Default.Phone,
                            contentDescription = "Voice Call",
                            tint = Primary
                        )
                    }
                    IconButton(onClick = { onNavigate("video-call/$conversationId") }) {
                        Icon(
                            imageVector = Icons.Default.Videocam,
                            contentDescription = "Video Call",
                            tint = Primary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Background
                )
            )
        },
        bottomBar = {
            MessageInputBar(
                messageText = messageText,
                onMessageTextChange = { messageText = it },
                onSendMessage = {
                    if (messageText.isNotBlank()) {
                        messages.add(
                            Message(
                                id = UUID.randomUUID().toString(),
                                conversationId = conversationId,
                                senderId = currentUserId,
                                senderName = "You",
                                content = messageText,
                                type = MessageType.TEXT,
                                timestamp = System.currentTimeMillis(),
                                status = MessageStatus.PENDING
                            )
                        )
                        messageText = ""
                    }
                },
                onAttachmentClick = { imagePicker.launch("image/*") },
                onVoiceNoteClick = { /* Handle voice note */ }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Background)
                .padding(padding)
        ) {
            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                reverseLayout = false
            ) {
                items(messages) { message ->
                    MessageBubble(
                        message = message,
                        isCurrentUser = message.senderId == currentUserId,
                        onLongPress = { showReactionMenu = message.id },
                        onReactionClick = { emoji ->
                            // Handle reaction
                            showReactionMenu = null
                        }
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
            
            if (showReactionMenu != null) {
                ReactionMenu(
                    onDismiss = { showReactionMenu = null },
                    onReactionSelect = { emoji ->
                        // Add reaction
                        showReactionMenu = null
                    }
                )
            }
        }
    }
}

@Composable
fun MessageBubble(
    message: Message,
    isCurrentUser: Boolean,
    onLongPress: () -> Unit,
    onReactionClick: (String) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isCurrentUser) Alignment.End else Alignment.Start
    ) {
        Card(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .clickable(onClick = onLongPress),
            colors = CardDefaults.cardColors(
                containerColor = if (isCurrentUser) Primary else Card
            ),
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isCurrentUser) 16.dp else 4.dp,
                bottomEnd = if (isCurrentUser) 4.dp else 16.dp
            )
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                if (message.type == MessageType.TEXT) {
                    Text(
                        text = message.content,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (isCurrentUser) PrimaryForeground else Foreground
                    )
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = formatTime(message.timestamp),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isCurrentUser) 
                            PrimaryForeground.copy(alpha = 0.7f) 
                        else 
                            MutedForeground
                    )
                    
                    if (isCurrentUser) {
                        Icon(
                            imageVector = when (message.status) {
                                MessageStatus.PENDING -> Icons.Default.Schedule
                                MessageStatus.SENT -> Icons.Default.Done
                                MessageStatus.DELIVERED -> Icons.Default.DoneAll
                                MessageStatus.READ -> Icons.Default.DoneAll
                                MessageStatus.FAILED -> Icons.Default.Error
                            },
                            contentDescription = message.status.name,
                            tint = if (message.status == MessageStatus.READ) 
                                Success 
                            else 
                                PrimaryForeground.copy(alpha = 0.7f),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    
                    if (message.isEdited) {
                        Text(
                            text = "edited",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (isCurrentUser) 
                                PrimaryForeground.copy(alpha = 0.7f) 
                            else 
                                MutedForeground
                        )
                    }
                }
            }
        }
        
        // Reactions
        if (message.reactions.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .padding(top = 4.dp)
                    .background(Muted, RoundedCornerShape(12.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                message.reactions.groupBy { it.emoji }.forEach { (emoji, reactions) ->
                    Text(
                        text = "$emoji ${reactions.size}",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}

@Composable
fun MessageInputBar(
    messageText: String,
    onMessageTextChange: (String) -> Unit,
    onSendMessage: () -> Unit,
    onAttachmentClick: () -> Unit,
    onVoiceNoteClick: () -> Unit
) {
    Surface(
        color = BackgroundSecondary,
        tonalElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalAlignment = Alignment.Bottom
        ) {
            IconButton(onClick = onAttachmentClick) {
                Icon(
                    imageVector = Icons.Default.AttachFile,
                    contentDescription = "Attach",
                    tint = Primary
                )
            }
            
            OutlinedTextField(
                value = messageText,
                onValueChange = onMessageTextChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Type a message...") },
                shape = RoundedCornerShape(24.dp),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Card,
                    unfocusedContainerColor = Card,
                    focusedIndicatorColor = Primary,
                    unfocusedIndicatorColor = Border
                ),
                maxLines = 4
            )
            
            if (messageText.isBlank()) {
                IconButton(onClick = onVoiceNoteClick) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = "Voice Note",
                        tint = Primary
                    )
                }
            } else {
                IconButton(onClick = onSendMessage) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Send",
                        tint = Primary
                    )
                }
            }
        }
    }
}

@Composable
fun ReactionMenu(
    onDismiss: () -> Unit,
    onReactionSelect: (String) -> Unit
) {
    val reactions = listOf("❤️", "👍", "😂", "😮", "😢", "🙏")
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("React") },
        text = {
            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                modifier = Modifier.fillMaxWidth()
            ) {
                reactions.forEach { emoji ->
                    Text(
                        text = emoji,
                        style = MaterialTheme.typography.headlineMedium,
                        modifier = Modifier.clickable { onReactionSelect(emoji) }
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

private fun formatTime(timestamp: Long): String {
    val format = SimpleDateFormat("HH:mm", Locale.getDefault())
    return format.format(Date(timestamp))
}
