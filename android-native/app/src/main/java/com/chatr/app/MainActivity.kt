package com.chatr.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.*
import com.chatr.app.ui.components.ChatrBottomNavigation
import com.chatr.app.ui.navigation.ChatrNavHost
import com.chatr.app.ui.screens.*
import com.chatr.app.ui.theme.ChatrTheme
import com.chatr.app.viewmodel.AuthState
import com.chatr.app.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ChatrApp()
        }
    }
}

@Composable
fun ChatrApp() {
    ChatrTheme {
        val navController = rememberNavController()
        val authViewModel: AuthViewModel = hiltViewModel()
        val authState by authViewModel.authState.collectAsState()
        val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
        
        // Determine start destination based on auth state
        val startDestination = when (authState) {
            is AuthState.Authenticated -> "chats"
            else -> "auth"
        }
        
        // Show bottom navigation for main screens
        val showBottomBar = currentRoute in listOf("chats", "calls", "contacts", "settings")
        
        Scaffold(
            bottomBar = {
                if (showBottomBar) {
                    ChatrBottomNavigation(navController)
                }
            }
        ) { paddingValues ->
            Box(modifier = Modifier.padding(paddingValues)) {
                ChatrNavHost(
                    navController = navController,
                    startDestination = startDestination
                )
            }
        }
    }
}
