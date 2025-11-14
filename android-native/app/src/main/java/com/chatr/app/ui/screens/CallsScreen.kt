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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chatr.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

data class CallLog(
    val id: String,
    val contactName: String,
    val callType: CallType,
    val timestamp: Long,
    val duration: Int, // in seconds
    val isMissed: Boolean = false,
    val avatarUrl: String? = null
)

enum class CallType {
    VOICE, VIDEO
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CallsScreen(
    onNavigate: (String) -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    
    val callLogs = remember {
        listOf(
            CallLog("1", "John Doe", CallType.VIDEO, System.currentTimeMillis() - 3600000, 1230),
            CallLog("2", "Sarah Smith", CallType.VOICE, System.currentTimeMillis() - 7200000, 456, isMissed = true),
            CallLog("3", "Mike Johnson", CallType.VIDEO, System.currentTimeMillis() - 86400000, 2340),
            CallLog("4", "Emma Wilson", CallType.VOICE, System.currentTimeMillis() - 172800000, 890),
            CallLog("5", "Alex Brown", CallType.VIDEO, System.currentTimeMillis() - 259200000, 1567),
            CallLog("6", "Lisa Anderson", CallType.VOICE, System.currentTimeMillis() - 345600000, 234, isMissed = true)
        )
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
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { onNavigate("new-call") },
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

            // Calls list
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
            ) {
                val filteredLogs = when (selectedTab) {
                    1 -> callLogs.filter { it.isMissed }
                    else -> callLogs
                }
                
                items(filteredLogs) { call ->
                    CallLogRow(
                        callLog = call,
                        onClick = { onNavigate("call-detail/${call.id}") },
                        onCallBack = { /* Handle callback */ }
                    )
                }
            }
        }
    }
}

@Composable
fun CallLogRow(
    callLog: CallLog,
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
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(Primary.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = callLog.contactName.first().toString(),
                    style = MaterialTheme.typography.titleLarge,
                    color = Primary,
                    fontWeight = FontWeight.Bold
                )
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
                        imageVector = when (callLog.callType) {
                            CallType.VIDEO -> Icons.Default.Videocam
                            CallType.VOICE -> Icons.Default.Phone
                        },
                        contentDescription = null,
                        tint = if (callLog.isMissed) Destructive else MutedForeground,
                        modifier = Modifier.size(16.dp)
                    )
                    
                    Spacer(modifier = Modifier.width(8.dp))
                    
                    Text(
                        text = callLog.contactName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = if (callLog.isMissed) Destructive else Foreground
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
                    imageVector = when (callLog.callType) {
                        CallType.VIDEO -> Icons.Default.Videocam
                        CallType.VOICE -> Icons.Default.Phone
                    },
                    contentDescription = "Call back",
                    tint = Primary
                )
            }
        }
    }
}

private fun formatCallInfo(callLog: CallLog): String {
    val timestamp = formatTimestamp(callLog.timestamp)
    val duration = if (callLog.isMissed) "Missed" else formatDuration(callLog.duration)
    return "$timestamp • $duration"
}

private fun formatDuration(seconds: Int): String {
    val minutes = seconds / 60
    val secs = seconds % 60
    return if (minutes > 0) {
        "${minutes}m ${secs}s"
    } else {
        "${secs}s"
    }
}

private fun formatTimestamp(timestamp: Long): String {
    val now = System.currentTimeMillis()
    val diff = now - timestamp
    
    return when {
        diff < 60000 -> "Just now"
        diff < 3600000 -> "${diff / 60000}m ago"
        diff < 86400000 -> "${diff / 3600000}h ago"
        diff < 604800000 -> "${diff / 86400000}d ago"
        else -> SimpleDateFormat("MMM dd", Locale.getDefault()).format(Date(timestamp))
    }
}
