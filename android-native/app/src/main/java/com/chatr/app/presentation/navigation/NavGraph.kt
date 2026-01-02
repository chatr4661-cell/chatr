package com.chatr.app.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.chatr.app.presentation.auth.AuthScreen
import com.chatr.app.presentation.auth.OtpVerificationScreen
import com.chatr.app.presentation.chat.ChatDetailScreen
import com.chatr.app.presentation.chat.ChatListScreen
import com.chatr.app.presentation.contacts.ContactsScreen
import com.chatr.app.presentation.home.HomeScreen
import com.chatr.app.presentation.splash.SplashScreen

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
                onNavigateToHome = {
                    navController.navigate(Route.Home.route) {
                        popUpTo(Route.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        // Authentication
        composable(Route.Auth.route) {
            AuthScreen(
                onNavigateToOtp = { phoneNumber ->
                    navController.navigate(Route.OtpVerification.createRoute(phoneNumber))
                }
            )
        }

        // OTP Verification
        composable(
            route = Route.OtpVerification.route,
            arguments = listOf(
                navArgument("phoneNumber") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val phoneNumber = backStackEntry.arguments?.getString("phoneNumber") ?: ""
            OtpVerificationScreen(
                phoneNumber = phoneNumber,
                onVerificationSuccess = {
                    navController.navigate(Route.Home.route) {
                        popUpTo(Route.Auth.route) { inclusive = true }
                    }
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // Home (with bottom navigation)
        composable(Route.Home.route) {
            HomeScreen(navController = navController)
        }

        // Chat List
        composable(Route.ChatList.route) {
            ChatListScreen(
                onChatClick = { conversationId ->
                    navController.navigate(Route.ChatDetail.createRoute(conversationId))
                },
                onNewChat = {
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
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // Contacts
        composable(Route.Contacts.route) {
            ContactsScreen(
                onContactClick = { userId ->
                    // Start new conversation or navigate to existing
                    navController.navigate(Route.ChatDetail.createRoute(userId))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
