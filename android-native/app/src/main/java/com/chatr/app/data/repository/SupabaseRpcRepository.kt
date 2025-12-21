package com.chatr.app.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Supabase RPC Repository
 * 
 * Uses RPC functions that infer user from JWT - no userId params needed.
 * This fixes the "Unknown" user issue and "participant_user_id" column error.
 * 
 * API Contract:
 * - GET conversations: POST /rest/v1/rpc/get_user_conversations
 * - GET messages: POST /rest/v1/rpc/get_conversation_messages
 */
@Singleton
class SupabaseRpcRepository @Inject constructor(
    private val okHttpClient: OkHttpClient
) {
    
    private val json = Json { 
        ignoreUnknownKeys = true 
        coerceInputValues = true
    }
    
    companion object {
        private const val SUPABASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co"
        private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw"
    }
    
    /**
     * Get all conversations for the authenticated user
     * 
     * Endpoint: POST /rest/v1/rpc/get_user_conversations
     * Auth: Bearer token from SharedPreferences
     * 
     * Returns conversations with:
     * - other_user_name (no more "Unknown"!)
     * - other_user_avatar
     * - last_message
     * - unread_count
     */
    suspend fun getConversations(accessToken: String): Result<List<ConversationItem>> {
        return withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url("$SUPABASE_URL/rest/v1/rpc/get_user_conversations")
                    .addHeader("Authorization", "Bearer $accessToken")
                    .addHeader("apikey", SUPABASE_ANON_KEY)
                    .addHeader("Content-Type", "application/json")
                    .post("{}".toRequestBody("application/json".toMediaType()))
                    .build()
                
                val response = okHttpClient.newCall(request).execute()
                
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: "[]"
                    val conversations = json.decodeFromString<List<ConversationItem>>(body)
                    Result.success(conversations)
                } else {
                    val errorBody = response.body?.string() ?: "Unknown error"
                    Result.failure(Exception("API Error ${response.code}: $errorBody"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Get messages for a specific conversation
     * 
     * Endpoint: POST /rest/v1/rpc/get_conversation_messages
     * Body: { "p_conversation_id": "uuid", "p_limit": 50 }
     * 
     * Returns messages with sender info already joined
     */
    suspend fun getMessages(
        accessToken: String,
        conversationId: String,
        limit: Int = 50,
        before: String? = null
    ): Result<List<MessageItem>> {
        return withContext(Dispatchers.IO) {
            try {
                val bodyContent = buildString {
                    append("{")
                    append("\"p_conversation_id\":\"$conversationId\"")
                    append(",\"p_limit\":$limit")
                    if (before != null) {
                        append(",\"p_before\":\"$before\"")
                    }
                    append("}")
                }
                
                val request = Request.Builder()
                    .url("$SUPABASE_URL/rest/v1/rpc/get_conversation_messages")
                    .addHeader("Authorization", "Bearer $accessToken")
                    .addHeader("apikey", SUPABASE_ANON_KEY)
                    .addHeader("Content-Type", "application/json")
                    .post(bodyContent.toRequestBody("application/json".toMediaType()))
                    .build()
                
                val response = okHttpClient.newCall(request).execute()
                
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: "[]"
                    val messages = json.decodeFromString<List<MessageItem>>(body)
                    Result.success(messages)
                } else {
                    val errorBody = response.body?.string() ?: "Unknown error"
                    Result.failure(Exception("API Error ${response.code}: $errorBody"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Send a message to a conversation
     * 
     * Endpoint: POST /rest/v1/messages
     * Uses RLS - sender_id is set by trigger from auth.uid()
     */
    suspend fun sendMessage(
        accessToken: String,
        conversationId: String,
        content: String,
        messageType: String = "text"
    ): Result<SendMessageResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val bodyContent = """
                    {
                        "conversation_id": "$conversationId",
                        "content": "$content",
                        "message_type": "$messageType"
                    }
                """.trimIndent()
                
                val request = Request.Builder()
                    .url("$SUPABASE_URL/rest/v1/messages")
                    .addHeader("Authorization", "Bearer $accessToken")
                    .addHeader("apikey", SUPABASE_ANON_KEY)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("Prefer", "return=representation")
                    .post(bodyContent.toRequestBody("application/json".toMediaType()))
                    .build()
                
                val response = okHttpClient.newCall(request).execute()
                
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: "[]"
                    val messages = json.decodeFromString<List<SendMessageResponse>>(body)
                    if (messages.isNotEmpty()) {
                        Result.success(messages.first())
                    } else {
                        Result.failure(Exception("Empty response"))
                    }
                } else {
                    val errorBody = response.body?.string() ?: "Unknown error"
                    Result.failure(Exception("API Error ${response.code}: $errorBody"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
    
    /**
     * Mark messages as read in a conversation
     */
    suspend fun markConversationAsRead(
        accessToken: String,
        conversationId: String
    ): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val bodyContent = """{"last_read_at": "${java.time.Instant.now()}"}"""
                
                val request = Request.Builder()
                    .url("$SUPABASE_URL/rest/v1/conversation_participants?conversation_id=eq.$conversationId")
                    .addHeader("Authorization", "Bearer $accessToken")
                    .addHeader("apikey", SUPABASE_ANON_KEY)
                    .addHeader("Content-Type", "application/json")
                    .patch(bodyContent.toRequestBody("application/json".toMediaType()))
                    .build()
                
                val response = okHttpClient.newCall(request).execute()
                
                if (response.isSuccessful) {
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Failed to mark as read"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}

/**
 * Conversation item returned by get_user_conversations RPC
 */
@Serializable
data class ConversationItem(
    val conversation_id: String,
    val is_group: Boolean = false,
    val group_name: String? = null,
    val group_icon_url: String? = null,
    val other_user_id: String? = null,
    val other_user_name: String? = null,
    val other_user_avatar: String? = null,
    val other_user_online: Boolean = false,
    val last_message: String? = null,
    val last_message_type: String? = null,
    val last_message_at: String? = null,
    val last_message_sender_id: String? = null,
    val unread_count: Long = 0,
    val is_muted: Boolean = false,
    val is_archived: Boolean = false
) {
    /**
     * Display name for the conversation
     */
    val displayName: String
        get() = when {
            is_group -> group_name ?: "Group"
            !other_user_name.isNullOrBlank() -> other_user_name
            else -> "Unknown"
        }
    
    /**
     * Avatar URL for the conversation
     */
    val avatarUrl: String?
        get() = when {
            is_group -> group_icon_url
            else -> other_user_avatar
        }
}

/**
 * Message item returned by get_conversation_messages RPC
 */
@Serializable
data class MessageItem(
    val message_id: String,
    val sender_id: String,
    val sender_name: String? = null,
    val sender_avatar: String? = null,
    val content: String,
    val message_type: String = "text",
    val created_at: String? = null,
    val is_edited: Boolean = false,
    val is_deleted: Boolean = false,
    val is_starred: Boolean = false,
    val reply_to_id: String? = null,
    val media_url: String? = null,
    val media_attachments: String? = null,
    val reactions: String? = null,
    val status: String = "sent"
)

/**
 * Response from sending a message
 */
@Serializable
data class SendMessageResponse(
    val id: String,
    val conversation_id: String,
    val sender_id: String,
    val content: String,
    val message_type: String = "text",
    val created_at: String? = null,
    val status: String = "sent"
)
