package com.chatr.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.chatr.app.ui.screens.*
import com.chatr.app.ui.screens.dashboard.*
import com.chatr.app.viewmodel.AuthViewModel
import com.chatr.app.webrtc.audio.AudioRoute

/**
 * Navigation Routes
 */
sealed class Screen(val route: String) {
    // Auth
    object Splash : Screen("splash")
    object Auth : Screen("auth")
    object Pin : Screen("pin")
    object WebAuth : Screen("web_auth")
    object Onboarding : Screen("onboarding")
    
    // Main
    object Home : Screen("home")
    object Chats : Screen("chats")
    object ChatDetail : Screen("chat/{conversationId}") {
        fun createRoute(conversationId: String) = "chat/$conversationId"
    }
    object Contacts : Screen("contacts")
    object Calls : Screen("calls")
    object Settings : Screen("settings")
    object Profile : Screen("profile")
    
    // Calls
    object IncomingCall : Screen("call/incoming/{callId}") {
        fun createRoute(callId: String) = "call/incoming/$callId"
    }
    object OngoingCall : Screen("call/ongoing/{callId}") {
        fun createRoute(callId: String) = "call/ongoing/$callId"
    }
    object VideoCall : Screen("call/video/{callId}") {
        fun createRoute(callId: String) = "call/video/$callId"
    }
    
    // Features
    object AIAssistant : Screen("ai_assistant")
    object AIBrowser : Screen("ai_browser")
    object ChatrWorld : Screen("chatr_world")
    object LocalJobs : Screen("local_jobs")
    object LocalHealthcare : Screen("local_healthcare")
    object FoodOrdering : Screen("food_ordering")
    object LocalDeals : Screen("local_deals")
    object HealthHub : Screen("health_hub")
    object StealthMode : Screen("stealth_mode")
    object Studio : Screen("studio")
    object Games : Screen("games")
    object GameDetail : Screen("games/{gameId}") {
        fun createRoute(gameId: String) = "games/$gameId"
    }
    object Points : Screen("points")
    object Wallet : Screen("wallet")
    
    // Stories
    object Stories : Screen("stories")
    object CreateStory : Screen("stories/create")
    object ViewStory : Screen("stories/{userId}") {
        fun createRoute(userId: String) = "stories/$userId"
    }
    
    // Groups
    object CreateGroup : Screen("group/create")
    object GroupSettings : Screen("group/{groupId}/settings") {
        fun createRoute(groupId: String) = "group/$groupId/settings"
    }
    
    // QR
    object QRScanner : Screen("qr_scanner")
    object QRLogin : Screen("qr_login")
    
    // Referral
    object Join : Screen("join")
}

/**
 * Main Navigation Graph
 */
