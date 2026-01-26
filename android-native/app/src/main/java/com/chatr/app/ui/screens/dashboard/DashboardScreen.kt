package com.chatr.app.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chatr.app.ui.theme.*

/**
 * Dashboard Screen - Feature overview grid
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigate: (String) -> Unit = {}
) {
    val features = listOf(
        DashboardFeature("Chats", Icons.Default.Chat, "chats"),
        DashboardFeature("Contacts", Icons.Default.Contacts, "contacts"),
        DashboardFeature("Calls", Icons.Default.Call, "calls"),
        DashboardFeature("Dhandha", Icons.Default.Store, "dhandha"),
        DashboardFeature("AI Assistant", Icons.Default.AutoAwesome, "ai"),
        DashboardFeature("Games", Icons.Default.SportsEsports, "games"),
        DashboardFeature("Health", Icons.Default.HealthAndSafety, "health"),
        DashboardFeature("Food", Icons.Default.Restaurant, "food"),
        DashboardFeature("Jobs", Icons.Default.Work, "jobs"),
        DashboardFeature("Wallet", Icons.Default.AccountBalanceWallet, "wallet"),
        DashboardFeature("Stories", Icons.Default.PhotoCamera, "stories"),
        DashboardFeature("Settings", Icons.Default.Settings, "settings")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "CHATR+",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Your All-in-One Ecosystem",
                            style = MaterialTheme.typography.bodySmall,
                            color = MutedForeground
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Background)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(GradientStart, GradientEnd)
                        )
                    )
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "Welcome to CHATR+",
                    style = MaterialTheme.typography.headlineSmall,
                    color = PrimaryForeground,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Feature grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(features) { feature ->
                    FeatureCard(
                        title = feature.title,
                        icon = feature.icon,
                        onClick = { onNavigate(feature.route) }
                    )
                }
            }
        }
    }
}

private data class DashboardFeature(
    val title: String,
    val icon: ImageVector,
    val route: String
)

@Composable
private fun FeatureCard(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f),
        shape = RoundedCornerShape(12.dp),
        onClick = onClick
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = Primary,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Medium
            )
        }
    }
}
