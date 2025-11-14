package com.chatr.app.ui.screens

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chatr.app.ui.components.ChatrSearchBar
import com.chatr.app.ui.theme.*

data class Contact(
    val id: String,
    val name: String,
    val phoneNumber: String,
    val isOnChatr: Boolean = false,
    val isOnline: Boolean = false,
    val avatarUrl: String? = null,
    val status: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContactsScreen(
    onNavigate: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var showSyncDialog by remember { mutableStateOf(false) }
    
    val contacts = remember {
        listOf(
            Contact("1", "Alice Johnson", "+1 234 567 8901", true, true, status = "Available"),
            Contact("2", "Bob Smith", "+1 234 567 8902", true, false),
            Contact("3", "Charlie Brown", "+1 234 567 8903", true, true, status = "In a meeting"),
            Contact("4", "Diana Prince", "+1 234 567 8904", false, false),
            Contact("5", "Ethan Hunt", "+1 234 567 8905", true, true),
            Contact("6", "Fiona Gallagher", "+1 234 567 8906", true, false),
            Contact("7", "George Wilson", "+1 234 567 8907", false, false),
            Contact("8", "Hannah Montana", "+1 234 567 8908", true, true, status = "Busy")
        )
    }

    val filteredContacts = contacts.filter {
        searchQuery.isEmpty() || it.name.contains(searchQuery, ignoreCase = true)
    }

    val groupedContacts = filteredContacts.groupBy { it.name.first().uppercaseChar() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Contacts",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Background
                ),
                actions = {
                    IconButton(onClick = { showSyncDialog = true }) {
                        Icon(
                            imageVector = Icons.Default.Sync,
                            contentDescription = "Sync Contacts",
                            tint = Primary
                        )
                    }
                    IconButton(onClick = { onNavigate("search") }) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = Primary
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { onNavigate("add-contact") },
                containerColor = Primary,
                contentColor = PrimaryForeground
            ) {
                Icon(
                    imageVector = Icons.Default.PersonAdd,
                    contentDescription = "Add Contact"
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
                placeholder = "Search contacts...",
                modifier = Modifier.padding(16.dp)
            )

            // Contacts count
            Text(
                text = "${contacts.count { it.isOnChatr }} on CHATR • ${contacts.size} total",
                style = MaterialTheme.typography.bodySmall,
                color = MutedForeground,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Contacts list
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
            ) {
                groupedContacts.forEach { (letter, contactsInGroup) ->
                    item {
                        Text(
                            text = letter.toString(),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Primary,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }
                    
                    items(contactsInGroup) { contact ->
                        ContactRow(
                            contact = contact,
                            onClick = { onNavigate("contact/${contact.id}") }
                        )
                    }
                }
            }
        }
    }

    if (showSyncDialog) {
        AlertDialog(
            onDismissRequest = { showSyncDialog = false },
            title = { Text("Sync Contacts") },
            text = { Text("Allow CHATR to access your contacts to find friends using the app?") },
            confirmButton = {
                TextButton(onClick = { showSyncDialog = false }) {
                    Text("Allow", color = Primary)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSyncDialog = false }) {
                    Text("Cancel", color = MutedForeground)
                }
            }
        )
    }
}

@Composable
fun ContactRow(
    contact: Contact,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = Card
        ),
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
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(
                            if (contact.isOnChatr) Primary.copy(alpha = 0.3f)
                            else Muted
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = contact.name.first().toString(),
                        style = MaterialTheme.typography.titleLarge,
                        color = if (contact.isOnChatr) Primary else MutedForeground,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                if (contact.isOnline && contact.isOnChatr) {
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .clip(CircleShape)
                            .background(Success)
                            .align(Alignment.BottomEnd)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Contact info
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = contact.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Foreground
                )

                Spacer(modifier = Modifier.height(4.dp))

                if (contact.isOnChatr && contact.status != null) {
                    Text(
                        text = contact.status,
                        style = MaterialTheme.typography.bodySmall,
                        color = MutedForeground
                    )
                } else if (contact.isOnChatr) {
                    Text(
                        text = "On CHATR",
                        style = MaterialTheme.typography.bodySmall,
                        color = Primary
                    )
                } else {
                    Text(
                        text = contact.phoneNumber,
                        style = MaterialTheme.typography.bodySmall,
                        color = MutedForeground
                    )
                }
            }

            // Action buttons
            if (contact.isOnChatr) {
                Row {
                    IconButton(
                        onClick = { /* Start chat */ },
                        modifier = Modifier.size(40.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Message,
                            contentDescription = "Message",
                            tint = Primary
                        )
                    }
                    IconButton(
                        onClick = { /* Start call */ },
                        modifier = Modifier.size(40.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Phone,
                            contentDescription = "Call",
                            tint = Primary
                        )
                    }
                }
            } else {
                TextButton(onClick = { /* Invite */ }) {
                    Text("Invite", color = Primary)
                }
            }
        }
    }
}
