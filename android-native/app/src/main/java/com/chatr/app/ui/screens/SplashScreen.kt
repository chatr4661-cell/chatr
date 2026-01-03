package com.chatr.app.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.chatr.app.R
import kotlinx.coroutines.delay

/**
 * Splash Screen - Initial loading screen
 */
@Composable
fun SplashScreen(
    onNavigateToAuth: () -> Unit,
    onNavigateToHome: (() -> Unit)? = null,
    onNavigateToChats: (() -> Unit)? = null
) {
    // TODO: Check authentication state and navigate accordingly
    LaunchedEffect(Unit) {
        delay(2000) // 2 second splash
        // Check if user is authenticated
        val isAuthenticated = false // TODO: Get from AuthViewModel

        val navigateAuthed = onNavigateToHome ?: onNavigateToChats ?: onNavigateToAuth
        if (isAuthenticated) {
            navigateAuthed()
        } else {
            onNavigateToAuth()
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.primary),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // TODO: Add app logo
            // Image(
            //     painter = painterResource(id = R.drawable.chatr_logo),
            //     contentDescription = "Chatr Logo",
            //     modifier = Modifier.size(120.dp)
            // )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            CircularProgressIndicator(
                color = MaterialTheme.colorScheme.onPrimary
            )
        }
    }
}
