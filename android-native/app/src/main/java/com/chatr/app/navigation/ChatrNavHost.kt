package com.chatr.app.navigation

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.chatr.app.ui.screens.*
import com.chatr.app.ui.screens.dashboard.*

sealed class BottomNavItem(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    object Home : BottomNavItem(
        route = "home",
        title = "Home",
        selectedIcon = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home
    )
    object Chat : BottomNavItem(
        route = "chats",
        title = "Chats",
        selectedIcon = Icons.Filled.Chat,
        unselectedIcon = Icons.Outlined.Chat
    )
    object Contacts : BottomNavItem(
        route = "contacts",
        title = "Contacts",
        selectedIcon = Icons.Filled.Contacts,
        unselectedIcon = Icons.Outlined.Contacts
    )
    object Calls : BottomNavItem(
        route = "calls",
        title = "Calls",
        selectedIcon = Icons.Filled.Call,
        unselectedIcon = Icons.Outlined.Call
    )
    object Settings : BottomNavItem(
        route = "settings",
        title = "Settings",
        selectedIcon = Icons.Filled.Settings,
        unselectedIcon = Icons.Outlined.Settings
    )
}

/**
 * Main Navigation Host with proper routing for all screens
 * Bottom nav shows on main screens, hidden on detail screens
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatrNavHost() {
    val navController = rememberNavController()
    val items = listOf(
        BottomNavItem.Home,
        BottomNavItem.Chat,
        BottomNavItem.Contacts,
        BottomNavItem.Calls,
        BottomNavItem.Settings
    )
    
    // Track if we should show bottom nav (hide on detail screens)
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val showBottomNav = currentRoute in listOf(
        "home", "chats", "contacts", "calls", "settings"
    )

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.onSurface
                ) {
                    val currentDestination = navBackStackEntry?.destination

                    items.forEach { item ->
                        val selected = currentDestination?.hierarchy?.any { it.route == item.route } == true
                        
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = item.title
                                )
                            },
                            label = { Text(item.title) },
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = BottomNavItem.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            // ===== MAIN TABS =====
            composable(BottomNavItem.Home.route) {
                HomeScreen(
                    onNavigateToChat = { conversationId ->
                        navController.navigate("chat/$conversationId")
                    },
                    onNavigateToContacts = {
                        navController.navigate(BottomNavItem.Contacts.route)
                    },
                    onNavigateToSettings = {
                        navController.navigate(BottomNavItem.Settings.route)
                    },
                    onNavigate = { route ->
                        navController.navigate(route)
                    }
                )
            }

            composable(BottomNavItem.Chat.route) {
                ChatsScreen(
                    onNavigateToChat = { conversationId ->
                        navController.navigate("chat/$conversationId")
                    },
                    onNavigateToContacts = {
                        navController.navigate(BottomNavItem.Contacts.route)
                    }
                )
            }

            composable(BottomNavItem.Contacts.route) {
                ContactsScreen(
                    onNavigate = { route ->
                        if (route == "back") {
                            navController.popBackStack()
                        } else {
                            navController.navigate(route)
                        }
                    },
                    onStartChat = { userId ->
                        navController.navigate("chat/$userId")
                    }
                )
            }

            composable(BottomNavItem.Calls.route) {
                CallsScreen(
                    onNavigate = { route ->
                        navController.navigate(route)
                    },
                    onStartCall = { userId, isVideo ->
                        navController.navigate("call/outgoing/$userId?video=$isVideo")
                    }
                )
            }

            composable(BottomNavItem.Settings.route) {
                SettingsScreen(
                    onNavigate = { route ->
                        navController.navigate(route)
                    }
                )
            }

            // ===== CHAT DETAIL =====
            composable(
                route = "chat/{conversationId}",
                arguments = listOf(
                    navArgument("conversationId") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val conversationId = backStackEntry.arguments?.getString("conversationId")
                    ?: return@composable
                ChatDetailScreen(
                    conversationId = conversationId,
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToCall = { callId, isVideo ->
                        navController.navigate("call/ongoing/$callId?video=$isVideo")
                    }
                )
            }

            // ===== CALL SCREENS =====
            composable(
                route = "call/outgoing/{userId}",
                arguments = listOf(
                    navArgument("userId") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val userId = backStackEntry.arguments?.getString("userId") ?: return@composable
                val isVideo = backStackEntry.arguments?.getString("video")?.toBoolean() ?: false
                OutgoingCallScreen(
                    receiverId = userId,
                    isVideo = isVideo,
                    onCallConnected = { callId ->
                        navController.navigate("call/ongoing/$callId?video=$isVideo") {
                            popUpTo("call/outgoing/$userId") { inclusive = true }
                        }
                    },
                    onCallFailed = { navController.popBackStack() }
                )
            }

            composable(
                route = "call/ongoing/{callId}",
                arguments = listOf(
                    navArgument("callId") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val callId = backStackEntry.arguments?.getString("callId") ?: return@composable
                val isVideo = navController.currentBackStackEntry
                    ?.arguments?.getString("video")?.toBoolean() ?: false
                
                if (isVideo) {
                    VideoCallScreen(
                        callerName = "Video Call",
                        localVideoTrack = null,
                        remoteVideoTrack = null,
                        isMuted = false,
                        isVideoEnabled = true,
                        audioRoute = com.chatr.app.webrtc.audio.AudioRoute.SPEAKER,
                        onToggleMute = {},
                        onToggleVideo = {},
                        onSwitchCamera = {},
                        onToggleAudioRoute = {},
                        onEndCall = { navController.popBackStack() }
                    )
                } else {
                    OngoingCallScreen(
                        callerName = "Voice Call",
                        isMuted = false,
                        audioRoute = com.chatr.app.webrtc.audio.AudioRoute.EARPIECE,
                        onToggleMute = {},
                        onToggleAudioRoute = {},
                        onEndCall = { navController.popBackStack() }
                    )
                }
            }

            // ===== FEATURE SCREENS (Native) =====
            composable("ai") {
                AIScreen(onNavigateBack = { navController.popBackStack() })
            }
            
            composable("games") {
                GamesScreen(
                    onNavigateToGame = { gameId ->
                        navController.navigate("games/$gameId")
                    },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            
            composable(
                route = "games/{gameId}",
                arguments = listOf(navArgument("gameId") { type = NavType.StringType })
            ) { backStackEntry ->
                val gameId = backStackEntry.arguments?.getString("gameId") ?: return@composable
                GameDetailScreen(
                    gameId = gameId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            
            composable("health") {
                HealthHubScreen(onNavigateBack = { navController.popBackStack() })
            }
            
            composable("food") {
                FoodOrderingScreen(onNavigateBack = { navController.popBackStack() })
            }
            
            composable("jobs") {
                LocalJobsScreen(onNavigateBack = { navController.popBackStack() })
            }
            
            composable("wallet") {
                WalletScreen(onNavigateBack = { navController.popBackStack() })
            }
            
            composable("stories") {
                StoriesScreen(
                    onNavigateToViewStory = { userId ->
                        navController.navigate("stories/$userId")
                    },
                    onNavigateToCreate = {
                        navController.navigate("stories/create")
                    }
                )
            }
            
            composable("stories/create") {
                CreateStoryScreen(onNavigateBack = { navController.popBackStack() })
            }
            
            composable(
                route = "stories/{userId}",
                arguments = listOf(navArgument("userId") { type = NavType.StringType })
            ) { backStackEntry ->
                val userId = backStackEntry.arguments?.getString("userId") ?: return@composable
                ViewStoryScreen(
                    userId = userId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            
            composable("profile") {
                ProfileScreen(onNavigateBack = { navController.popBackStack() })
            }
            
            composable("dhandha") {
                DhandhaScreen(onNavigateBack = { navController.popBackStack() })
            }
            
            composable("new-group") {
                CreateGroupScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onGroupCreated = { groupId ->
                        navController.navigate("chat/$groupId") {
                            popUpTo("new-group") { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}

/**
 * Outgoing call screen stub
 */
@Composable
private fun OutgoingCallScreen(
    receiverId: String,
    isVideo: Boolean,
    onCallConnected: (String) -> Unit,
    onCallFailed: () -> Unit
) {
    // TODO: Implement actual outgoing call logic
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = androidx.compose.ui.Alignment.Center
    ) {
        Text("Calling...")
    }
}

/**
 * AI Screen native implementation
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AIScreen(onNavigateBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI Assistant") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.AutoAwesome,
                contentDescription = null,
                modifier = Modifier.size(72.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text("AI Assistant", style = MaterialTheme.typography.headlineMedium)
            Text("Ask me anything!", style = MaterialTheme.typography.bodyLarge)
        }
    }
}

/**
 * Dhandha Screen native implementation
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DhandhaScreen(onNavigateBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dhandha") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.Store,
                contentDescription = null,
                modifier = Modifier.size(72.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text("Dhandha", style = MaterialTheme.typography.headlineMedium)
            Text("Your business ecosystem", style = MaterialTheme.typography.bodyLarge)
        }
    }
}
