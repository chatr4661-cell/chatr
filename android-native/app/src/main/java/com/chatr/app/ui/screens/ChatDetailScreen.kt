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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.chatr.app.data.repository.MessageItem
import com.chatr.app.ui.theme.*
import com.chatr.app.viewmodel.ChatDetailViewModel
import java.text.SimpleDateFormat
import java.time.Instant
import java.util.*

/**
 * ChatDetailScreen - Shows messages for a conversation
 * Uses SupabaseRpcRepository.getMessages() which calls get_conversation_messages() RPC
 * This provides the same data as the web app
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatDetailScreen(
    conversationId: String,
    onNavigateBack: () -> Unit = {},
    onNavigateToCall: (String, Boolean) -> Unit = { _, _ -> },
    // Legacy params - for backwards compatibility
    contactName: String = "",
    currentUserId: String = "",
    onNavigate: ((String) -> Unit)? = null,
    onBack: (() -> Unit)? = null,
    viewModel: ChatDetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var messageText by remember { mutableStateOf("") }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    
    val listState = rememberLazyListState()
    
    // Get contact name from first message sender that isn't current user, or use provided name
    val displayName = remember(state.messages, contactName) {
        if (contactName.isNotEmpty()) {
            contactName
        } else {
            state.messages.find { it.sender_id != state.currentUserId }?.sender_name ?: "Chat"
        }
    }
    
    val displayAvatar = remember(state.messages) {
        state.messages.find { it.sender_id != state.currentUserId }?.sender_avatar
    }
    
    // Mark conversation as read when opened
    LaunchedEffect(conversationId) {
        viewModel.markAsRead()
    }
    
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
                        // Avatar
                        if (!displayAvatar.isNullOrEmpty()) {
                            AsyncImage(
                                model = displayAvatar,
                                contentDescription = "Avatar",
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(Primary),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = displayName.firstOrNull()?.uppercase() ?: "?",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = PrimaryForeground,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.width(12.dp))
                        
                        Column {
                            Text(
                                text = displayName,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "Online",
                                style = MaterialTheme.typography.bodySmall,
                                color = Success
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { 
                        onNavigateBack()
                        onBack?.invoke()
                    }) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { 
                        onNavigateToCall(conversationId, false)
                        onNavigate?.invoke("voice-call/$conversationId") 
                    }) {
                        Icon(
                            imageVector = Icons.Default.Phone,
                            contentDescription = "Voice Call",
                            tint = Primary
                        )
                    }
                    IconButton(onClick = { 
                        onNavigateToCall(conversationId, true)
                        onNavigate?.invoke("video-call/$conversationId") 
                    }) {
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
                        viewModel.sendMessage(messageText)
                        messageText = ""
                    }
                },
                onAttachmentClick = { imagePicker.launch("image/*") },
                onVoiceNoteClick = { /* Handle voice note */ },
                isSending = state.isSending
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Background)
                .padding(padding)
        ) {
            // Error message
            state.error?.let { error ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .align(Alignment.TopCenter),
                    colors = CardDefaults.cardColors(containerColor = Destructive.copy(alpha = 0.1f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = error,
                            color = Destructive,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f)
                        )
                        TextButton(onClick = { viewModel.loadMessages() }) {
                            Text("Retry", color = Primary)
                        }
                    }
                }
            }
            
            // Loading indicator
            if (state.isLoading && state.messages.isEmpty()) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = Primary
                )
            } else if (state.messages.isEmpty() && !state.isLoading) {
                // Empty state
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "No messages yet",
                        style = MaterialTheme.typography.titleMedium,
                        color = MutedForeground
                    )
                    Text(
                        text = "Send a message to start the conversation",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MutedForeground
                    )
                }
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    reverseLayout = false
                ) {
                    items(
                        items = state.messages,
                        key = { it.message_id }
                    ) { message ->
                        MessageBubbleRpc(
                            message = message,
                            isCurrentUser = viewModel.isOwnMessage(message.sender_id)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }
            }
        }
    }
}

/**
 * Message bubble for RPC-based messages
 */
@Composable
private fun MessageBubbleRpc(
    message: MessageItem,
    isCurrentUser: Boolean
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isCurrentUser) Alignment.End else Alignment.Start
    ) {
        Card(
            modifier = Modifier.widthIn(max = 280.dp),
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
                // Show sender name for group chats (when not current user)
                if (!isCurrentUser && !message.sender_name.isNullOrEmpty()) {
                    Text(
                        text = message.sender_name,
                        style = MaterialTheme.typography.labelMedium,
                        color = Primary,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }
                
                if (message.is_deleted) {
                    Text(
                        text = "🗑 This message was deleted",
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (isCurrentUser) PrimaryForeground.copy(alpha = 0.7f) else MutedForeground,
                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                    )
                } else {
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
                        text = formatMessageTime(message.created_at),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isCurrentUser) 
                            PrimaryForeground.copy(alpha = 0.7f) 
                        else 
                            MutedForeground
                    )
                    
                    if (isCurrentUser) {
                        Icon(
                            imageVector = when (message.status) {
                                "read" -> Icons.Default.DoneAll
                                "delivered" -> Icons.Default.DoneAll
                                "sent" -> Icons.Default.Done
                                else -> Icons.Default.Schedule
                            },
                            contentDescription = message.status,
                            tint = if (message.status == "read") 
                                Success 
                            else 
                                PrimaryForeground.copy(alpha = 0.7f),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    
                    if (message.is_edited) {
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
    }
}

@Composable
fun MessageInputBar(
    messageText: String,
    onMessageTextChange: (String) -> Unit,
    onSendMessage: () -> Unit,
    onAttachmentClick: () -> Unit,
    onVoiceNoteClick: () -> Unit,
    isSending: Boolean = false
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
            IconButton(onClick = onAttachmentClick, enabled = !isSending) {
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
                maxLines = 4,
                enabled = !isSending
            )
            
            if (messageText.isBlank()) {
                IconButton(onClick = onVoiceNoteClick, enabled = !isSending) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = "Voice Note",
                        tint = Primary
                    )
                }
            } else {
                IconButton(onClick = onSendMessage, enabled = !isSending) {
                    if (isSending) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Primary,
                            strokeWidth = 2.dp
                        )
                    } else {
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

private fun formatMessageTime(isoTimestamp: String?): String {
    if (isoTimestamp == null) return ""
    return try {
        val instant = Instant.parse(isoTimestamp)
        val date = Date.from(instant)
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
    } catch (e: Exception) {
        ""
    }
}
