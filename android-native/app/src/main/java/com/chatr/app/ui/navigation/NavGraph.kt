package com.chatr.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.chatr.app.ui.screens.*
import com.chatr.app.ui.screens.dashboard.*
import com.chatr.app.webrtc.audio.AudioRoute

/**
 * Legacy NavGraph for ui.navigation package
 * Provides backward compatibility with existing navigation patterns
 */
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
            AuthScreen(
                navController = navController
            )
        }
        
        composable("chats") {
            ChatsScreen(
                onNavigateToChat = { conversationId ->
                    navController.navigate("chat/$conversationId")
                },
                onNavigateToContacts = {
                    navController.navigate("contacts")
                }
            )
        }
        
        composable("calls") {
            CallsScreen(
                onNavigate = { route ->
                    navController.navigate(route)
                }
            )
        }
        
        composable("contacts") {
            ContactsScreen(
                onNavigate = { route ->
                    navController.navigate(route)
                }
            )
        }
        
        composable("settings") {
            SettingsScreen(
                onNavigate = { route ->
                    navController.navigate(route)
                }
            )
        }
        
        composable("chat/{chatId}") { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: ""
            ChatDetailScreen(
                conversationId = chatId,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToCall = { callId, isVideo ->
                    if (isVideo) {
                        navController.navigate("video_call/$callId")
                    } else {
                        navController.navigate("ongoing_call/$callId")
                    }
                }
            )
        }
        
        composable("video_call/{callId}") { backStackEntry ->
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
        
        composable("incoming_call/{callId}") { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId") ?: ""
            IncomingCallScreen(
                callerName = "Incoming Call",
                callerAvatar = null,
                isVideo = false,
                onAccept = {
                    navController.navigate("ongoing_call/$callId") {
                        popUpTo("incoming_call/$callId") { inclusive = true }
                    }
                },
                onReject = { navController.popBackStack() }
            )
        }
        
        composable("ongoing_call/{callId}") { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId") ?: ""
            var isMuted by remember { mutableStateOf(false) }
            var audioRoute by remember { mutableStateOf(AudioRoute.EARPIECE) }
            
            OngoingCallScreen(
                callerName = "Ongoing Call",
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
                onEndCall = { navController.popBackStack() }
            )
        }
    }
}
