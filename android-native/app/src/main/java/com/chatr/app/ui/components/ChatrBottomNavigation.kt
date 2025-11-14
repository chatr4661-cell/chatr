package com.chatr.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState

@Composable
fun ChatrBottomNavigation(navController: NavController) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 8.dp
    ) {
        NavigationBarItem(
            icon = { Icon(Icons.Default.Chat, contentDescription = "Chats") },
            label = { Text("Chats") },
            selected = currentRoute == "chats",
            onClick = {
                navController.navigate("chats") {
                    popUpTo("chats") { inclusive = true }
                    launchSingleTop = true
                }
            }
        )
        
        NavigationBarItem(
            icon = { Icon(Icons.Default.Phone, contentDescription = "Calls") },
            label = { Text("Calls") },
            selected = currentRoute == "calls",
            onClick = {
                navController.navigate("calls") {
                    popUpTo("chats")
                    launchSingleTop = true
                }
            }
        )
        
        NavigationBarItem(
            icon = { Icon(Icons.Default.Contacts, contentDescription = "Contacts") },
            label = { Text("Contacts") },
            selected = currentRoute == "contacts",
            onClick = {
                navController.navigate("contacts") {
                    popUpTo("chats")
                    launchSingleTop = true
                }
            }
        )
        
        NavigationBarItem(
            icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
            label = { Text("Settings") },
            selected = currentRoute == "settings",
            onClick = {
                navController.navigate("settings") {
                    popUpTo("chats")
                    launchSingleTop = true
                }
            }
        )
    }
}
