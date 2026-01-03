package com.chatr.app.data.repository

import com.chatr.app.config.SupabaseConfig
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.realtime.RealtimeChannel
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.PostgresAction
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Supabase Chat Repository
 * 
 * Handles real-time chat operations using Supabase SDK
 */
@Singleton
class SupabaseChatRepository @Inject constructor(
    private val postgrest: Postgrest,
    private val realtime: Realtime
) {
    
    private var messagesChannel: RealtimeChannel? = null
    
    /**
     * Get conversations for current user
     */
    suspend fun getConversations(userId: String): Result<List<SupabaseConversation>> {
        return try {
            val conversations = postgrest.from("conversations")
                .select {
                    filter {
                        // TODO: Filter by participant (requires join/RPC). Kept as stub.
                    }
                }
                .decodeList<SupabaseConversation>()
            Result.success(conversations)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get messages for a conversation
     */
    suspend fun getMessages(conversationId: String, limit: Int = 50): Result<List<SupabaseMessage>> {
        return try {
            val messages = postgrest.from("messages")
                .select {
                    filter {
                        eq("conversation_id", conversationId)
                    }
                    order("created_at", io.github.jan.supabase.postgrest.query.Order.DESCENDING)
                    limit(limit.toLong())
                }
                .decodeList<SupabaseMessage>()
            Result.success(messages.reversed())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Send a message
     */
    suspend fun sendMessage(
        conversationId: String,
        senderId: String,
        content: String,
        messageType: String = "TEXT"
    ): Result<SupabaseMessage> {
        return try {
            val message = SupabaseMessageInsert(
                conversation_id = conversationId,
                sender_id = senderId,
                content = content,
                message_type = messageType
            )
            val result = postgrest.from("messages")
                .insert(message)
                .decodeSingle<SupabaseMessage>()
            Result.success(result)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Subscribe to real-time messages for a conversation
     */
    suspend fun subscribeToMessages(conversationId: String): Flow<SupabaseMessage> {
        val channel = realtime.channel("messages:$conversationId")

        val flow = channel.postgresChangeFlow<PostgresAction.Insert>(schema = "public") {
            table = "messages"
            filter = "conversation_id=eq.$conversationId"
        }.map { change ->
            change.record.let { record ->
                SupabaseMessage(
                    id = record["id"].toString(),
                    conversation_id = record["conversation_id"].toString(),
                    sender_id = record["sender_id"].toString(),
                    content = record["content"].toString(),
                    message_type = record["message_type"]?.toString() ?: "TEXT",
                    created_at = record["created_at"].toString()
                )
            }
        }

        channel.subscribe()
        messagesChannel = channel

        return flow
    }

    /**
     * Unsubscribe from real-time messages
     */
    suspend fun unsubscribeFromMessages() {
        messagesChannel?.unsubscribe()
        messagesChannel = null
    }

    /**
     * Mark messages as read
     */
    suspend fun markMessagesAsRead(conversationId: String, userId: String): Result<Unit> {
        return try {
            postgrest.from("messages")
                .update(mapOf("read_at" to System.currentTimeMillis())) {
                    filter {
                        eq("conversation_id", conversationId)
                        neq("sender_id", userId)
                        // NOTE: Intentionally not filtering read_at is null (SDK limitation). 
                    }
                }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Create or get direct conversation
     */
    suspend fun getOrCreateDirectConversation(userId: String, otherUserId: String): Result<String> {
        return try {
            // TODO: Implement via RPC when available.
            val conversation = postgrest.from("conversations")
                .insert(
                    mapOf(
                        "is_group" to false,
                        "created_by" to userId
                    )
                )
                .decodeSingle<SupabaseConversation>()
            Result.success(conversation.id)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

@Serializable
data class SupabaseConversation(
    val id: String,
    val group_name: String? = null,
    val is_group: Boolean = false,
    val created_at: String? = null,
    val last_message: String? = null,
    val last_message_time: String? = null
)

@Serializable
data class SupabaseMessage(
    val id: String,
    val conversation_id: String,
    val sender_id: String,
    val content: String,
    val message_type: String = "TEXT",
    val created_at: String? = null,
    val read_at: String? = null
)

@Serializable
data class SupabaseMessageInsert(
    val conversation_id: String,
    val sender_id: String,
    val content: String,
    val message_type: String = "TEXT"
)

