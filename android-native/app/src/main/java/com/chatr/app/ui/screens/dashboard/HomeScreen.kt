package com.chatr.app.ui.screens.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import com.chatr.app.viewmodel.ConversationsViewModel

/**
 * Home screen with bottom navigation
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToChat: (String) -> Unit,
    onNavigateToContacts: () -> Unit,
    onNavigateToSettings: () -> Unit,
    viewModel: ConversationsViewModel = hiltViewModel()
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    
    val tabs = listOf(
        BottomNavItem("Chats", Icons.Default.Chat),
        BottomNavItem("Calls", Icons.Default.Call),
        BottomNavItem("Contacts", Icons.Default.Contacts),
        BottomNavItem("Settings", Icons.Default.Settings)
    )
    
    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEachIndexed { index, item ->
                    NavigationBarItem(
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                        selected = selectedTab == index,
                        onClick = { selectedTab = index }
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (selectedTab) {
                0 -> ChatsScreen(
                    onNavigateToChat = onNavigateToChat,
                    onNavigateToContacts = onNavigateToContacts
                )
                1 -> CallsScreen(
                    onNavigate = { /* Handle navigation */ }
                )
                2 -> ContactsScreen(
                    onNavigate = { route ->
                        if (route.startsWith("contact/")) {
                            val contactId = route.substringAfter("contact/")
                            onNavigateToChat(contactId)
                        }
                    }
                )
                3 -> SettingsScreen(
                    onNavigate = { /* Handle navigation */ }
                )
            }
        }
    }
}

data class BottomNavItem(
    val label: String,
    val icon: ImageVector
)
