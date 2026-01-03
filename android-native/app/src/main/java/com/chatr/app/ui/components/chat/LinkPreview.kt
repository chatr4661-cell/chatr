package com.chatr.app.ui.components.chat

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.chatr.app.ui.theme.*

/**
 * Link Preview Card - Displays URL metadata inline in chat
 */
@Composable
fun LinkPreview(
    url: String,
    title: String? = null,
    description: String? = null,
    imageUrl: String? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    
    // Extract domain from URL
    val domain = remember(url) {
        try {
            Uri.parse(url).host?.removePrefix("www.") ?: url
        } catch (e: Exception) {
            url
        }
    }
    
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    context.startActivity(intent)
                } catch (e: Exception) {
                    // Handle invalid URL
                }
            },
        colors = CardDefaults.cardColors(containerColor = BackgroundSecondary),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(modifier = Modifier.height(IntrinsicSize.Min)) {
            // Left accent bar
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .fillMaxHeight()
                    .background(Primary)
            )
            
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(12.dp)
            ) {
                // Domain
                Text(
                    text = domain,
                    style = MaterialTheme.typography.labelSmall,
                    color = Primary,
                    fontWeight = FontWeight.Medium
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                // Title
                if (!title.isNullOrBlank()) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Foreground,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                }
                
                // Description
                if (!description.isNullOrBlank()) {
                    Text(
                        text = description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MutedForeground,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            
            // Thumbnail
            if (!imageUrl.isNullOrBlank()) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = "Link preview",
                    modifier = Modifier
                        .size(80.dp)
                        .clip(RoundedCornerShape(topEnd = 8.dp, bottomEnd = 8.dp)),
                    contentScale = ContentScale.Crop
                )
            }
        }
    }
}

/**
 * Utility to extract URLs from message content
 */
object LinkDetector {
    private val urlPattern = Regex(
        """(https?://[^\s<>"{}|\\^`\[\]]+)""",
        RegexOption.IGNORE_CASE
    )
    
    /**
     * Find all URLs in a text
     */
    fun findUrls(text: String): List<String> {
        return urlPattern.findAll(text).map { it.value }.toList()
    }
    
    /**
     * Check if text contains any URL
     */
    fun containsUrl(text: String): Boolean {
        return urlPattern.containsMatchIn(text)
    }
    
    /**
     * Get the first URL from text
     */
    fun getFirstUrl(text: String): String? {
        return urlPattern.find(text)?.value
    }
}

/**
 * Simple link preview data class
 */
data class LinkPreviewData(
    val url: String,
    val title: String? = null,
    val description: String? = null,
    val imageUrl: String? = null
)
