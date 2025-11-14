package com.chatr.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.chatr.app.ui.screens.*

@Composable
fun ChatrNavHost(
    navController: NavHostController,
    startDestination: String
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable("auth") {
            AuthScreen(navController)
        }
        
        composable("chats") {
            ChatsScreen(navController)
        }
        
        composable("calls") {
            CallsScreen(navController)
        }
        
        composable("contacts") {
            ContactsScreen(navController)
        }
        
        composable("settings") {
            SettingsScreen(navController)
        }
        
        composable("chat/{chatId}") { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId")
            // ChatDetailScreen(navController, chatId)
        }
        
        composable("video_call/{callId}") { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId")
            VideoCallScreen(navController)
        }
        
        composable("incoming_call/{callId}") { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId")
            IncomingCallScreen(navController)
        }
    }
}
