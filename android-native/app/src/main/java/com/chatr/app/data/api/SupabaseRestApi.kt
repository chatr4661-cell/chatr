package com.chatr.app.data.api

import retrofit2.Response
import retrofit2.http.*

/**
 * Supabase REST API interface for RPC function calls
 * 
 * IMPORTANT: This uses the REST API base URL (/rest/v1/), NOT edge functions
 * All RPC functions require POST with JSON body (can be empty {})
 */
interface SupabaseRestApi {
    
    // ==================== RPC FUNCTIONS ====================
    
    /**
     * Get all conversations for the authenticated user
     * RPC function: get_user_conversations()
     * Uses JWT from Authorization header - no userId param needed
     */
    @POST("rpc/get_user_conversations")
    suspend fun getConversations(): Response<List<RpcConversation>>
    
    /**
     * Get messages for a specific conversation
     * RPC function: get_conversation_messages(p_conversation_id, p_limit, p_before)
     */
    @POST("rpc/get_conversation_messages")
    suspend fun getMessages(@Body request: GetMessagesRequest): Response<List<RpcMessage>>
    
    /**
     * Create a direct conversation with another user
     * RPC function: create_direct_conversation(other_user_id)
     */
    @POST("rpc/create_direct_conversation")
    suspend fun createDirectConversation(@Body request: CreateConversationRequest): Response<String>
    
    /**
     * Find a shared conversation between two users
     * RPC function: find_shared_conversation(user1_id, user2_id)
     */
    @POST("rpc/find_shared_conversation")
    suspend fun findSharedConversation(@Body request: FindConversationRequest): Response<String?>
    
    /**
     * Toggle message reaction
     * RPC function: toggle_message_reaction(p_message_id, p_user_id, p_emoji)
     */
    @POST("rpc/toggle_message_reaction")
    suspend fun toggleReaction(@Body request: ToggleReactionRequest): Response<String>
    
    // ==================== DIRECT TABLE ACCESS ====================
    
    /**
     * Insert a message directly to messages table
     * Uses RLS policies for security
     */
    @POST("messages")
    @Headers("Prefer: return=representation")
    suspend fun insertMessage(@Body message: InsertMessageRequest): Response<List<RpcMessage>>
    
    /**
     * Update conversation participant (for marking read)
     */
    @PATCH("conversation_participants")
    suspend fun updateParticipant(
        @Query("conversation_id") conversationId: String,
        @Body update: ParticipantUpdate
    ): Response<Unit>
}

// ==================== REQUEST MODELS ====================

data class GetMessagesRequest(
    val p_conversation_id: String,
    val p_limit: Int = 50,
    val p_before: String? = null
)

data class CreateConversationRequest(
    val other_user_id: String
)

data class FindConversationRequest(
    val user1_id: String,
    val user2_id: String
)

data class ToggleReactionRequest(
    val p_message_id: String,
    val p_user_id: String,
    val p_emoji: String
)

data class InsertMessageRequest(
    val conversation_id: String,
    val sender_id: String,
    val content: String,
    val message_type: String = "text"
)

data class ParticipantUpdate(
    val last_read_at: String
)

// ==================== RESPONSE MODELS ====================

/**
 * Conversation from get_user_conversations RPC
 */
data class RpcConversation(
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
    val displayName: String
        get() = when {
            is_group -> group_name ?: "Group"
            !other_user_name.isNullOrBlank() -> other_user_name
            else -> "Unknown"
        }
    
    val avatarUrl: String?
        get() = if (is_group) group_icon_url else other_user_avatar
}

/**
 * Message from get_conversation_messages RPC
 */
data class RpcMessage(
    val message_id: String? = null,
    val id: String? = null,  // fallback for direct table access
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
) {
    val messageId: String
        get() = message_id ?: id ?: ""
}
