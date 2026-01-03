package com.chatr.app.ui.screens

import android.Manifest
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.chatr.app.data.repository.MessageItem
import com.chatr.app.ui.components.chat.*
import com.chatr.app.ui.theme.*
import com.chatr.app.viewmodel.ChatDetailViewModel
import java.text.SimpleDateFormat
import java.time.Instant
import java.util.*

/**
 * ChatDetailScreen - Complete chat experience with all features
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatDetailScreen(
    conversationId: String,
    onNavigateBack: () -> Unit = {},
    onNavigateToCall: (String, Boolean) -> Unit = { _, _ -> },
    contactName: String = "",
    currentUserId: String = "",
    onNavigate: ((String) -> Unit)? = null,
    onBack: (() -> Unit)? = null,
    viewModel: ChatDetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var messageText by remember { mutableStateOf("") }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    val haptics = LocalHapticFeedback.current
    
    val listState = rememberLazyListState()
    
    val displayName = remember(state.messages, contactName) {
        if (contactName.isNotEmpty()) contactName
        else state.messages.find { it.sender_id != state.currentUserId }?.sender_name ?: "Chat"
    }
    
    val displayAvatar = remember(state.messages) {
        state.messages.find { it.sender_id != state.currentUserId }?.sender_avatar
    }
    
    // Permission launcher for mic
    val micPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) viewModel.startVoiceRecording()
    }
    
    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            viewModel.uploadAndSendImage(it)
        }
    }
    
    LaunchedEffect(conversationId) {
        viewModel.markAsRead()
    }
    
    // Auto-scroll on new messages
    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.size - 1)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            topBar = {
                Column {
                    TopAppBar(
                        title = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
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
                                    if (state.isOtherUserTyping) {
                                        Text(
                                            text = "typing...",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Primary
                                        )
                                    } else {
                                        Text(
                                            text = "Online",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Success
                                        )
                                    }
                                }
                            }
                        },
                        navigationIcon = {
                            IconButton(onClick = { 
                                onNavigateBack()
                                onBack?.invoke()
                            }) {
                                Icon(Icons.Default.ArrowBack, "Back")
                            }
                        },
                        actions = {
                            IconButton(onClick = { viewModel.toggleSearch() }) {
                                Icon(Icons.Default.Search, "Search", tint = Foreground)
                            }
                            IconButton(onClick = { 
                                onNavigateToCall(conversationId, false)
                            }) {
                                Icon(Icons.Default.Phone, "Voice Call", tint = Primary)
                            }
                            IconButton(onClick = { 
                                onNavigateToCall(conversationId, true)
                            }) {
                                Icon(Icons.Default.Videocam, "Video Call", tint = Primary)
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(containerColor = Background)
                    )
                    
                    // Search bar
                    MessageSearchBar(
                        isVisible = state.isSearching,
                        searchQuery = state.searchQuery,
                        onQueryChange = { viewModel.updateSearchQuery(it) },
                        onClose = { viewModel.toggleSearch() },
                        currentMatch = state.currentSearchIndex,
                        totalMatches = state.searchMatches.size,
                        onPrevious = { viewModel.previousSearchMatch() },
                        onNext = { viewModel.nextSearchMatch() }
                    )
                }
            },
            bottomBar = {
                Column {
                    // Reply preview
                    state.replyingToMessage?.let { replyMessage ->
                        ReplyPreview(
                            senderName = replyMessage.sender_name ?: "Unknown",
                            messageContent = replyMessage.content,
                            onDismiss = { viewModel.cancelReply() }
                        )
                    }
                    
                    // Voice recording UI or message input
                    if (state.isRecording) {
                        VoiceRecordingUI(
                            isRecording = state.isRecording,
                            duration = state.recordingDuration,
                            amplitude = state.recordingAmplitude,
                            onCancel = { viewModel.cancelVoiceRecording() },
                            onSend = { viewModel.stopVoiceRecording() }
                        )
                    } else {
                        MessageInputBar(
                            messageText = messageText,
                            onMessageTextChange = { 
                                messageText = it 
                                viewModel.onTextChanged(it)
                            },
                            onSendMessage = {
                                if (messageText.isNotBlank()) {
                                    viewModel.sendMessage(messageText)
                                    messageText = ""
                                }
                            },
                            onAttachmentClick = { imagePicker.launch("image/*") },
                            onVoiceNoteClick = {
                                micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                            },
                            isSending = state.isSending
                        )
                    }
                }
            }
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Background)
                    .padding(padding)
            ) {
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
                
                if (state.isLoading && state.messages.isEmpty()) {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = Primary
                    )
                } else if (state.messages.isEmpty() && !state.isLoading) {
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
                            // Find replied message content
                            val repliedMessage = if (!message.reply_to_id.isNullOrEmpty()) {
                                state.messages.find { it.message_id == message.reply_to_id }
                            } else null
                            
                            MessageBubbleComplete(
                                message = message,
                                repliedMessage = repliedMessage,
                                isCurrentUser = viewModel.isOwnMessage(message.sender_id),
                                isHighlighted = state.searchMatches.contains(message.message_id),
                                onLongPress = {
                                    haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                                    viewModel.showMessageActions(message.message_id)
                                },
                                onReplyClick = { replyToId ->
                                    // Scroll to replied message
                                    val index = state.messages.indexOfFirst { it.message_id == replyToId }
                                    if (index >= 0) {
                                        kotlinx.coroutines.MainScope().launch {
                                            listState.animateScrollToItem(index)
                                        }
                                    }
                                },
                                onMediaClick = { url, type ->
                                    viewModel.showMediaViewer(url, type)
                                }
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                        
                        // Typing indicator at bottom
                        if (state.isOtherUserTyping) {
                            item {
                                TypingIndicator()
                                Spacer(modifier = Modifier.height(8.dp))
                            }
                        }
                    }
                }
            }
        }
        
        // Message action sheet
        val selectedMessage = viewModel.getSelectedMessage()
        if (state.showActionSheet && selectedMessage != null) {
            MessageActionSheet(
                isVisible = true,
                messageId = selectedMessage.message_id,
                messageContent = selectedMessage.content,
                isOwnMessage = viewModel.isOwnMessage(selectedMessage.sender_id),
                isStarred = selectedMessage.is_starred,
                onDismiss = { viewModel.hideMessageActions() },
                onReply = { viewModel.setReplyingTo(selectedMessage) },
                onForward = { viewModel.showForwardDialog(selectedMessage.content) },
                onCopy = { viewModel.copyMessage(selectedMessage.message_id) },
                onStar = { viewModel.starMessage(selectedMessage.message_id) },
                onDelete = { viewModel.deleteMessage(selectedMessage.message_id) },
                onReact = { emoji -> viewModel.addReaction(selectedMessage.message_id, emoji) }
            )
        }
        
        // Forward dialog
        ForwardMessageDialog(
            isVisible = state.showForwardDialog,
            messageContent = state.forwardMessageContent,
            conversations = state.forwardConversations,
            onDismiss = { viewModel.hideForwardDialog() },
            onForward = { targets -> viewModel.forwardMessage(targets) }
        )
        
        // Media viewer
        MediaViewer(
            isVisible = state.showMediaViewer,
            mediaUrl = state.viewerMediaUrl,
            mediaType = state.viewerMediaType,
            onDismiss = { viewModel.hideMediaViewer() }
        )
    }
}

/**
 * Complete message bubble with all features
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MessageBubbleComplete(
    message: MessageItem,
    repliedMessage: MessageItem? = null,
    isCurrentUser: Boolean,
    isHighlighted: Boolean = false,
    onLongPress: () -> Unit,
    onReplyClick: (String) -> Unit,
    onMediaClick: (String, String) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isCurrentUser) Alignment.End else Alignment.Start
    ) {
        Card(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .combinedClickable(
                    onClick = { },
                    onLongClick = onLongPress
                ),
            colors = CardDefaults.cardColors(
                containerColor = when {
                    isHighlighted -> Primary.copy(alpha = 0.2f)
                    isCurrentUser -> Primary
                    else -> Card
                }
            ),
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isCurrentUser) 16.dp else 4.dp,
                bottomEnd = if (isCurrentUser) 4.dp else 16.dp
            )
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                // Reply reference
                if (!message.reply_to_id.isNullOrEmpty() && repliedMessage != null) {
                    InlineReplyReference(
                        senderName = repliedMessage.sender_name ?: "Unknown",
                        messageContent = repliedMessage.content.take(50) + if (repliedMessage.content.length > 50) "..." else "",
                        onClick = { onReplyClick(message.reply_to_id) },
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                
                // Sender name for group chats
                if (!isCurrentUser && !message.sender_name.isNullOrEmpty()) {
                    Text(
                        text = message.sender_name,
                        style = MaterialTheme.typography.labelMedium,
                        color = Primary,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }
                
                // Voice message player
                if (message.message_type == "voice" && !message.media_url.isNullOrEmpty()) {
                    VoiceMessagePlayer(
                        audioUrl = message.media_url,
                        isOwnMessage = isCurrentUser,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }
                
                // Image/Video content
                else if (!message.media_url.isNullOrEmpty() && message.message_type in listOf("image", "video")) {
                    AsyncImage(
                        model = message.media_url,
                        contentDescription = "Media",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .combinedClickable(
                                onClick = { onMediaClick(message.media_url, message.message_type) }
                            ),
                        contentScale = ContentScale.Crop
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }
                
                // Link preview for URLs in content
                if (!message.is_deleted && message.message_type == "text") {
                    val firstUrl = LinkDetector.getFirstUrl(message.content)
                    if (firstUrl != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        LinkPreview(
                            url = firstUrl,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }
                
                // Message content
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
                
                // Timestamp and status
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = formatMessageTime(message.created_at),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isCurrentUser) PrimaryForeground.copy(alpha = 0.7f) else MutedForeground
                    )
                    
                    if (message.is_starred) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = "Starred",
                            tint = if (isCurrentUser) PrimaryForeground else Primary,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    
                    if (isCurrentUser) {
                        Icon(
                            imageVector = when (message.status) {
                                "read" -> Icons.Default.DoneAll
                                "delivered" -> Icons.Default.DoneAll
                                "sent" -> Icons.Default.Done
                                else -> Icons.Default.Schedule
                            },
                            contentDescription = message.status,
                            tint = if (message.status == "read") Success else PrimaryForeground.copy(alpha = 0.7f),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    
                    if (message.is_edited) {
                        Text(
                            text = "edited",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (isCurrentUser) PrimaryForeground.copy(alpha = 0.7f) else MutedForeground
                        )
                    }
                }
                
                // Reactions display
                if (!message.reactions.isNullOrEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        // Parse reactions JSON and display
                        message.reactions.let { reactionsStr ->
                            // Simple parsing for common emojis (reactions format: "👍,❤️,😂")
                            reactionsStr.split(",").filter { it.isNotBlank() }.forEach { emoji ->
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (isCurrentUser) PrimaryForeground.copy(alpha = 0.2f) else Primary.copy(alpha = 0.2f)
                                ) {
                                    Text(
                                        text = emoji.trim(),
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                            }
                        }
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
                Icon(Icons.Default.AttachFile, "Attach", tint = Primary)
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
                    Icon(Icons.Default.Mic, "Voice Note", tint = Primary)
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
                        Icon(Icons.Default.Send, "Send", tint = Primary)
                    }
                }
            }
        }
    }
}

private fun formatMessageTime(timestamp: String?): String {
    if (timestamp.isNullOrEmpty()) return ""
    return try {
        val instant = Instant.parse(timestamp)
        val date = Date.from(instant)
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
    } catch (e: Exception) {
        ""
    }
}
