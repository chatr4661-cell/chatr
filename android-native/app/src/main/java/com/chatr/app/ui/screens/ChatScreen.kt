package com.chatr.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.chatr.app.BuildConfig
import com.chatr.app.web.WebShell
import com.chatr.app.web.WebViewPoolManager
import javax.inject.Inject

@Composable
fun ChatScreen(
    poolManager: WebViewPoolManager = hiltViewModel<ChatViewModel>().poolManager
) {
    val chatUrl = "${BuildConfig.WEB_BASE_URL}/chat"
    
    Box(modifier = Modifier.fillMaxSize()) {
        WebShell(
            url = chatUrl,
            poolManager = poolManager,
            sessionToken = null, // Will be injected after auth
            onPageFinished = { url ->
                // Handle page load complete
            },
            onError = { error ->
                // Handle error
            }
        )
    }
}

@androidx.lifecycle.ViewModel
class ChatViewModel @Inject constructor(
    val poolManager: WebViewPoolManager
) : androidx.lifecycle.ViewModel()
