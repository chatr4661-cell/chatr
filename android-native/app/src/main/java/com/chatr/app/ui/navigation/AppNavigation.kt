package com.chatr.app.ui.navigation

import androidx.compose.runtime.*
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.chatr.app.ui.screens.*
import com.chatr.app.ui.screens.dashboard.*
import com.chatr.app.webrtc.audio.AudioRoute

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Auth : Screen("auth")
    object Home : Screen("home")
    object Chat : Screen("chat/{chatId}/{chatName}") {
        fun createRoute(chatId: String, chatName: String) = "chat/$chatId/$chatName"
    }
    object IncomingCall : Screen("incoming_call/{callerId}/{callerName}/{isVideo}") {
        fun createRoute(callerId: String, callerName: String, isVideo: Boolean) = 
            "incoming_call/$callerId/$callerName/$isVideo"
    }
    object OngoingCall : Screen("ongoing_call/{callerName}") {
        fun createRoute(callerName: String) = "ongoing_call/$callerName"
    }
    object VideoCall : Screen("video_call/{callerName}") {
        fun createRoute(callerName: String) = "video_call/$callerName"
    }
}

@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController(),
    isAuthenticated: Boolean = false,
    startDestination: String = if (isAuthenticated) Screen.Home.route else Screen.Splash.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToAuth = {
                    navController.navigate(Screen.Auth.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToChats = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Auth.route) {
            AuthScreen(
                navController = navController
            )
        }
        
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigate = { route ->
                    when {
                        route.startsWith("chat/") -> {
                            val chatId = route.substringAfter("chat/")
                            navController.navigate(Screen.Chat.createRoute(chatId, "Chat User"))
                        }
                        route == "video-call" -> {
                            navController.navigate(Screen.VideoCall.createRoute("Contact Name"))
                        }
                        route == "voice-call" -> {
                            navController.navigate(Screen.OngoingCall.createRoute("Contact Name"))
                        }
                        else -> navController.navigate(route)
                    }
                }
            )
        }
        
        composable(
            route = Screen.Chat.route,
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("chatName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: ""
            val chatName = backStackEntry.arguments?.getString("chatName") ?: ""
            
            // Use ChatDetailScreen with proper signature
            ChatDetailScreen(
                conversationId = chatId,
                contactName = chatName,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToCall = { callId, isVideo ->
                    if (isVideo) {
                        navController.navigate(Screen.VideoCall.createRoute(chatName))
                    } else {
                        navController.navigate(Screen.OngoingCall.createRoute(chatName))
                    }
                }
            )
        }
        
        composable(
            route = Screen.IncomingCall.route,
            arguments = listOf(
                navArgument("callerId") { type = NavType.StringType },
                navArgument("callerName") { type = NavType.StringType },
                navArgument("isVideo") { type = NavType.BoolType }
            )
        ) { backStackEntry ->
            val callerName = backStackEntry.arguments?.getString("callerName") ?: ""
            val isVideo = backStackEntry.arguments?.getBoolean("isVideo") ?: false
            
            IncomingCallScreen(
                callerName = callerName,
                callerAvatar = null,
                isVideo = isVideo,
                onAccept = {
                    if (isVideo) {
                        navController.navigate(Screen.VideoCall.createRoute(callerName)) {
                            popUpTo(Screen.IncomingCall.route) { inclusive = true }
                        }
                    } else {
                        navController.navigate(Screen.OngoingCall.createRoute(callerName)) {
                            popUpTo(Screen.IncomingCall.route) { inclusive = true }
                        }
                    }
                },
                onReject = {
                    navController.popBackStack()
                }
            )
        }
        
        composable(
            route = Screen.OngoingCall.route,
            arguments = listOf(
                navArgument("callerName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val callerName = backStackEntry.arguments?.getString("callerName") ?: ""
            var isMuted by remember { mutableStateOf(false) }
            var audioRoute by remember { mutableStateOf(AudioRoute.EARPIECE) }
            
            OngoingCallScreen(
                callerName = callerName,
                isMuted = isMuted,
                audioRoute = audioRoute,
                onToggleMute = { isMuted = !isMuted },
                onToggleAudioRoute = {
                    audioRoute = when (audioRoute) {
                        AudioRoute.EARPIECE -> AudioRoute.SPEAKER
                        AudioRoute.SPEAKER -> AudioRoute.EARPIECE
                        else -> AudioRoute.EARPIECE
                    }
                },
                onEndCall = {
                    navController.popBackStack()
                }
            )
        }
        
        composable(
            route = Screen.VideoCall.route,
            arguments = listOf(
                navArgument("callerName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val callerName = backStackEntry.arguments?.getString("callerName") ?: ""
            var isMuted by remember { mutableStateOf(false) }
            var isVideoEnabled by remember { mutableStateOf(true) }
            var audioRoute by remember { mutableStateOf(AudioRoute.SPEAKER) }
            
            VideoCallScreen(
                callerName = callerName,
                localVideoTrack = null, // TODO: Connect to WebRTC
                remoteVideoTrack = null, // TODO: Connect to WebRTC
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
                onEndCall = {
                    navController.popBackStack()
                }
            )
        }
    }
}
