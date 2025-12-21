package com.chatr.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
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
import com.chatr.app.data.repository.ConversationItem
import com.chatr.app.ui.components.ChatrSearchBar
import com.chatr.app.ui.theme.*
import com.chatr.app.viewmodel.ConversationsViewModel
import java.text.SimpleDateFormat
import java.time.Instant
import java.util.*

/**
 * ChatsScreen - Shows list of conversations from the backend
 * Uses SupabaseRpcRepository.getConversations() which calls get_user_conversations() RPC
 * This provides the same data as the web app
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatsScreen(
    onNavigateToChat: (String) -> Unit = {},
    onNavigateToContacts: () -> Unit = {},
    onNavigate: ((String) -> Unit)? = null, // Legacy support
    viewModel: ConversationsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    
    // Filter conversations by search query
    val filteredConversations = remember(state.conversations, searchQuery) {
        if (searchQuery.isEmpty()) {
            state.conversations
        } else {
            state.conversations.filter { 
                it.displayName.contains(searchQuery, ignoreCase = true) ||
                it.last_message?.contains(searchQuery, ignoreCase = true) == true
            }
        }
    }
    
    // Refresh on pull
    LaunchedEffect(Unit) {
        viewModel.loadConversations()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Chats",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Background
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { 
                    onNavigate?.invoke("new-chat") 
                    onNavigateToContacts()
                },
                containerColor = Primary,
                contentColor = PrimaryForeground
            ) {
                Icon(
                    imageVector = Icons.Default.Edit,
                    contentDescription = "New Chat"
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Background)
                .padding(padding)
        ) {
            // Search bar
            ChatrSearchBar(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = "Search chats, contacts...",
                modifier = Modifier.padding(16.dp)
            )

            // Error message
            state.error?.let { error ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
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
                        TextButton(onClick = { viewModel.loadConversations() }) {
                            Text("Retry", color = Primary)
                        }
                    }
                }
            }

            // Loading indicator
            if (state.isLoading && state.conversations.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Primary)
                }
            } else if (filteredConversations.isEmpty() && !state.isLoading) {
                // Empty state
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = if (searchQuery.isNotEmpty()) "No results found" else "No conversations yet",
                            style = MaterialTheme.typography.titleMedium,
                            color = MutedForeground
                        )
                        if (searchQuery.isEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Start a new chat to get started",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MutedForeground
                            )
                        }
                    }
                }
            } else {
                // Conversations list
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    items(
                        items = filteredConversations,
                        key = { it.conversation_id }
                    ) { conversation ->
                        ConversationRow(
                            conversation = conversation,
                            onClick = {
                                onNavigateToChat(conversation.conversation_id)
                                onNavigate?.invoke("chat/${conversation.conversation_id}")
                            }
                        )
                    }
                }
            }
        }
    }
}

/**
 * Single conversation row item
 */
@Composable
private fun ConversationRow(
    conversation: ConversationItem,
    onClick: () -> Unit
) {
    val avatarColors = listOf(
        Primary,
        Secondary,
        Accent,
        Warning,
        Success
    )
    val colorIndex = conversation.displayName.hashCode().let { kotlin.math.abs(it) % avatarColors.size }
    val avatarColor = avatarColors[colorIndex]
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Card),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            Box {
                if (!conversation.avatarUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model = conversation.avatarUrl,
                        contentDescription = "Avatar",
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(avatarColor),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = conversation.displayName.firstOrNull()?.uppercase() ?: "?",
                            style = MaterialTheme.typography.titleLarge,
                            color = PrimaryForeground,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                
                // Online indicator
                if (conversation.other_user_online) {
                    Box(
                        modifier = Modifier
                            .size(14.dp)
                            .clip(CircleShape)
                            .background(Background)
                            .padding(2.dp)
                            .clip(CircleShape)
                            .background(Success)
                            .align(Alignment.BottomEnd)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Chat info
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = conversation.displayName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = if (conversation.unread_count > 0) FontWeight.Bold else FontWeight.SemiBold,
                        color = Foreground,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    
                    conversation.last_message_at?.let { timestamp ->
                        Text(
                            text = formatTimestamp(timestamp),
                            style = MaterialTheme.typography.bodySmall,
                            color = if (conversation.unread_count > 0) Primary else MutedForeground
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = conversation.last_message ?: "No messages yet",
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (conversation.unread_count > 0) Foreground else MutedForeground,
                        fontWeight = if (conversation.unread_count > 0) FontWeight.Medium else FontWeight.Normal,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )

                    if (conversation.unread_count > 0) {
                        Box(
                            modifier = Modifier
                                .padding(start = 8.dp)
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(Primary),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (conversation.unread_count > 99) "99+" else conversation.unread_count.toString(),
                                style = MaterialTheme.typography.labelSmall,
                                color = PrimaryForeground,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Format ISO timestamp to relative time
 */
private fun formatTimestamp(isoTimestamp: String): String {
    return try {
        val instant = Instant.parse(isoTimestamp)
        val timestamp = instant.toEpochMilli()
        val now = System.currentTimeMillis()
        val diff = now - timestamp
        
        when {
            diff < 60000 -> "Just now"
            diff < 3600000 -> "${diff / 60000}m"
            diff < 86400000 -> "${diff / 3600000}h"
            diff < 604800000 -> "${diff / 86400000}d"
            else -> SimpleDateFormat("MMM dd", Locale.getDefault()).format(Date(timestamp))
        }
    } catch (e: Exception) {
        ""
    }
}
