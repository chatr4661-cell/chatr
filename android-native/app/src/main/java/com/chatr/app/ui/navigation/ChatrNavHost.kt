package com.chatr.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.chatr.app.ui.screens.*
import com.chatr.app.ui.screens.auth.AuthScreen
import com.chatr.app.ui.screens.dashboard.DashboardScreen

/**
 * Navigation routes - type-safe screen definitions
 */
sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Auth : Screen("auth")
    object WebAuth : Screen("web_auth")
    object Pin : Screen("pin")
    object Dashboard : Screen("dashboard")
    object Chats : Screen("chats")
    object Calls : Screen("calls")
    object Contacts : Screen("contacts")
    object Settings : Screen("settings")
    
    // Parameterized routes
    data class ChatDetail(val chatId: String) : Screen("chat/$chatId") {
        companion object {
            const val route = "chat/{chatId}"
        }
    }
    
    data class VideoCall(val callId: String) : Screen("video_call/$callId") {
        companion object {
            const val route = "video_call/{callId}"
        }
    }
}

/**
 * Main navigation host for Chatr+ app
 * 
 * Manages screen routing and navigation hierarchy with type-safe sealed class routes.
 */
@Composable
fun ChatrNavHost(
    startRoute: String = Screen.Splash.route,
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = startRoute,
        modifier = modifier
    ) {
        // Splash Screen
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToAuth = { 
                    navController.navigate(Screen.Auth.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToChats = {
                    navController.navigate(Screen.Chats.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }
        
        // Authentication Screen
        composable(Screen.Auth.route) {
            AuthScreen(
                navController = navController,
                onAuthSuccess = { 
                    navController.navigate(Screen.Pin.route) {
                        popUpTo(Screen.Auth.route) { inclusive = true }
                    }
                },
                onNavigateToWebAuth = {
                    navController.navigate(Screen.WebAuth.route)
                }
            )
        }
        
        // Web Authentication Screen
        composable(Screen.WebAuth.route) {
            WebAuthScreen(
                navController = navController,
                onAuthSuccess = {
                    navController.navigate(Screen.Pin.route) {
                        popUpTo(Screen.Auth.route) { inclusive = true }
                    }
                }
            )
        }
        
        // PIN Setup/Entry Screen
        composable(Screen.Pin.route) {
            PinScreen(
                navController = navController,
                onPinSuccess = {
                    navController.navigate(Screen.Chats.route) {
                        popUpTo(Screen.Pin.route) { inclusive = true }
                    }
                }
            )
        }
        
        // Main Dashboard Screen
        composable(Screen.Dashboard.route) {
            DashboardScreen(navController = navController)
        }
        
        // Chats Screen
        composable(Screen.Chats.route) {
            ChatsScreen(navController = navController)
        }
        
        // Calls Screen
        composable(Screen.Calls.route) {
            CallsScreen(navController = navController)
        }
        
        // Contacts Screen
        composable(Screen.Contacts.route) {
            ContactsScreen(navController = navController)
        }
        
        // Settings Screen
        composable(Screen.Settings.route) {
            SettingsScreen(navController = navController)
        }
        
        // Chat Detail Screen (parameterized)
        composable(
            route = Screen.ChatDetail.route,
            arguments = listOf(navArgument("chatId") { type = NavType.StringType })
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: ""
            ChatDetailScreen(
                navController = navController,
                chatId = chatId
            )
        }
        
        // Video Call Screen (parameterized)
        composable(
            route = Screen.VideoCall.route,
            arguments = listOf(navArgument("callId") { type = NavType.StringType })
        ) { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId") ?: ""
            VideoCallScreen(
                navController = navController,
                callId = callId
            )
        }
    }
}
