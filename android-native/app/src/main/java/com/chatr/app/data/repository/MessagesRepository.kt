package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import com.chatr.app.data.models.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MessagesRepository @Inject constructor(
    private val api: ChatrApi
) {
    
    fun getMessages(chatId: String, limit: Int = 50, offset: Int = 0): Flow<Result<List<Message>>> = flow {
        emit(safeApiCall { api.getMessages(chatId, limit, offset) })
    }
    
    /**
     * Send message using domain model SendMessageRequest
     */
    suspend fun sendMessage(request: SendMessageRequest): Result<Message> {
        return safeApiCall {
            api.sendMessage(
                com.chatr.app.data.api.SendMessageRequest(
                    conversationId = request.conversationId,
                    content = request.content,
                    type = request.type.name,
                    replyTo = request.replyTo,
                    mediaUrl = request.mediaUrl
                )
            )
        }
    }
    
    /**
     * Send message with individual parameters
     */
    suspend fun sendMessage(
        conversationId: String,
        content: String,
        type: String = "TEXT",
        replyTo: String? = null,
        mediaUrl: String? = null
    ): Result<Message> {
        return safeApiCall {
            api.sendMessage(
                com.chatr.app.data.api.SendMessageRequest(conversationId, content, type, replyTo, mediaUrl)
            )
        }
    }
    
    suspend fun editMessage(messageId: String, content: String): Result<Message> {
        return safeApiCall {
            api.editMessage(messageId, EditMessageRequest(content))
        }
    }
    
    suspend fun deleteMessage(messageId: String): Result<Unit> {
        return safeApiCall { api.deleteMessage(messageId) }
    }
    
    suspend fun markAsRead(messageId: String): Result<Unit> {
        return safeApiCall { api.markAsRead(messageId) }
    }
    
    suspend fun addReaction(messageId: String, emoji: String): Result<Unit> {
        return safeApiCall { 
            api.addReaction(messageId, ReactionRequest(emoji)) 
        }
    }
}
