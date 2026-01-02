package com.chatr.app.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for Conversation
 */
@Entity(tableName = "conversations")
data class ConversationEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,
    
    @ColumnInfo(name = "type")
    val type: String, // DIRECT, GROUP, COMMUNITY, BROADCAST
    
    @ColumnInfo(name = "name")
    val name: String?,
    
    @ColumnInfo(name = "avatarUrl")
    val avatarUrl: String?,
    
    @ColumnInfo(name = "lastMessageId")
    val lastMessageId: String?,
    
    @ColumnInfo(name = "lastMessageContent")
    val lastMessageContent: String?,
    
    @ColumnInfo(name = "lastMessageSenderId")
    val lastMessageSenderId: String?,
    
    @ColumnInfo(name = "lastMessageTimestamp")
    val lastMessageTimestamp: Long?,
    
    @ColumnInfo(name = "unreadCount")
    val unreadCount: Int = 0,
    
    @ColumnInfo(name = "isPinned")
    val isPinned: Boolean = false,
    
    @ColumnInfo(name = "isMuted")
    val isMuted: Boolean = false,
    
    @ColumnInfo(name = "isArchived")
    val isArchived: Boolean = false,
    
    @ColumnInfo(name = "participantsJson")
    val participantsJson: String, // JSON array of participants
    
    @ColumnInfo(name = "updatedAt")
    val updatedAt: Long = System.currentTimeMillis(),
    
    @ColumnInfo(name = "createdAt")
    val createdAt: Long = System.currentTimeMillis(),
    
    @ColumnInfo(name = "syncStatus")
    val syncStatus: String = "SYNCED" // SYNCED, PENDING, FAILED
)
