package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.data.repository.ConversationItem
import com.chatr.app.data.repository.SupabaseRpcRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * State for conversations list screen
 */
data class ConversationsState(
    val isLoading: Boolean = false,
    val conversations: List<ConversationItem> = emptyList(),
    val error: String? = null
)

/**
 * ViewModel for conversations list
 * Uses SupabaseRpcRepository which calls get_user_conversations() RPC
 * This provides the same data as the web app
 */
@HiltViewModel
class ConversationsViewModel @Inject constructor(
    private val rpcRepository: SupabaseRpcRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _state = MutableStateFlow(ConversationsState())
    val state: StateFlow<ConversationsState> = _state.asStateFlow()
    
    init {
        loadConversations()
    }
    
    /**
     * Load conversations from backend
     * Uses JWT-based RPC - no user ID needed
     */
    fun loadConversations() {
        val accessToken = authRepository.getAccessToken()
        
        if (accessToken.isNullOrEmpty()) {
            _state.value = _state.value.copy(
                isLoading = false,
                error = "Not authenticated. Please log in again."
            )
            return
        }
        
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            
            rpcRepository.getConversations(accessToken)
                .onSuccess { conversations ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        conversations = conversations.sortedByDescending { it.last_message_at }
                    )
                }
                .onFailure { exception ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = exception.message ?: "Failed to load conversations"
                    )
                }
        }
    }
    
    /**
     * Clear error state
     */
    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
    
    /**
     * Check if user is authenticated
     */
    fun isAuthenticated(): Boolean {
        return !authRepository.getAccessToken().isNullOrEmpty()
    }
}
