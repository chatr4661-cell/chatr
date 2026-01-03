package com.chatr.app.ui.components.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import coil.compose.AsyncImage
import com.chatr.app.data.repository.ConversationItem
import com.chatr.app.ui.theme.*

/**
 * Dialog for forwarding a message to one or more conversations
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForwardMessageDialog(
    isVisible: Boolean,
    messageContent: String,
    conversations: List<ConversationItem>,
    onDismiss: () -> Unit,
    onForward: (List<String>) -> Unit
) {
    if (!isVisible) return
    
    var selectedConversations by remember { mutableStateOf<Set<String>>(emptySet()) }
    var searchQuery by remember { mutableStateOf("") }
    
    val filteredConversations = remember(conversations, searchQuery) {
        if (searchQuery.isEmpty()) {
            conversations
        } else {
            conversations.filter { 
                it.displayName.contains(searchQuery, ignoreCase = true) 
            }
        }
    }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight(0.8f)
    ) {
        Card(
            modifier = Modifier.fillMaxSize(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Card)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                TopAppBar(
                    title = { Text("Forward to") },
                    navigationIcon = {
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, "Close")
                        }
                    },
                    actions = {
                        if (selectedConversations.isNotEmpty()) {
                            TextButton(
                                onClick = { 
                                    onForward(selectedConversations.toList())
                                    onDismiss()
                                }
                            ) {
                                Text(
                                    "Send (${selectedConversations.size})",
                                    color = Primary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Card
                    )
                )
                
                // Message preview
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = Background)
                ) {
                    Text(
                        text = messageContent,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Foreground,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(12.dp)
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Search
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    placeholder = { Text("Search conversations...") },
                    singleLine = true,
                    shape = RoundedCornerShape(24.dp),
                    leadingIcon = {
                        Icon(Icons.Default.Search, null, tint = MutedForeground)
                    },
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Background,
                        unfocusedContainerColor = Background
                    )
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Conversation list
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    items(filteredConversations) { conversation ->
                        ForwardConversationItem(
                            conversation = conversation,
                            isSelected = selectedConversations.contains(conversation.conversation_id),
                            onToggle = {
                                selectedConversations = if (selectedConversations.contains(conversation.conversation_id)) {
                                    selectedConversations - conversation.conversation_id
                                } else {
                                    selectedConversations + conversation.conversation_id
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ForwardConversationItem(
    conversation: ConversationItem,
    isSelected: Boolean,
    onToggle: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onToggle),
        color = if (isSelected) Primary.copy(alpha = 0.1f) else Card
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            if (!conversation.avatarUrl.isNullOrEmpty()) {
                AsyncImage(
                    model = conversation.avatarUrl,
                    contentDescription = "Avatar",
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(Primary),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = conversation.displayName.firstOrNull()?.uppercase() ?: "?",
                        style = MaterialTheme.typography.titleMedium,
                        color = PrimaryForeground,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Text(
                text = conversation.displayName,
                style = MaterialTheme.typography.bodyLarge,
                color = Foreground,
                modifier = Modifier.weight(1f)
            )
            
            Checkbox(
                checked = isSelected,
                onCheckedChange = { onToggle() },
                colors = CheckboxDefaults.colors(
                    checkedColor = Primary,
                    uncheckedColor = MutedForeground
                )
            )
        }
    }
}
