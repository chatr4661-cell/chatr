package com.chatr.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.chatr.app.ui.components.ChatrBottomNavigation
import com.chatr.app.ui.screens.*
import com.chatr.app.ui.theme.ChatrTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            ChatrTheme {
                ChatrApp()
            }
        }
    }
}

@Composable
fun ChatrApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: "home"
    
    val bottomNavRoutes = listOf("contacts", "calls", "chats", "settings")
    val showBottomNav = currentRoute in bottomNavRoutes || currentRoute == "home"

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            if (showBottomNav) {
                ChatrBottomNavigation(
                    selectedRoute = if (currentRoute == "home") "chats" else currentRoute,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo("home") { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(padding)
        ) {
            composable("home") {
                HomeScreen(
                    onNavigate = { route -> navController.navigate(route) }
                )
            }
            
            composable("chats") {
                ChatsScreen(
                    onNavigate = { route -> navController.navigate(route) }
                )
            }
            
            composable("calls") {
                CallsScreen(
                    onNavigate = { route -> navController.navigate(route) }
                )
            }
            
            composable("contacts") {
                ContactsScreen(
                    onNavigate = { route -> navController.navigate(route) }
                )
            }
            
            composable("settings") {
                SettingsScreen(
                    onNavigate = { route -> navController.navigate(route) }
                )
            }
        }
    }
}
