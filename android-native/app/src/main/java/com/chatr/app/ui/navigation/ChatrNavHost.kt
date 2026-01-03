package com.chatr.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.chatr.app.ui.screens.*
import com.chatr.app.ui.screens.dashboard.*
import com.chatr.app.webrtc.audio.AudioRoute

/**
 * Navigation routes - type-safe screen definitions
 */
sealed class ChatrScreen(val route: String) {
    object Splash : ChatrScreen("splash")
    object Auth : ChatrScreen("auth")
    object WebAuth : ChatrScreen("web_auth")
    object Pin : ChatrScreen("pin")
    object Dashboard : ChatrScreen("dashboard")
    object Chats : ChatrScreen("chats")
    object Calls : ChatrScreen("calls")
    object Contacts : ChatrScreen("contacts")
    object Settings : ChatrScreen("settings")
    
    // Parameterized routes
    data class ChatDetail(val chatId: String) : ChatrScreen("chat/$chatId") {
        companion object {
            const val route = "chat/{chatId}"
        }
    }
    
    data class VideoCall(val callId: String) : ChatrScreen("video_call/$callId") {
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
    startRoute: String = ChatrScreen.Splash.route,
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = startRoute,
        modifier = modifier
    ) {
        // Splash Screen
        composable(ChatrScreen.Splash.route) {
            SplashScreen(
                onNavigateToAuth = { 
                    navController.navigate(ChatrScreen.Auth.route) {
                        popUpTo(ChatrScreen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToChats = {
                    navController.navigate(ChatrScreen.Chats.route) {
                        popUpTo(ChatrScreen.Splash.route) { inclusive = true }
                    }
                }
            )
        }
        
        // Authentication Screen
        composable(ChatrScreen.Auth.route) {
            AuthScreen(
                navController = navController
            )
        }
        
        // Web Authentication Screen
        composable(ChatrScreen.WebAuth.route) {
            WebAuthScreen(
                navController = navController,
                onAuthSuccess = {
                    navController.navigate(ChatrScreen.Pin.route) {
                        popUpTo(ChatrScreen.Auth.route) { inclusive = true }
                    }
                }
            )
        }
        
        // PIN Setup/Entry Screen
        composable(ChatrScreen.Pin.route) {
            PinScreen(
                navController = navController,
                onPinSuccess = {
                    navController.navigate(ChatrScreen.Chats.route) {
                        popUpTo(ChatrScreen.Pin.route) { inclusive = true }
                    }
                }
            )
        }
        
        // Main Dashboard Screen
        composable(ChatrScreen.Dashboard.route) {
            HomeScreen(
                onNavigate = { route ->
                    navController.navigate(route)
                }
            )
        }
        
        // Chats Screen
        composable(ChatrScreen.Chats.route) {
            ChatsScreen(
                onNavigateToChat = { conversationId ->
                    navController.navigate("chat/$conversationId")
                },
                onNavigateToContacts = {
                    navController.navigate(ChatrScreen.Contacts.route)
                }
            )
        }
        
        // Calls Screen
        composable(ChatrScreen.Calls.route) {
            CallsScreen(
                onNavigate = { route ->
                    navController.navigate(route)
                }
            )
        }
        
        // Contacts Screen
        composable(ChatrScreen.Contacts.route) {
            ContactsScreen(
                onNavigate = { route ->
                    navController.navigate(route)
                }
            )
        }
        
        // Settings Screen
        composable(ChatrScreen.Settings.route) {
            SettingsScreen(
                onNavigate = { route ->
                    navController.navigate(route)
                }
            )
        }
        
        // Chat Detail Screen (parameterized)
        composable(
            route = ChatrScreen.ChatDetail.route,
            arguments = listOf(navArgument("chatId") { type = NavType.StringType })
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: ""
            ChatDetailScreen(
                conversationId = chatId,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToCall = { callId, isVideo ->
                    if (isVideo) {
                        navController.navigate("video_call/$callId")
                    } else {
                        // Navigate to voice call
                    }
                }
            )
        }
        
        // Video Call Screen (parameterized)
        composable(
            route = ChatrScreen.VideoCall.route,
            arguments = listOf(navArgument("callId") { type = NavType.StringType })
        ) { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId") ?: ""
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
    }
}