@Composable
fun ChatrNavGraph(
    navController: NavHostController = rememberNavController(),
    startDestination: String = Screen.Splash.route
) {
    val authViewModel: AuthViewModel = hiltViewModel()
    val authState by authViewModel.authState.collectAsState()
    
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Auth Flow
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToAuth = { 
                    navController.navigate(Screen.Auth.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToHome = { 
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Auth.route) {
            AuthScreen(
                navController = navController
            )
        }
        
        composable(Screen.Pin.route) {
            PinScreen(
                navController = navController,
                onPinSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Pin.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                onComplete = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Auth.route) { inclusive = true }
                    }
                }
            )
        }
        
        // Main Screens
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToChat = { conversationId ->
                    navController.navigate(Screen.ChatDetail.createRoute(conversationId))
                },
                onNavigateToContacts = {
                    navController.navigate(Screen.Contacts.route)
                },
                onNavigateToSettings = {
                    navController.navigate(Screen.Settings.route)
                }
            )
        }
        
        composable(Screen.Chats.route) {
            ChatsScreen(
                onNavigateToChat = { conversationId ->
                    navController.navigate(Screen.ChatDetail.createRoute(conversationId))
                },
                onNavigateToContacts = {
                    navController.navigate(Screen.Contacts.route)
                }
            )
        }
        
        composable(
            route = Screen.ChatDetail.route,
            arguments = listOf(
                navArgument("conversationId") { type = NavType.StringType }
            ),
            deepLinks = listOf(
                navDeepLink { uriPattern = "chatr://chat/{conversationId}" },
                navDeepLink { uriPattern = "https://chatr.chat/chat/{conversationId}" }
            )
        ) { backStackEntry ->
            val conversationId = backStackEntry.arguments?.getString("conversationId") ?: return@composable
            ChatDetailScreen(
                conversationId = conversationId,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToCall = { callId, isVideo ->
                    if (isVideo) {
                        navController.navigate(Screen.VideoCall.createRoute(callId))
                    } else {
                        navController.navigate(Screen.OngoingCall.createRoute(callId))
                    }
                }
            )
        }
        
        composable(Screen.Contacts.route) {
            ContactsScreen(
                onNavigate = { route ->
                    if (route.startsWith("contact/")) {
                        // Handle contact detail navigation
                    } else {
                        navController.navigate(route)
                    }
                }
            )
        }
        
        composable(Screen.Calls.route) {
            CallsScreen(
                onNavigate = { route ->
                    navController.navigate(route)
                }
            )
        }
        
        composable(Screen.Settings.route) {
            SettingsScreen(
                onNavigate = { route ->
                    when (route) {
                        "profile" -> navController.navigate(Screen.Profile.route)
                        else -> { /* Handle other settings routes */ }
                    }
                }
            )
        }
        
        composable(Screen.Profile.route) {
            ProfileScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        // Call Screens
        composable(
            route = Screen.IncomingCall.route,
            arguments = listOf(
                navArgument("callId") { type = NavType.StringType }
            ),
            deepLinks = listOf(
                navDeepLink { uriPattern = "chatr://call/incoming/{callId}" }
            )
        ) { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId") ?: return@composable
            IncomingCallScreen(
                callerName = "Incoming Call",
                callerAvatar = null,
                isVideo = false,
                onAccept = {
                    navController.navigate(Screen.OngoingCall.createRoute(callId)) {
                        popUpTo(Screen.IncomingCall.route) { inclusive = true }
                    }
                },
                onReject = { navController.popBackStack() }
            )
        }
        
        composable(
            route = Screen.OngoingCall.route,
            arguments = listOf(
                navArgument("callId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId") ?: return@composable
            var isMuted by remember { mutableStateOf(false) }
            var audioRoute by remember { mutableStateOf(AudioRoute.EARPIECE) }
            
            OngoingCallScreen(
                callerName = "Call",
                isMuted = isMuted,
                audioRoute = audioRoute,
                onToggleMute = { isMuted = !isMuted },
                onToggleAudioRoute = {
                    audioRoute = when (audioRoute) {
                        AudioRoute.EARPIECE -> AudioRoute.SPEAKER
                        AudioRoute.SPEAKER -> AudioRoute.EARPIECE
                        else -> AudioRoute.EARPIECE
                    }
                },
                onEndCall = { navController.popBackStack() }
            )
        }
        
        composable(
            route = Screen.VideoCall.route,
            arguments = listOf(
                navArgument("callId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId") ?: return@composable
            var isMuted by remember { mutableStateOf(false) }
            var isVideoEnabled by remember { mutableStateOf(true) }
            var audioRoute by remember { mutableStateOf(AudioRoute.SPEAKER) }
            
            VideoCallScreen(
                callerName = "Video Call",
                localVideoTrack = null,
                remoteVideoTrack = null,
                isMuted = isMuted,
                isVideoEnabled = isVideoEnabled,
                audioRoute = audioRoute,
                onToggleMute = { isMuted = !isMuted },
                onToggleVideo = { isVideoEnabled = !isVideoEnabled },
                onSwitchCamera = { /* TODO */ },
                onToggleAudioRoute = {
                    audioRoute = when (audioRoute) {
                        AudioRoute.SPEAKER -> AudioRoute.EARPIECE
                        AudioRoute.EARPIECE -> AudioRoute.SPEAKER
                        else -> AudioRoute.SPEAKER
                    }
                },
                onEndCall = { navController.popBackStack() }
            )
        }
        
        // Feature Screens - Placeholders
        composable(Screen.AIAssistant.route) {
            AIAssistantScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(Screen.AIBrowser.route) {
            AIBrowserScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(Screen.ChatrWorld.route) {
            ChatrWorldScreen(navController = navController)
        }
        
        composable(Screen.LocalJobs.route) {
            LocalJobsScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(Screen.LocalHealthcare.route) {
            LocalHealthcareScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(Screen.FoodOrdering.route) {
            FoodOrderingScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(Screen.LocalDeals.route) {
            LocalDealsScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(Screen.HealthHub.route) {
            HealthHubScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(Screen.StealthMode.route) {
            StealthModeScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(Screen.Studio.route) {
            StudioScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(Screen.Games.route) {
            GamesScreen(
                onNavigateToGame = { gameId ->
                    navController.navigate(Screen.GameDetail.createRoute(gameId))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(
            route = Screen.GameDetail.route,
            arguments = listOf(
                navArgument("gameId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val gameId = backStackEntry.arguments?.getString("gameId") ?: return@composable
            GameDetailScreen(
                gameId = gameId,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Points.route) {
            PointsScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(Screen.Wallet.route) {
            WalletScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        // Stories
        composable(Screen.Stories.route) {
            StoriesScreen(
                onNavigateToViewStory = { userId ->
                    navController.navigate(Screen.ViewStory.createRoute(userId))
                },
                onNavigateToCreate = {
                    navController.navigate(Screen.CreateStory.route)
                }
            )
        }
        
        composable(Screen.CreateStory.route) {
            CreateStoryScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(
            route = Screen.ViewStory.route,
            arguments = listOf(
                navArgument("userId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: return@composable
            ViewStoryScreen(
                userId = userId,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        // Groups
        composable(Screen.CreateGroup.route) {
            CreateGroupScreen(
                onNavigateBack = { navController.popBackStack() },
                onGroupCreated = { groupId ->
                    navController.navigate(Screen.ChatDetail.createRoute(groupId)) {
                        popUpTo(Screen.CreateGroup.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(
            route = Screen.GroupSettings.route,
            arguments = listOf(
                navArgument("groupId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            GroupSettingsScreen(
                groupId = groupId,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        // QR
        composable(Screen.QRScanner.route) {
            QRScannerScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        composable(Screen.QRLogin.route) {
            QRLoginScreen(onNavigateBack = { navController.popBackStack() })
        }
        
        // Referral - Join screen with deep link support
        composable(
            route = Screen.Join.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "chatr://join" },
                navDeepLink { uriPattern = "https://chatr.chat/join?ref={referralCode}" }
            )
        ) {
            JoinScreen(
                onNavigateToAuth = {
                    navController.navigate(Screen.Auth.route)
                }
            )
        }
    }
}
