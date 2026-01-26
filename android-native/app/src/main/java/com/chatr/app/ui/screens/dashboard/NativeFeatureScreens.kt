package com.chatr.app.ui.screens.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.chatr.app.ui.theme.*
import com.chatr.app.viewmodel.GamesViewModel

/**
 * Native Games Screen - Displays list of games from backend
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GamesScreen(
    onNavigateToGame: (String) -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: GamesViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    
    LaunchedEffect(Unit) {
        viewModel.loadGames()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "CHATR Games",
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = Primary
                    )
                }
                state.games.isEmpty() -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.SportsEsports,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MutedForeground
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("No games available", color = MutedForeground)
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(state.games) { game ->
                            GameCard(
                                name = game.name,
                                description = game.description,
                                onClick = { onNavigateToGame(game.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GameCard(
    name: String,
    description: String?,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.SportsEsports,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = Primary
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                if (!description.isNullOrEmpty()) {
                    Text(
                        text = description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MutedForeground
                    )
                }
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MutedForeground
            )
        }
    }
}

@Composable
fun GameDetailScreen(
    gameId: String,
    onNavigateBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Game") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentAlignment = Alignment.Center
        ) {
            Text("Loading game: $gameId")
        }
    }
}

/**
 * Native Wallet Screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WalletScreen(onNavigateBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Wallet", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Balance card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Primary)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "Total Balance",
                        style = MaterialTheme.typography.bodyMedium,
                        color = PrimaryForeground.copy(alpha = 0.8f)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "₹0.00",
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold,
                        color = PrimaryForeground
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Quick actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                WalletAction(Icons.Default.Add, "Add Money") {}
                WalletAction(Icons.Default.Send, "Send") {}
                WalletAction(Icons.Default.History, "History") {}
            }
        }
    }
}

@Composable
private fun WalletAction(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        IconButton(
            onClick = onClick,
            modifier = Modifier.size(56.dp)
        ) {
            Icon(icon, label, tint = Primary, modifier = Modifier.size(28.dp))
        }
        Text(label, style = MaterialTheme.typography.labelSmall)
    }
}

/**
 * Native Health Hub Screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HealthHubScreen(onNavigateBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Health Hub", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Health cards
            HealthCard(
                title = "BMI Tracker",
                subtitle = "Track your body mass index",
                icon = Icons.Default.MonitorWeight
            ) {}
            
            Spacer(modifier = Modifier.height(12.dp))
            
            HealthCard(
                title = "Medicine Reminders",
                subtitle = "Never miss a dose",
                icon = Icons.Default.Medication
            ) {}
            
            Spacer(modifier = Modifier.height(12.dp))
            
            HealthCard(
                title = "Family Health",
                subtitle = "Manage family member health",
                icon = Icons.Default.FamilyRestroom
            ) {}
        }
    }
}

@Composable
private fun HealthCard(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = Primary
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedForeground
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MutedForeground
            )
        }
    }
}

/**
 * Native Food Ordering Screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FoodOrderingScreen(onNavigateBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Food Ordering", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.Restaurant,
                contentDescription = null,
                modifier = Modifier.size(72.dp),
                tint = Primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text("Food Ordering", style = MaterialTheme.typography.headlineMedium)
            Text("Order from local restaurants", style = MaterialTheme.typography.bodyLarge, color = MutedForeground)
        }
    }
}

/**
 * Native Local Jobs Screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocalJobsScreen(onNavigateBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Local Jobs", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.Work,
                contentDescription = null,
                modifier = Modifier.size(72.dp),
                tint = Primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text("Local Jobs", style = MaterialTheme.typography.headlineMedium)
            Text("Find jobs near you", style = MaterialTheme.typography.bodyLarge, color = MutedForeground)
        }
    }
}

/**
 * Stories Screens
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoriesScreen(
    onNavigateToViewStory: (String) -> Unit,
    onNavigateToCreate: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Stories", fontWeight = FontWeight.Bold) }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToCreate,
                containerColor = Primary
            ) {
                Icon(Icons.Default.Add, "Create Story", tint = PrimaryForeground)
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.PhotoCamera,
                contentDescription = null,
                modifier = Modifier.size(72.dp),
                tint = MutedForeground
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text("No stories yet", style = MaterialTheme.typography.titleMedium, color = MutedForeground)
            Spacer(modifier = Modifier.height(8.dp))
            Button(onClick = onNavigateToCreate) {
                Text("Create Story")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateStoryScreen(onNavigateBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Story") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, "Close")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("Create your story", style = MaterialTheme.typography.headlineMedium)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ViewStoryScreen(userId: String, onNavigateBack: () -> Unit) {
    Scaffold { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentAlignment = Alignment.Center
        ) {
            Text("Viewing story from $userId")
        }
    }
}

/**
 * Profile Screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(onNavigateBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Avatar
            Icon(
                Icons.Default.AccountCircle,
                contentDescription = null,
                modifier = Modifier.size(100.dp),
                tint = Primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text("Your Profile", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Edit your profile settings", style = MaterialTheme.typography.bodyMedium, color = MutedForeground)
        }
    }
}

/**
 * Create Group Screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateGroupScreen(
    onNavigateBack: () -> Unit,
    onGroupCreated: (String) -> Unit
) {
    var groupName by remember { mutableStateOf("") }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Group") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            OutlinedTextField(
                value = groupName,
                onValueChange = { groupName = it },
                label = { Text("Group Name") },
                modifier = Modifier.fillMaxWidth()
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Button(
                onClick = { /* TODO: Create group */ },
                modifier = Modifier.fillMaxWidth(),
                enabled = groupName.isNotBlank()
            ) {
                Text("Create Group")
            }
        }
    }
}
