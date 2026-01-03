package com.chatr.app.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.chatr.app.data.models.Message
import com.chatr.app.data.models.MessageType
import com.chatr.app.data.models.MessageStatus

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "conversationId") val conversationId: String,
    @ColumnInfo(name = "senderId") val senderId: String,
    @ColumnInfo(name = "senderName") val senderName: String? = null,
    val content: String,
    val timestamp: Long,
    val type: String = "TEXT",
    val status: String = "SENT",
    @ColumnInfo(name = "syncStatus") val syncStatus: SyncStatus = SyncStatus.SYNCED,
    @ColumnInfo(name = "replyTo") val replyTo: String? = null,
    @ColumnInfo(name = "mediaUrl") val mediaUrl: String? = null,
    @ColumnInfo(name = "deliveredAt") val deliveredAt: Long? = null,
    @ColumnInfo(name = "readAt") val readAt: Long? = null,
    // GSM-grade ordering: monotonic sequence number per conversation
    @ColumnInfo(name = "sequenceNumber") val sequenceNumber: Long = 0L,
    // Client-generated ID for deduplication
    @ColumnInfo(name = "clientId") val clientId: String? = null
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
