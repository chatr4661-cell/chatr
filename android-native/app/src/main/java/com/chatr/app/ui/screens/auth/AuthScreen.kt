package com.chatr.app.ui.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

/**
 * Authentication screen for Chatr+ app
 * 
 * Replaces: src/pages/Auth.tsx
 * 
 * Features:
 * - Login/Signup toggle
 * - Email + Password authentication
 * - Google Sign-In (TODO)
 * - Error handling
 * 
 * Migration Status: Phase 2 - Proof of Concept
 * TODO: Connect to AuthViewModel and Supabase
 */
@Composable
fun AuthScreen(
    navController: NavController,
    onAuthSuccess: () -> Unit = {},
    // TODO Phase 3: Add viewModel: AuthViewModel = hiltViewModel()
) {
    var isLogin by remember { mutableStateOf(true) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    
    Scaffold(
        modifier = Modifier.fillMaxSize()
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // App logo/title
            Text(
                text = "Chatr+",
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Connect. Chat. Care.",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Login/Signup tabs
            TabRow(
                selectedTabIndex = if (isLogin) 0 else 1,
                modifier = Modifier.fillMaxWidth()
            ) {
                Tab(
                    selected = isLogin,
                    onClick = { isLogin = true },
                    text = { Text("Login") }
                )
                Tab(
                    selected = !isLogin,
                    onClick = { isLogin = false },
                    text = { Text("Sign Up") }
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Email field
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                leadingIcon = {
                    Icon(Icons.Default.Email, contentDescription = null)
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !isLoading
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Password field
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !isLoading
            )
            
            // Error message
            error?.let { errorText ->
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = errorText,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Continue button
            Button(
                onClick = {
                    // TODO Phase 3: Connect to AuthViewModel
                    isLoading = true
                    // Simulate auth - call success callback
                    onAuthSuccess()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = email.isNotBlank() && password.isNotBlank() && !isLoading
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(if (isLogin) "Login" else "Sign Up")
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Google Sign-In button (TODO Phase 3)
            OutlinedButton(
                onClick = { /* TODO: Google Sign-In */ },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = !isLoading
            ) {
                // TODO: Add Google icon
                Text("Continue with Google")
            }
        }
    }
}
