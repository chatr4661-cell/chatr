package com.chatr.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.chatr.app.ui.screens.*
import com.chatr.app.ui.screens.auth.*
import com.chatr.app.ui.screens.dashboard.*
import com.chatr.app.viewmodel.AuthViewModel

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
    val isAuthenticated by authViewModel.isAuthenticated.collectAsState()
    val isOnboardingComplete by authViewModel.isOnboardingComplete.collectAsState()
    
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Auth Flow
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToAuth = { navController.navigate(Screen.Auth.route) },
                onNavigateToHome = { navController.navigate(Screen.Home.route) },
                onNavigateToPin = { navController.navigate(Screen.Pin.route) }
            )
        }
        
        composable(Screen.Auth.route) {
            AuthScreen(
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Auth.route) { inclusive = true }
                    }
                },
                onNavigateToOnboarding = {
                    navController.navigate(Screen.Onboarding.route)
                }
            )
        }
        
        composable(Screen.Pin.route) {
            PinScreen(
                onSuccess = {
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
                navController = navController
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
                onNavigateToChat = { conversationId ->
                    navController.navigate(Screen.ChatDetail.createRoute(conversationId))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Calls.route) {
            CallsScreen(
                onNavigateToCall = { callId, isVideo ->
                    if (isVideo) {
                        navController.navigate(Screen.VideoCall.createRoute(callId))
                    } else {
                        navController.navigate(Screen.OngoingCall.createRoute(callId))
                    }
                }
            )
        }
        
        composable(Screen.Settings.route) {
            SettingsScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToProfile = { navController.navigate(Screen.Profile.route) },
                onLogout = {
                    navController.navigate(Screen.Auth.route) {
                        popUpTo(0) { inclusive = true }
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
                callId = callId,
                onAnswer = {
                    navController.navigate(Screen.OngoingCall.createRoute(callId)) {
                        popUpTo(Screen.IncomingCall.route) { inclusive = true }
                    }
                },
                onDecline = { navController.popBackStack() }
            )
        }
        
        composable(
            route = Screen.OngoingCall.route,
            arguments = listOf(
                navArgument("callId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId") ?: return@composable
            OngoingCallScreen(
                callId = callId,
                onEndCall = { navController.popBackStack() },
                onSwitchToVideo = {
                    navController.navigate(Screen.VideoCall.createRoute(callId)) {
                        popUpTo(Screen.OngoingCall.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(
            route = Screen.VideoCall.route,
            arguments = listOf(
                navArgument("callId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId") ?: return@composable
            VideoCallScreen(
                callId = callId,
                onEndCall = { navController.popBackStack() }
            )
        }
        
        // Feature Screens
        composable(
            route = Screen.AIAssistant.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "chatr://ai-assistant" }
            )
        ) {
            AIAssistantScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(
            route = Screen.AIBrowser.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "chatr://ai-browser" }
            )
        ) {
            AIBrowserScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(
            route = Screen.ChatrWorld.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "chatr://chatr-world" }
            )
        ) {
            ChatrWorldScreen(
                navController = navController
            )
        }
        
        composable(Screen.LocalJobs.route) {
            LocalJobsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.LocalHealthcare.route) {
            LocalHealthcareScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.FoodOrdering.route) {
            FoodOrderingScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.LocalDeals.route) {
            LocalDealsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.HealthHub.route) {
            HealthHubScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.StealthMode.route) {
            StealthModeScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Studio.route) {
            StudioScreen(
                onNavigateBack = { navController.popBackStack() }
            )
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
            PointsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Wallet.route) {
            WalletScreen(
                onNavigateBack = { navController.popBackStack() }
            )
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
            CreateStoryScreen(
                onNavigateBack = { navController.popBackStack() }
            )
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
            QRScannerScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.QRLogin.route) {
            QRLoginScreen(
                onNavigateBack = { navController.popBackStack() }
            )
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
