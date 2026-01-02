package com.chatr.app.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for Call History - Telecom-grade call log
 */
@Entity(tableName = "calls")
data class CallEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,
    
    @ColumnInfo(name = "conversationId")
    val conversationId: String,
    
    @ColumnInfo(name = "callerId")
    val callerId: String,
    
    @ColumnInfo(name = "callerName")
    val callerName: String?,
    
    @ColumnInfo(name = "callerPhone")
    val callerPhone: String?,
    
    @ColumnInfo(name = "callerAvatar")
    val callerAvatar: String?,
    
    @ColumnInfo(name = "receiverId")
    val receiverId: String?,
    
    @ColumnInfo(name = "receiverName")
    val receiverName: String?,
    
    @ColumnInfo(name = "receiverPhone")
    val receiverPhone: String?,
    
    @ColumnInfo(name = "receiverAvatar")
    val receiverAvatar: String?,
    
    @ColumnInfo(name = "type")
    val type: String, // audio, video
    
    @ColumnInfo(name = "direction")
    val direction: String, // incoming, outgoing
    
    @ColumnInfo(name = "status")
    val status: String, // initiating, ringing, active, ended, missed, rejected, failed, canceled
    
    @ColumnInfo(name = "isGroup")
    val isGroup: Boolean = false,
    
    @ColumnInfo(name = "missed")
    val missed: Boolean = false,
    
    @ColumnInfo(name = "createdAt")
    val createdAt: Long = System.currentTimeMillis(),
    
    @ColumnInfo(name = "startedAt")
    val startedAt: Long? = null,
    
    @ColumnInfo(name = "endedAt")
    val endedAt: Long? = null,
    
    @ColumnInfo(name = "duration")
    val duration: Long? = null,
    
    @ColumnInfo(name = "isSeen")
    val isSeen: Boolean = false,
    
    @ColumnInfo(name = "qualityRating")
    val qualityRating: Int? = null,
    
    @ColumnInfo(name = "reconnectionCount")
    val reconnectionCount: Int = 0
)
