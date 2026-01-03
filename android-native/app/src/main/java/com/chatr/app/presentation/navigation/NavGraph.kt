package com.chatr.app.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.chatr.app.ui.screens.*
import com.chatr.app.ui.screens.dashboard.*

/**
 * Navigation routes for the app
 */
sealed class Route(val route: String) {
    data object Splash : Route("splash")
    data object Auth : Route("auth")
    data object OtpVerification : Route("otp_verification/{phoneNumber}") {
        fun createRoute(phoneNumber: String) = "otp_verification/$phoneNumber"
    }
    data object Home : Route("home")
    data object ChatList : Route("chat_list")
    data object ChatDetail : Route("chat/{conversationId}") {
        fun createRoute(conversationId: String) = "chat/$conversationId"
    }
    data object Contacts : Route("contacts")
    data object CallHistory : Route("call_history")
    data object Settings : Route("settings")
}

@Composable
fun ChatrNavGraph(
    navController: NavHostController,
    startDestination: String = Route.Splash.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Splash Screen
        composable(Route.Splash.route) {
            SplashScreen(
                onNavigateToAuth = {
                    navController.navigate(Route.Auth.route) {
                        popUpTo(Route.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToChats = {
                    navController.navigate(Route.Home.route) {
                        popUpTo(Route.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        // Authentication
        composable(Route.Auth.route) {
            AuthScreen(navController = navController)
        }

        // OTP Verification - redirect to auth for now
        composable(
            route = Route.OtpVerification.route,
            arguments = listOf(
                navArgument("phoneNumber") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val phoneNumber = backStackEntry.arguments?.getString("phoneNumber") ?: ""
            // OTP is now handled inline in AuthScreen via Firebase
            AuthScreen(navController = navController)
        }

        // Home (with bottom navigation)
        composable(Route.Home.route) {
            HomeScreen(
                onNavigate = { route ->
                    when (route) {
                        "chats" -> navController.navigate(Route.ChatList.route)
                        "contacts" -> navController.navigate(Route.Contacts.route)
                        "calls" -> navController.navigate(Route.CallHistory.route)
                        "settings" -> navController.navigate(Route.Settings.route)
                        else -> navController.navigate(route)
                    }
                }
            )
        }

        // Chat List
        composable(Route.ChatList.route) {
            ChatsScreen(
                onNavigateToChat = { conversationId ->
                    navController.navigate(Route.ChatDetail.createRoute(conversationId))
                },
                onNavigateToContacts = {
                    navController.navigate(Route.Contacts.route)
                }
            )
        }

        // Chat Detail
        composable(
            route = Route.ChatDetail.route,
            arguments = listOf(
                navArgument("conversationId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val conversationId = backStackEntry.arguments?.getString("conversationId") ?: ""
            ChatDetailScreen(
                conversationId = conversationId,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToCall = { callId, isVideo ->
                    // Handle call navigation
                }
            )
        }

        // Contacts
        composable(Route.Contacts.route) {
            ContactsScreen(
                onNavigate = { route ->
                    if (route.startsWith("contact/")) {
                        val contactId = route.substringAfter("contact/")
                        navController.navigate(Route.ChatDetail.createRoute(contactId))
                    } else {
                        navController.navigate(route)
                    }
                }
            )
        }
        
        // Call History
        composable(Route.CallHistory.route) {
            CallsScreen(
                onNavigate = { route ->
                    navController.navigate(route)
                }
            )
        }
        
        // Settings
        composable(Route.Settings.route) {
            SettingsScreen(
                onNavigate = { route ->
                    navController.navigate(route)
                }
            )
        }
    }
}
