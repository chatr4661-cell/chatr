package com.chatr.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.chatr.app.ui.theme.*
import com.chatr.app.viewmodel.CallHistoryViewModel
import com.chatr.app.viewmodel.CallLogItem
import java.text.SimpleDateFormat
import java.time.Instant
import java.util.*

/**
 * CallsScreen - Shows REAL call history from backend
 * Uses CallHistoryViewModel which fetches from Supabase calls table
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CallsScreen(
    onNavigate: (String) -> Unit = {},
    onStartCall: ((String, Boolean) -> Unit)? = null,
    viewModel: CallHistoryViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var selectedTab by remember { mutableStateOf(0) }
    
    LaunchedEffect(Unit) {
        viewModel.loadCallHistory()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Calls",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Background
                ),
                actions = {
                    IconButton(onClick = { onNavigate("search") }) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = Primary
                        )
                    }
                    IconButton(onClick = { viewModel.loadCallHistory() }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = Primary
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { onNavigate("contacts") },
                containerColor = Primary,
                contentColor = PrimaryForeground
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "New Call"
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Background)
                .padding(padding)
        ) {
            // Tabs
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Background,
                contentColor = Primary,
                indicator = { tabPositions ->
                    TabRowDefaults.Indicator(
                        Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                        color = Primary
                    )
                }
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = {
                        Text(
                            "All",
                            color = if (selectedTab == 0) Primary else MutedForeground
                        )
                    }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = {
                        Text(
                            "Missed",
                            color = if (selectedTab == 1) Primary else MutedForeground
                        )
                    }
                )
            }

            // Error state
            state.error?.let { error ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Destructive.copy(alpha = 0.1f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = error,
                            color = Destructive,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f)
                        )
                        TextButton(onClick = { viewModel.loadCallHistory() }) {
                            Text("Retry", color = Primary)
                        }
                    }
                }
            }

            // Loading state
            if (state.isLoading && state.calls.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Primary)
                }
            } else {
                // Filter calls based on tab
                val filteredCalls = when (selectedTab) {
                    1 -> state.calls.filter { it.isMissed }
                    else -> state.calls
                }

                if (filteredCalls.isEmpty()) {
                    // Empty state
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.CallMissed,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MutedForeground
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = if (selectedTab == 1) "No missed calls" else "No calls yet",
                                style = MaterialTheme.typography.titleMedium,
                                color = MutedForeground
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Your call history will appear here",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MutedForeground
                            )
                        }
                    }
                } else {
                    // Calls list
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        items(
                            items = filteredCalls,
                            key = { it.id }
                        ) { call ->
                            CallLogRow(
                                callLog = call,
                                onClick = { onNavigate("call-detail/${call.id}") },
                                onCallBack = { 
                                    onStartCall?.invoke(call.otherUserId, call.isVideo)
                                        ?: onNavigate("call/${call.otherUserId}?video=${call.isVideo}")
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CallLogRow(
    callLog: CallLogItem,
    onClick: () -> Unit,
    onCallBack: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = Card
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            Box(
                modifier = Modifier.size(56.dp)
            ) {
                if (!callLog.avatarUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model = callLog.avatarUrl,
                        contentDescription = "Avatar",
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape)
                            .background(Primary.copy(alpha = 0.3f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = callLog.contactName.firstOrNull()?.uppercase() ?: "?",
                            style = MaterialTheme.typography.titleLarge,
                            color = Primary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Call info
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = when {
                            callLog.isMissed -> Icons.Default.CallMissed
                            callLog.isOutgoing -> Icons.Default.CallMade
                            else -> Icons.Default.CallReceived
                        },
                        contentDescription = null,
                        tint = if (callLog.isMissed) Destructive else MutedForeground,
                        modifier = Modifier.size(16.dp)
                    )
                    
                    Spacer(modifier = Modifier.width(4.dp))
                    
                    Icon(
                        imageVector = if (callLog.isVideo) Icons.Default.Videocam else Icons.Default.Phone,
                        contentDescription = null,
                        tint = MutedForeground,
                        modifier = Modifier.size(14.dp)
                    )
                    
                    Spacer(modifier = Modifier.width(8.dp))
                    
                    Text(
                        text = callLog.contactName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = if (callLog.isMissed) Destructive else Foreground,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = formatCallInfo(callLog),
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedForeground
                )
            }

            // Call back button
            IconButton(
                onClick = onCallBack,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = if (callLog.isVideo) Icons.Default.Videocam else Icons.Default.Phone,
                    contentDescription = "Call back",
                    tint = Primary
                )
            }
        }
    }
}

private fun formatCallInfo(callLog: CallLogItem): String {
    val timestamp = formatTimestamp(callLog.timestamp)
    val duration = if (callLog.isMissed) "Missed" else formatDuration(callLog.durationSeconds)
    return "$timestamp • $duration"
}

private fun formatDuration(seconds: Int): String {
    if (seconds <= 0) return "0s"
    val minutes = seconds / 60
    val secs = seconds % 60
    return if (minutes > 0) {
        "${minutes}m ${secs}s"
    } else {
        "${secs}s"
    }
}

private fun formatTimestamp(isoTimestamp: String): String {
    return try {
        val instant = Instant.parse(isoTimestamp)
        val timestamp = instant.toEpochMilli()
        val now = System.currentTimeMillis()
        val diff = now - timestamp
        
        when {
            diff < 60000 -> "Just now"
            diff < 3600000 -> "${diff / 60000}m ago"
            diff < 86400000 -> "${diff / 3600000}h ago"
            diff < 604800000 -> "${diff / 86400000}d ago"
            else -> SimpleDateFormat("MMM dd", Locale.getDefault()).format(Date(timestamp))
        }
    } catch (e: Exception) {
        ""
    }
}
