package com.chatr.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.chatr.app.data.models.Message

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String?,
    val content: String,
    val timestamp: Long,
    val type: String = "TEXT",
    val status: String = "SENT",
    val replyTo: String? = null,
    val mediaUrl: String? = null,
    val deliveredAt: Long? = null,
    val readAt: Long? = null
) {
    fun toMessage(): Message {
        return Message(
            id = id,
            conversationId = conversationId,
            senderId = senderId,
            senderName = senderName,
            content = content,
            timestamp = timestamp,
            type = type,
            status = status,
            replyTo = replyTo,
            mediaUrl = mediaUrl,
            deliveredAt = deliveredAt,
            readAt = readAt
        )
    }
    
    companion object {
        fun fromMessage(message: Message): MessageEntity {
            return MessageEntity(
                id = message.id,
                conversationId = message.conversationId,
                senderId = message.senderId,
                senderName = message.senderName,
                content = message.content,
                timestamp = message.timestamp,
                type = message.type,
                status = message.status,
                replyTo = message.replyTo,
                mediaUrl = message.mediaUrl,
                deliveredAt = message.deliveredAt,
                readAt = message.readAt
            )
        }
    }
}
