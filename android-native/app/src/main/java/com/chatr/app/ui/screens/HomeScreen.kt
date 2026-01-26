package com.chatr.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.chatr.app.ui.components.*
import com.chatr.app.ui.theme.*
import com.chatr.app.viewmodel.AuthViewModel

/**
 * Quick action item for ecosystem grid
 */
data class QuickAction(
    val title: String,
    val icon: ImageVector,
    val route: String,
    val isPrimary: Boolean = false
)

/**
 * HomeScreen - Main dashboard with quick actions
 * Fixed to match NavGraph signature expectations
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    // Match NavGraph.kt expectations
    onNavigateToChat: (String) -> Unit = {},
    onNavigateToContacts: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    // Legacy support
    onNavigate: ((String) -> Unit)? = null,
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val authState by authViewModel.authState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    
    // Quick actions grid
    val quickActions = remember {
        listOf(
            QuickAction("Chats", Icons.Default.Chat, "chats", true),
            QuickAction("Contacts", Icons.Default.Contacts, "contacts", true),
            QuickAction("Calls", Icons.Default.Call, "calls", true),
            QuickAction("Dhandha", Icons.Default.Store, "dhandha"),
            QuickAction("AI Assistant", Icons.Default.AutoAwesome, "ai"),
            QuickAction("Games", Icons.Default.SportsEsports, "games"),
            QuickAction("Health Hub", Icons.Default.HealthAndSafety, "health"),
            QuickAction("Food", Icons.Default.Restaurant, "food"),
            QuickAction("Local Jobs", Icons.Default.Work, "jobs"),
            QuickAction("Wallet", Icons.Default.AccountBalanceWallet, "wallet"),
            QuickAction("Stories", Icons.Default.PhotoCamera, "stories"),
            QuickAction("Settings", Icons.Default.Settings, "settings")
        )
    }

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
                    IconButton(onClick = { 
                        onNavigateToSettings()
                        onNavigate?.invoke("profile") 
                    }) {
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
                    .height(160.dp)
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
                        text = authState.userName ?: "Explore your connected ecosystem",
                        style = MaterialTheme.typography.bodyMedium,
                        color = PrimaryForeground.copy(alpha = 0.9f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Search bar
            ChatrSearchBar(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = "Search features, contacts, messages...",
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Primary actions row
            Text(
                text = "Quick Actions",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Foreground,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(quickActions.filter { it.isPrimary }) { action ->
                    PrimaryActionCard(
                        title = action.title,
                        icon = action.icon,
                        onClick = { 
                            when (action.route) {
                                "contacts" -> onNavigateToContacts()
                                "settings" -> onNavigateToSettings()
                                else -> onNavigate?.invoke(action.route)
                            }
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Ecosystem section
            Text(
                text = "Ecosystem",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Foreground,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Ecosystem grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(320.dp)
            ) {
                items(quickActions.filter { !it.isPrimary }) { action ->
                    EcosystemCard(
                        title = action.title,
                        icon = action.icon,
                        onClick = { 
                            when (action.route) {
                                "contacts" -> onNavigateToContacts()
                                "settings" -> onNavigateToSettings()
                                else -> onNavigate?.invoke(action.route)
                            }
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun PrimaryActionCard(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(100.dp)
            .height(100.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Primary),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = PrimaryForeground,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                color = PrimaryForeground,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun EcosystemCard(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Card),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = Primary,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = Foreground,
                fontWeight = FontWeight.Medium
            )
        }
    }
}
