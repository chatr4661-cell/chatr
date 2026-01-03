package com.chatr.app.ui.screens.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import com.chatr.app.ui.screens.*
import com.chatr.app.viewmodel.ConversationsViewModel

/**
 * Home screen with bottom navigation
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToChat: (String) -> Unit = {},
    onNavigateToContacts: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    // Legacy/compat: some navigation graphs pass a single route-based callback.
    onNavigate: ((String) -> Unit)? = null,
    viewModel: ConversationsViewModel = hiltViewModel()
) {
    var selectedTab by remember { mutableIntStateOf(0) }

    val navigateToChat: (String) -> Unit = { conversationId ->
        onNavigate?.invoke("chat/$conversationId")
        onNavigateToChat(conversationId)
    }

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
                        onClick = {
                            selectedTab = index
                            // Route-based navigation for legacy graphs
                            onNavigate?.invoke(
                                when (index) {
                                    0 -> "chats"
                                    1 -> "calls"
                                    2 -> "contacts"
                                    3 -> "settings"
                                    else -> "chats"
                                }
                            )
                        }
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
                    onNavigateToChat = navigateToChat,
                    onNavigateToContacts = {
                        onNavigate?.invoke("contacts")
                        onNavigateToContacts()
                    }
                )
                1 -> CallsScreen(
                    onNavigate = { route ->
                        onNavigate?.invoke(route)
                    }
                )
                2 -> ContactsScreen(
                    onNavigate = { route ->
                        onNavigate?.invoke(route)
                        if (route.startsWith("contact/")) {
                            val contactId = route.substringAfter("contact/")
                            navigateToChat(contactId)
                        }
                    }
                )
                3 -> SettingsScreen(
                    onNavigate = { route ->
                        onNavigate?.invoke(route)
                        // If the legacy graph wants to route to settings subpages.
                        onNavigateToSettings()
                    }
                )
            }
        }
    }
}

data class BottomNavItem(
    val label: String,
    val icon: ImageVector
)
