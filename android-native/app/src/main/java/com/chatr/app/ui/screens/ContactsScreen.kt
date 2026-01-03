package com.chatr.app.ui.screens

import android.Manifest
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.chatr.app.data.api.Contact
import com.chatr.app.ui.components.ChatrSearchBar
import com.chatr.app.ui.theme.*
import com.chatr.app.viewmodel.ContactsViewModel

/**
 * Contacts Screen - Complete "Who's on CHATR" + Invite implementation
 * 
 * Features:
 * 1. Permission handling for contacts access
 * 2. "On CHATR" section - Tap to start chat
 * 3. "Invite to CHATR" section - Tap to send SMS invite
 * 4. Search contacts
 * 5. Pull to refresh
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContactsScreen(
    onNavigate: (String) -> Unit = {},
    onNavigateBack: (() -> Unit)? = null,
    onStartChat: ((String) -> Unit)? = null,
    viewModel: ContactsViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    
    var searchQuery by remember { mutableStateOf("") }
    var showSearch by remember { mutableStateOf(false) }
    
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            viewModel.discoverContacts()
        }
    }
    
    LaunchedEffect(Unit) {
        if (viewModel.hasContactPermission()) {
            viewModel.discoverContacts()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    if (showSearch) {
                        TextField(
                            value = searchQuery,
                            onValueChange = { 
                                searchQuery = it
                                viewModel.searchContacts(it)
                            },
                            placeholder = { Text("Search contacts...") },
                            singleLine = true,
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = androidx.compose.ui.graphics.Color.Transparent,
                                unfocusedContainerColor = androidx.compose.ui.graphics.Color.Transparent
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        Column {
                            Text(
                                text = "Select contact",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            if (state.registeredCount > 0) {
                                Text(
                                    text = "${state.registeredCount} contacts on CHATR",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MutedForeground
                                )
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (showSearch) {
                            showSearch = false
                            searchQuery = ""
                            viewModel.clearSearch()
                        } else {
                            onNavigateBack?.invoke() ?: onNavigate("back")
                        }
                    }) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showSearch = !showSearch }) {
                        Icon(
                            if (showSearch) Icons.Default.Close else Icons.Default.Search,
                            "Search",
                            tint = Primary
                        )
                    }
                    IconButton(onClick = { viewModel.discoverContacts() }) {
                        Icon(Icons.Default.Refresh, "Refresh", tint = Primary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Background)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { onNavigate("add-contact") },
                containerColor = Primary,
                contentColor = PrimaryForeground
            ) {
                Icon(Icons.Default.PersonAdd, "Add Contact")
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                !viewModel.hasContactPermission() -> {
                    // Permission request UI
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.Contacts,
                            contentDescription = null,
                            modifier = Modifier.size(72.dp),
                            tint = Primary
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Find your friends on CHATR",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Allow CHATR to access your contacts to see which friends are already using the app",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MutedForeground,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        Button(
                            onClick = {
                                permissionLauncher.launch(Manifest.permission.READ_CONTACTS)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Primary)
                        ) {
                            Text("Allow Access")
                        }
                    }
                }
                
                state.isLoading -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(color = Primary)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Finding contacts on CHATR...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MutedForeground
                        )
                    }
                }
                
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(vertical = 8.dp)
                    ) {
                        // New Group option
                        item {
                            ListItem(
                                headlineContent = { 
                                    Text("New group", fontWeight = FontWeight.Medium) 
                                },
                                leadingContent = {
                                    Box(
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(CircleShape)
                                            .background(Primary),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            Icons.Default.Group,
                                            "New group",
                                            tint = PrimaryForeground
                                        )
                                    }
                                },
                                modifier = Modifier.clickable { onNavigate("new-group") }
                            )
                        }
                        
                        // New Contact option
                        item {
                            ListItem(
                                headlineContent = { 
                                    Text("New contact", fontWeight = FontWeight.Medium) 
                                },
                                leadingContent = {
                                    Box(
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(CircleShape)
                                            .background(Primary),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            Icons.Default.PersonAdd,
                                            "New contact",
                                            tint = PrimaryForeground
                                        )
                                    }
                                },
                                modifier = Modifier.clickable { onNavigate("add-contact") }
                            )
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                        }
                        
                        // "On CHATR" section
                        val registeredContacts = state.registeredContacts
                        if (registeredContacts.isNotEmpty()) {
                            item {
                                Text(
                                    text = "Contacts on CHATR",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = Primary,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                                )
                            }
                            
                            items(
                                items = registeredContacts,
                                key = { it.id }
                            ) { contact ->
                                ContactItemRow(
                                    contact = contact,
                                    isRegistered = true,
                                    onClick = { 
                                        onStartChat?.invoke(contact.contactUserId ?: contact.id) 
                                            ?: onNavigate("chat/${contact.contactUserId ?: contact.id}")
                                    }
                                )
                            }
                            
                            item {
                                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                            }
                        }
                        
                        // "Invite to CHATR" section
                        val unregisteredContacts = state.unregisteredContacts
                        if (unregisteredContacts.isNotEmpty()) {
                            item {
                                Text(
                                    text = "Invite to CHATR",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = MutedForeground,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                                )
                            }
                            
                            items(
                                items = unregisteredContacts,
                                key = { it.id }
                            ) { contact ->
                                ContactItemRow(
                                    contact = contact,
                                    isRegistered = false,
                                    onClick = {
                                        // Send invite via SMS
                                        val message = viewModel.generateInviteMessage(contact.contactName)
                                        val intent = Intent(Intent.ACTION_VIEW).apply {
                                            data = Uri.parse("sms:${contact.contactPhone}")
                                            putExtra("sms_body", message)
                                        }
                                        context.startActivity(intent)
                                    }
                                )
                            }
                        }
                        
                        // Empty state
                        if (registeredContacts.isEmpty() && unregisteredContacts.isEmpty()) {
                            item {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(32.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        Icons.Default.SearchOff,
                                        contentDescription = null,
                                        modifier = Modifier.size(48.dp),
                                        tint = MutedForeground
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "No contacts found",
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = MutedForeground
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
private fun ContactItemRow(
    contact: com.chatr.app.data.api.ContactResponse,
    isRegistered: Boolean,
    onClick: () -> Unit
) {
    ListItem(
        headlineContent = {
            Text(
                text = contact.contactName,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        },
        supportingContent = {
            if (isRegistered && contact.isOnline) {
                Text(
                    text = "Online",
                    style = MaterialTheme.typography.bodySmall,
                    color = Success
                )
            } else {
                Text(
                    text = contact.contactPhone ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedForeground
                )
            }
        },
        leadingContent = {
            Box(
                modifier = Modifier.size(48.dp)
            ) {
                if (contact.avatarUrl != null) {
                    AsyncImage(
                        model = contact.avatarUrl,
                        contentDescription = contact.contactName,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape)
                            .background(if (isRegistered) Primary else Muted),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = contact.contactName.firstOrNull()?.uppercase() ?: "?",
                            style = MaterialTheme.typography.titleMedium,
                            color = if (isRegistered) PrimaryForeground else MutedForeground,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                
                // Online indicator
                if (isRegistered && contact.isOnline) {
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
        },
        trailingContent = {
            if (!isRegistered) {
                Text(
                    text = "Invite",
                    style = MaterialTheme.typography.labelMedium,
                    color = Primary,
                    fontWeight = FontWeight.Bold
                )
            }
        },
        modifier = Modifier.clickable(onClick = onClick)
    )
}
