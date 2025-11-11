package com.chatr.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chatr.app.ui.screens.auth.AuthScreen
import com.chatr.app.ui.screens.dashboard.DashboardScreen

/**
 * Navigation routes - type-safe screen definitions
 */
sealed class Screen(val route: String) {
    object Auth : Screen("auth")
    object Dashboard : Screen("dashboard")
    object ChatList : Screen("chat_list")
    object Profile : Screen("profile")
    object Settings : Screen("settings")
    // Add more screens as needed
}

/**
 * Main navigation host for Chatr+ app
 * 
 * Manages screen routing and navigation hierarchy.
 * This replaces React Router DOM from the web app.
 * 
 * Migration Status: Phase 2 - POC navigation scaffold
 */
@Composable
fun ChatrNavHost(
    startRoute: String = Screen.Auth.route,
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = startRoute,
        modifier = modifier
    ) {
        // Authentication screen
        composable(Screen.Auth.route) {
            AuthScreen(
                navController = navController,
                onAuthSuccess = { navController.navigate(Screen.Dashboard.route) }
            )
        }
        
        // Main dashboard/home screen
        composable(Screen.Dashboard.route) {
            DashboardScreen(navController = navController)
        }
        
        // TODO Phase 3: Add more routes
        // composable(Screen.ChatList.route) { ChatListScreen(navController) }
        // composable(Screen.Profile.route) { ProfileScreen(navController) }
        // composable(Screen.Settings.route) { SettingsScreen(navController) }
    }
}
