package com.chatr.app.ui.screens.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

/**
 * Dashboard/Home screen for Chatr+ app
 * 
 * Replaces: src/pages/Index.tsx
 * 
 * Migration Status: Phase 2 - POC Layout
 * - Static UI to validate navigation and layout
 * - TODO Phase 3: Wire ViewModel and real data
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(navController: NavController) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chatr") }
            )
        },
        content = { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp)
            ) {
                SearchRow()
                Spacer(modifier = Modifier.height(12.dp))
                ShortcutGrid()
                Spacer(modifier = Modifier.height(12.dp))
                Recommendations()
            }
        }
    )
}

@Composable
fun SearchRow() {
    OutlinedTextField(
        value = "",
        onValueChange = {},
        placeholder = { Text("Find number, order id, or contact") },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    )
}

@Composable
fun ShortcutGrid() {
    // Simple horizontal row of quick action cards
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        items(8) { index ->
            Card(
                modifier = Modifier.size(80.dp),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.fillMaxSize()
                ) {
                    Text(text = "Icon ${index + 1}", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
fun Recommendations() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(3) {
            Card(
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Chatr Companion", style = MaterialTheme.typography.titleMedium)
                        Text("Short description", style = MaterialTheme.typography.bodyMedium)
                    }
                    Text("NEW", style = MaterialTheme.typography.labelMedium)
                }
            }
        }
    }
}
