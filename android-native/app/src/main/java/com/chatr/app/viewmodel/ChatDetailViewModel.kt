package com.chatr.app.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.data.repository.ConversationItem
import com.chatr.app.data.repository.MessageItem
import com.chatr.app.data.repository.SupabaseRpcRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * State for chat detail screen
 */
data class ChatDetailState(
    val isLoading: Boolean = false,
    val conversation: ConversationItem? = null,
    val messages: List<MessageItem> = emptyList(),
    val error: String? = null,
    val isSending: Boolean = false,
    val currentUserId: String? = null
)

/**
 * ViewModel for chat detail screen
 * Uses SupabaseRpcRepository which calls get_conversation_messages() RPC
 */
@HiltViewModel
class ChatDetailViewModel @Inject constructor(
    private val rpcRepository: SupabaseRpcRepository,
    private val authRepository: AuthRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    
    private val conversationId: String = savedStateHandle.get<String>("conversationId") ?: ""
    
    private val _state = MutableStateFlow(ChatDetailState())
    val state: StateFlow<ChatDetailState> = _state.asStateFlow()
    
    init {
        _state.value = _state.value.copy(
            currentUserId = authRepository.getCurrentUserId()
        )
        if (conversationId.isNotEmpty()) {
            loadMessages()
        }
    }
    
    /**
     * Load messages from backend
     */
    fun loadMessages(before: String? = null) {
        val accessToken = authRepository.getAccessToken()
        
        if (accessToken.isNullOrEmpty()) {
            _state.value = _state.value.copy(
                isLoading = false,
                error = "Not authenticated"
            )
            return
        }
        
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            
            rpcRepository.getMessages(
                accessToken = accessToken,
                conversationId = conversationId,
                limit = 50,
                before = before
            ).onSuccess { messages ->
                // Messages are returned in DESC order, reverse for display
                val displayMessages = if (before == null) {
                    messages.reversed()
                } else {
                    (_state.value.messages + messages.reversed())
                }
                
                _state.value = _state.value.copy(
                    isLoading = false,
                    messages = displayMessages
                )
            }.onFailure { exception ->
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = exception.message ?: "Failed to load messages"
                )
            }
        }
    }
    
    /**
     * Send a new message
     */
    fun sendMessage(content: String, messageType: String = "text") {
        val accessToken = authRepository.getAccessToken()
        
        if (accessToken.isNullOrEmpty() || content.isBlank()) {
            return
        }
        
        viewModelScope.launch {
            _state.value = _state.value.copy(isSending = true)
            
            rpcRepository.sendMessage(
                accessToken = accessToken,
                conversationId = conversationId,
                content = content,
                messageType = messageType
            ).onSuccess { response ->
                // Refresh messages to get the new one
                loadMessages()
                _state.value = _state.value.copy(isSending = false)
            }.onFailure { exception ->
                _state.value = _state.value.copy(
                    isSending = false,
                    error = exception.message ?: "Failed to send message"
                )
            }
        }
    }
    
    /**
     * Load more older messages
     */
    fun loadMoreMessages() {
        val oldestMessage = _state.value.messages.firstOrNull()
        oldestMessage?.created_at?.let { before ->
            loadMessages(before)
        }
    }
    
    /**
     * Mark conversation as read
     */
    fun markAsRead() {
        val accessToken = authRepository.getAccessToken() ?: return
        
        viewModelScope.launch {
            rpcRepository.markConversationAsRead(accessToken, conversationId)
        }
    }
    
    /**
     * Clear error state
     */
    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
    
    /**
     * Check if a message is from the current user
     */
    fun isOwnMessage(senderId: String): Boolean {
        return senderId == _state.value.currentUserId
    }
}
