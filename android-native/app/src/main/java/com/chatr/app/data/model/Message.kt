package com.chatr.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

@Entity(tableName = "messages")
@TypeConverters(MessageConverters::class)
data class Message(
    @PrimaryKey val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String,
    val content: String,
    val type: MessageType,
    val timestamp: Long,
    val status: MessageStatus,
    val mediaUrl: String? = null,
    val thumbnailUrl: String? = null,
    val mediaDuration: Int? = null, // For voice/video in seconds
    val reactions: List<Reaction> = emptyList(),
    val replyToId: String? = null,
    val isEdited: Boolean = false,
    val editedAt: Long? = null,
    val deliveredAt: Long? = null,
    val readAt: Long? = null,
    val localPath: String? = null, // For offline media
    val uploadProgress: Int = 0
)

enum class MessageType {
    TEXT, IMAGE, VIDEO, FILE, VOICE_NOTE, SYSTEM
}

enum class MessageStatus {
    PENDING, SENT, DELIVERED, READ, FAILED
}

data class Reaction(
    val userId: String,
    val emoji: String,
    val timestamp: Long
)

class MessageConverters {
    private val gson = Gson()
    
    @TypeConverter
    fun fromReactionList(value: List<Reaction>): String {
        return gson.toJson(value)
    }
    
    @TypeConverter
    fun toReactionList(value: String): List<Reaction> {
        val type = object : TypeToken<List<Reaction>>() {}.type
        return gson.fromJson(value, type)
    }
    
    @TypeConverter
    fun fromMessageType(value: MessageType): String {
        return value.name
    }
    
    @TypeConverter
    fun toMessageType(value: String): MessageType {
        return MessageType.valueOf(value)
    }
    
    @TypeConverter
    fun fromMessageStatus(value: MessageStatus): String {
        return value.name
    }
    
    @TypeConverter
    fun toMessageStatus(value: String): MessageStatus {
        return MessageStatus.valueOf(value)
    }
}
