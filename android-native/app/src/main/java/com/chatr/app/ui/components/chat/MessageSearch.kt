package com.chatr.app.ui.components.chat

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import com.chatr.app.ui.theme.*

/**
 * Message search bar for chat
 */
@Composable
fun MessageSearchBar(
    isVisible: Boolean,
    searchQuery: String,
    onQueryChange: (String) -> Unit,
    onClose: () -> Unit,
    currentMatch: Int,
    totalMatches: Int,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    modifier: Modifier = Modifier
) {
    val focusRequester = remember { FocusRequester() }
    
    AnimatedVisibility(
        visible = isVisible,
        enter = slideInVertically() + fadeIn(),
        exit = slideOutVertically() + fadeOut()
    ) {
        Surface(
            modifier = modifier.fillMaxWidth(),
            color = BackgroundSecondary,
            tonalElevation = 4.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Back/close button
                IconButton(onClick = onClose) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Close search",
                        tint = Foreground
                    )
                }
                
                // Search input
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = onQueryChange,
                    modifier = Modifier
                        .weight(1f)
                        .focusRequester(focusRequester),
                    placeholder = { Text("Search messages...") },
                    singleLine = true,
                    shape = RoundedCornerShape(24.dp),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Card,
                        unfocusedContainerColor = Card,
                        focusedIndicatorColor = Primary,
                        unfocusedIndicatorColor = Border
                    ),
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = null,
                            tint = MutedForeground
                        )
                    },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { onQueryChange("") }) {
                                Icon(
                                    imageVector = Icons.Default.Clear,
                                    contentDescription = "Clear search",
                                    tint = MutedForeground
                                )
                            }
                        }
                    }
                )
                
                // Match counter and navigation
                if (totalMatches > 0) {
                    Spacer(modifier = Modifier.width(8.dp))
                    
                    Text(
                        text = "$currentMatch/$totalMatches",
                        style = MaterialTheme.typography.bodySmall,
                        color = MutedForeground
                    )
                    
                    IconButton(
                        onClick = onPrevious,
                        enabled = currentMatch > 1
                    ) {
                        Icon(
                            imageVector = Icons.Default.KeyboardArrowUp,
                            contentDescription = "Previous match",
                            tint = if (currentMatch > 1) Foreground else MutedForeground
                        )
                    }
                    
                    IconButton(
                        onClick = onNext,
                        enabled = currentMatch < totalMatches
                    ) {
                        Icon(
                            imageVector = Icons.Default.KeyboardArrowDown,
                            contentDescription = "Next match",
                            tint = if (currentMatch < totalMatches) Foreground else MutedForeground
                        )
                    }
                }
            }
        }
    }
    
    LaunchedEffect(isVisible) {
        if (isVisible) {
            focusRequester.requestFocus()
        }
    }
}
