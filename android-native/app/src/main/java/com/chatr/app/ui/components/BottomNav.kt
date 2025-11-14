package com.chatr.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.vectorResource
import androidx.compose.ui.unit.dp
import com.chatr.app.R
import com.chatr.app.ui.theme.*

data class BottomNavItem(
    val label: String,
    val icon: Int,
    val route: String
)

@Composable
fun ChatrBottomNavigation(
    selectedRoute: String,
    onNavigate: (String) -> Unit
) {
    val items = listOf(
        BottomNavItem("Contacts", R.drawable.ic_contacts, "contacts"),
        BottomNavItem("Calls", R.drawable.ic_calls, "calls"),
        BottomNavItem("Chats", R.drawable.ic_chats, "chats"),
        BottomNavItem("Settings", R.drawable.ic_settings, "settings")
    )

    NavigationBar(
        containerColor = BackgroundSecondary,
        tonalElevation = 8.dp
    ) {
        items.forEach { item ->
            NavigationBarItem(
                selected = selectedRoute == item.route,
                onClick = { onNavigate(item.route) },
                icon = {
                    Icon(
                        imageVector = ImageVector.vectorResource(item.icon),
                        contentDescription = item.label
                    )
                },
                label = {
                    Text(
                        text = item.label,
                        style = MaterialTheme.typography.labelMedium
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Primary,
                    selectedTextColor = Primary,
                    unselectedIconColor = MutedForeground,
                    unselectedTextColor = MutedForeground,
                    indicatorColor = Muted
                )
            )
        }
    }
}
