package com.chatr.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chatr.app.ui.components.*
import com.chatr.app.ui.theme.*

data class EcosystemItem(
    val title: String,
    val route: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigate: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    
    val ecosystemItems = listOf(
        EcosystemItem("AI Assistant", "ai"),
        EcosystemItem("Universal Search", "search"),
        EcosystemItem("Video Call", "video-call"),
        EcosystemItem("Voice Call", "voice-call"),
        EcosystemItem("Messages", "chats"),
        EcosystemItem("Location Share", "location"),
        EcosystemItem("File Transfer", "files"),
        EcosystemItem("Voice Notes", "voice-notes"),
        EcosystemItem("Groups", "groups"),
        EcosystemItem("Status", "status"),
        EcosystemItem("Wallet", "wallet"),
        EcosystemItem("Settings", "settings")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "CHATR+",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = Foreground
                        )
                        Text(
                            text = "Your All-in-One Ecosystem",
                            style = MaterialTheme.typography.bodySmall,
                            color = MutedForeground
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Background
                ),
                actions = {
                    IconButton(onClick = { onNavigate("profile") }) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = "Profile",
                            tint = Primary
                        )
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Background)
                .padding(padding)
                .verticalScroll(rememberScrollState())
        ) {
            // Header gradient section
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                GradientStart,
                                GradientEnd
                            )
                        )
                    )
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Welcome Back!",
                        style = MaterialTheme.typography.headlineLarge,
                        color = PrimaryForeground,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Explore your connected ecosystem",
                        style = MaterialTheme.typography.bodyMedium,
                        color = PrimaryForeground.copy(alpha = 0.9f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Search bar
            ChatrSearchBar(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = "Search features, contacts, messages...",
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Ecosystem section
            Text(
                text = "Ecosystem",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Foreground,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Ecosystem grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(600.dp)
            ) {
                items(ecosystemItems) { item ->
                    EcosystemCard(
                        title = item.title,
                        icon = when (item.title) {
                            "AI Assistant" -> Icons.Default.AutoAwesome
                            "Universal Search" -> Icons.Default.Search
                            "Video Call" -> Icons.Default.Videocam
                            "Voice Call" -> Icons.Default.Phone
                            "Messages" -> Icons.Default.Message
                            "Location Share" -> Icons.Default.LocationOn
                            "File Transfer" -> Icons.Default.Folder
                            "Voice Notes" -> Icons.Default.Mic
                            "Groups" -> Icons.Default.Group
                            "Status" -> Icons.Default.Update
                            "Wallet" -> Icons.Default.AccountBalanceWallet
                            "Settings" -> Icons.Default.Settings
                            else -> Icons.Default.Apps
                        },
                        onClick = { onNavigate(item.route) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
