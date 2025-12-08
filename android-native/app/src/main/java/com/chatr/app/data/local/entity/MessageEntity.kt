package com.chatr.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.chatr.app.data.models.Message
import com.chatr.app.data.models.MessageType
import com.chatr.app.data.models.MessageStatus

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String? = null,
    val content: String,
    val timestamp: Long,
    val type: String = "TEXT",
    val status: String = "SENT",
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val replyTo: String? = null,
    val mediaUrl: String? = null,
    val deliveredAt: Long? = null,
    val readAt: Long? = null
) {
    fun toMessage(): Message {
        return Message(
            id = id,
            conversationId = conversationId,
            chatId = conversationId,
            senderId = senderId,
            senderName = senderName,
            content = content,
            timestamp = timestamp,
            type = try { MessageType.valueOf(type) } catch (e: Exception) { MessageType.TEXT },
            status = try { MessageStatus.valueOf(status) } catch (e: Exception) { MessageStatus.SENT },
            replyTo = replyTo,
            replyToId = replyTo,
            mediaUrl = mediaUrl,
            deliveredAt = deliveredAt,
            readAt = readAt
        )
    }
    
    companion object {
        fun fromMessage(message: Message): MessageEntity {
            return MessageEntity(
                id = message.id,
                conversationId = message.conversationId.ifEmpty { message.chatId },
                senderId = message.senderId,
                senderName = message.senderName,
                content = message.content,
                timestamp = message.timestamp,
                type = message.type.name,
                status = message.status.name,
                replyTo = message.replyTo ?: message.replyToId,
                mediaUrl = message.mediaUrl,
                deliveredAt = message.deliveredAt,
                readAt = message.readAt
            )
        }
    }
}
