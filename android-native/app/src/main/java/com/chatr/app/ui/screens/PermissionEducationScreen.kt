package com.chatr.app.ui.screens

import android.content.Intent
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chatr.app.permissions.OemSurvivalKit
import com.chatr.app.permissions.PermissionManager
import com.chatr.app.ui.theme.ChatrColors

data class PermissionItem(
    val group: PermissionManager.PermissionGroup,
    val title: String,
    val description: String,
    val icon: ImageVector,
    val isGranted: Boolean,
    val isCritical: Boolean
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PermissionEducationScreen(
    onAllPermissionsGranted: () -> Unit,
    onRequestPermissions: (List<String>) -> Unit
) {
    val context = LocalContext.current
    var currentStep by remember { mutableIntStateOf(0) }
    var showOemWarning by remember { mutableStateOf(false) }
    
    val permissionStatuses = remember {
        PermissionManager.checkAllPermissions(context)
    }
    
    val permissionItems = remember(permissionStatuses) {
        permissionStatuses.map { status ->
            PermissionItem(
                group = status.group,
                title = when (status.group) {
                    PermissionManager.PermissionGroup.PHONE -> "Phone"
                    PermissionManager.PermissionGroup.MICROPHONE -> "Microphone"
                    PermissionManager.PermissionGroup.CAMERA -> "Camera"
                    PermissionManager.PermissionGroup.CONTACTS -> "Contacts"
                    PermissionManager.PermissionGroup.NOTIFICATIONS -> "Notifications"
                    PermissionManager.PermissionGroup.BLUETOOTH -> "Bluetooth"
                },
                description = status.rationale,
                icon = when (status.group) {
                    PermissionManager.PermissionGroup.PHONE -> Icons.Default.Phone
                    PermissionManager.PermissionGroup.MICROPHONE -> Icons.Default.Mic
                    PermissionManager.PermissionGroup.CAMERA -> Icons.Default.CameraAlt
                    PermissionManager.PermissionGroup.CONTACTS -> Icons.Default.Contacts
                    PermissionManager.PermissionGroup.NOTIFICATIONS -> Icons.Default.Notifications
                    PermissionManager.PermissionGroup.BLUETOOTH -> Icons.Default.Bluetooth
                },
                isGranted = status.isGranted,
                isCritical = status.isCritical
            )
        }
    }
    
    val isAggressiveOem = remember { OemSurvivalKit.isAggressiveOem() }
    val oemInstructions = remember { OemSurvivalKit.getOemSpecificInstructions() }
    
    LaunchedEffect(permissionItems) {
        if (permissionItems.filter { it.isCritical }.all { it.isGranted }) {
            if (isAggressiveOem && !OemSurvivalKit.isBatteryOptimizationDisabled(context)) {
                showOemWarning = true
            } else {
                onAllPermissionsGranted()
            }
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(ChatrColors.dark, ChatrColors.darker)
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(48.dp))
            
            // Header
            Icon(
                imageVector = Icons.Default.Security,
                contentDescription = null,
                tint = ChatrColors.primary,
                modifier = Modifier.size(64.dp)
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                text = if (showOemWarning) "One More Step" else "Permissions Required",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = ChatrColors.textPrimary
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = if (showOemWarning) 
                    "To ensure calls ring reliably on your device"
                else 
                    "Chatr needs these permissions to work properly",
                fontSize = 16.sp,
                color = ChatrColors.textSecondary,
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            if (showOemWarning) {
                // OEM-specific warning
                OemWarningContent(
                    instructions = oemInstructions,
                    onOpenSettings = {
                        val intent = OemSurvivalKit.getAutoStartIntent(context)
                            ?: OemSurvivalKit.getBatteryOptimizationIntent(context)
                        context.startActivity(intent)
                    },
                    onSkip = onAllPermissionsGranted
                )
            } else {
                // Permission list
                permissionItems.forEach { item ->
                    PermissionCard(
                        item = item,
                        onRequest = {
                            val status = permissionStatuses.find { it.group == item.group }
                            status?.permissions?.let { onRequestPermissions(it) }
                        }
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // Grant all button
                val missingPermissions = PermissionManager.getMissingPermissions(context)
                if (missingPermissions.isNotEmpty()) {
                    Button(
                        onClick = { onRequestPermissions(missingPermissions) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ChatrColors.primary
                        ),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text(
                            text = "Grant All Permissions",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun PermissionCard(
    item: PermissionItem,
    onRequest: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = ChatrColors.surface
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        if (item.isGranted) ChatrColors.success.copy(alpha = 0.2f)
                        else ChatrColors.primary.copy(alpha = 0.2f),
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (item.isGranted) Icons.Default.Check else item.icon,
                    contentDescription = null,
                    tint = if (item.isGranted) ChatrColors.success else ChatrColors.primary,
                    modifier = Modifier.size(24.dp)
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = item.title,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = ChatrColors.textPrimary
                    )
                    if (item.isCritical) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Required",
                            fontSize = 12.sp,
                            color = ChatrColors.error,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = item.description,
                    fontSize = 14.sp,
                    color = ChatrColors.textSecondary
                )
            }
            
            if (!item.isGranted) {
                TextButton(onClick = onRequest) {
                    Text(
                        text = "Grant",
                        color = ChatrColors.primary,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

@Composable
private fun OemWarningContent(
    instructions: String,
    onOpenSettings: () -> Unit,
    onSkip: () -> Unit
) {
    val manufacturer = remember { OemSurvivalKit.getManufacturer() }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = ChatrColors.warning.copy(alpha = 0.1f)
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = ChatrColors.warning,
                    modifier = Modifier.size(24.dp)
                )
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Text(
                    text = "${manufacturer.name.lowercase().replaceFirstChar { it.uppercase() }} Device Detected",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = ChatrColors.warning
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = instructions,
                fontSize = 14.sp,
                color = ChatrColors.textPrimary,
                lineHeight = 22.sp
            )
        }
    }
    
    Spacer(modifier = Modifier.height(24.dp))
    
    Button(
        onClick = onOpenSettings,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = ChatrColors.primary
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Settings,
            contentDescription = null,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "Open Settings",
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
    
    Spacer(modifier = Modifier.height(12.dp))
    
    TextButton(
        onClick = onSkip,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = "Skip for now (calls may not ring)",
            color = ChatrColors.textSecondary
        )
    }
}
