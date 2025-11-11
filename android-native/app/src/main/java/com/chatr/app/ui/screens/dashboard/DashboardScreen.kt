package com.chatr.app.ui.screens.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

/**
 * Dashboard/Home screen for Chatr+ app
 * 
 * Replaces: src/pages/Index.tsx
 * 
 * Features:
 * - Bottom navigation
 * - Quick access to main features
 * - Recent activity
 * - Notifications badge
 * 
 * Migration Status: Phase 2 - Proof of Concept
 * TODO: Add real data from ViewModel
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    navController: NavController
) {
    var selectedTab by remember { mutableStateOf(0) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chatr+") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                ),
                actions = {
                    // Notifications icon
                    IconButton(onClick = { /* TODO: Navigate to notifications */ }) {
                        Badge(
                            content = { Text("3") }
                        ) {
                            Icon(
                                Icons.Default.Notifications,
                                contentDescription = "Notifications"
                            )
                        }
                    }
                    
                    // Settings icon
                    IconButton(onClick = { /* TODO: Navigate to settings */ }) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Home, contentDescription = null) },
                    label = { Text("Home") }
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.ChatBubble, contentDescription = null) },
                    label = { Text("Chats") }
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.Favorite, contentDescription = null) },
                    label = { Text("Health") }
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.Person, contentDescription = null) },
                    label = { Text("Profile") }
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Welcome message
            Text(
                text = "Welcome back!",
                style = MaterialTheme.typography.headlineMedium
            )
            
            // Quick actions grid
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    icon = Icons.Default.ChatBubble,
                    title = "New Chat",
                    modifier = Modifier.weight(1f),
                    onClick = { /* TODO */ }
                )
                QuickActionCard(
                    icon = Icons.Default.Phone,
                    title = "Call",
                    modifier = Modifier.weight(1f),
                    onClick = { /* TODO */ }
                )
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionCard(
                    icon = Icons.Default.LocationOn,
                    title = "Share Location",
                    modifier = Modifier.weight(1f),
                    onClick = { /* TODO */ }
                )
                QuickActionCard(
                    icon = Icons.Default.Add,
                    title = "Invite Friends",
                    modifier = Modifier.weight(1f),
                    onClick = { /* TODO */ }
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Recent activity placeholder
            Text(
                text = "Recent Activity",
                style = MaterialTheme.typography.titleLarge
            )
            
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No recent activity",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun QuickActionCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall
            )
        }
    }
}
