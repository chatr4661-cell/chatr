package com.chatr.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

/**
 * Web Authentication Screen - WebView-based authentication
 */
@Composable
fun WebAuthScreen(
    navController: NavController,
    onAuthSuccess: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Web Authentication") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        // TODO: Add back icon
                        Text("←")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // TODO: Implement WebView for authentication
            Text("WebView Authentication")
            Text("Coming soon...", style = MaterialTheme.typography.bodyMedium)
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Button(onClick = onAuthSuccess) {
                Text("Test: Complete Auth")
            }
        }
    }
}
