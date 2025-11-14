package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.Chat
import com.chatr.app.data.models.Message
import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.data.repository.ChatRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _chats = MutableStateFlow<List<Chat>>(emptyList())
    val chats: StateFlow<List<Chat>> = _chats
    
    private val _messages = MutableStateFlow<List<Message>>(emptyList())
    val messages: StateFlow<List<Message>> = _messages
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading
    
    init {
        loadChats()
    }
    
    fun loadChats() {
        val userId = authRepository.currentUser?.uid ?: return
        
        viewModelScope.launch {
            _isLoading.value = true
            chatRepository.getChats(userId).collect { result ->
                _isLoading.value = false
                if (result.isSuccess) {
                    _chats.value = result.getOrNull() ?: emptyList()
                }
            }
        }
    }
    
    fun loadMessages(chatId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            chatRepository.getMessages(chatId).collect { result ->
                _isLoading.value = false
                if (result.isSuccess) {
                    _messages.value = result.getOrNull() ?: emptyList()
                }
            }
        }
    }
    
    fun sendMessage(chatId: String, content: String) {
        val userId = authRepository.currentUser?.uid ?: return
        
        val message = Message(
            id = "",
            chatId = chatId,
            senderId = userId,
            content = content,
            timestamp = System.currentTimeMillis()
        )
        
        viewModelScope.launch {
            chatRepository.sendMessage(message)
        }
    }
}
