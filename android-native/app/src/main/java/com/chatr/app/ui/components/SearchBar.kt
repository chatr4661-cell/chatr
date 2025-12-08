package com.chatr.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.chatr.app.ui.theme.Primary
import com.chatr.app.ui.theme.Border
import com.chatr.app.ui.theme.Foreground
import com.chatr.app.ui.theme.MutedForeground
import com.chatr.app.ui.theme.Card as CardColor

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatrSearchBar(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String = "Search anything...",
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = {
            Text(
                text = placeholder,
                color = MutedForeground
            )
        },
        leadingIcon = {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = MutedForeground
            )
        },
        modifier = modifier
            .fillMaxWidth()
            .background(CardColor, RoundedCornerShape(12.dp)),
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = CardColor,
            unfocusedContainerColor = CardColor,
            focusedBorderColor = Primary,
            unfocusedBorderColor = Border,
            focusedTextColor = Foreground,
            unfocusedTextColor = Foreground,
            cursorColor = Primary
        ),
        singleLine = true
    )
}
