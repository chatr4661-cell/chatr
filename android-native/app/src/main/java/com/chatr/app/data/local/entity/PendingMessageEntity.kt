package com.chatr.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "pending_messages")
data class PendingMessageEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val conversationId: String,
    val content: String,
    val messageType: String = "TEXT",
    val type: String = "TEXT",
    val replyTo: String? = null,
    val replyToId: String? = null,
    val mediaUri: String? = null,
    val mediaUrl: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val retryCount: Int = 0,
    val failed: Boolean = false
)
