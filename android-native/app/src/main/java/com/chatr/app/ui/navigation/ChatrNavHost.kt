package com.chatr.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.chatr.app.ui.screens.auth.AuthScreen
import com.chatr.app.ui.screens.dashboard.DashboardScreen

/**
 * Main navigation host for Chatr+ app
 * 
 * Manages screen routing and navigation hierarchy.
 * This replaces React Router DOM from the web app.
 * 
 * Routes are mapped from the web app's route structure:
 * - "/" -> "home"
 * - "/auth" -> "auth"
 * - "/chat" -> "chat_list"
 * - "/chat/:id" -> "chat_conversation/{conversationId}"
 * - etc.
 * 
 * Migration Status: Phase 2 - Basic navigation scaffold
 * TODO Phase 3: Add remaining screen routes
 */
@Composable
fun ChatrNavHost(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = "auth",  // Start at auth screen (no user session yet)
        modifier = modifier
    ) {
        // Authentication screen
        composable(route = "auth") {
            AuthScreen(navController = navController)
        }
        
        // Main dashboard/home screen (replaces Index.tsx)
        composable(route = "home") {
            DashboardScreen(navController = navController)
        }
        
        // TODO Phase 3: Add more routes
        // composable(route = "chat_list") { ChatListScreen(navController) }
        // composable(
        //     route = "chat_conversation/{conversationId}",
        //     arguments = listOf(navArgument("conversationId") { type = NavType.StringType })
        // ) { backStackEntry ->
        //     val conversationId = backStackEntry.arguments?.getString("conversationId")!!
        //     ChatConversationScreen(navController, conversationId)
        // }
        // composable(route = "profile") { ProfileScreen(navController) }
        // composable(route = "settings") { SettingsScreen(navController) }
        // ... more routes
    }
}

/**
 * Navigation routes (type-safe route definitions)
 */
object ChatrRoutes {
    const val AUTH = "auth"
    const val HOME = "home"
    const val CHAT_LIST = "chat_list"
    const val PROFILE = "profile"
    const val SETTINGS = "settings"
    const val NOTIFICATIONS = "notifications"
    const val CONTACTS = "contacts"
    
    // Routes with parameters
    fun chatConversation(conversationId: String) = "chat_conversation/$conversationId"
    fun userProfile(userId: String) = "user_profile/$userId"
}
