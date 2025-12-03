package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.*
import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.data.repository.ChatRepository
import com.chatr.app.data.repository.MessagesRepository
import com.chatr.app.websocket.PresenceClient
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatsListState(
    val isLoading: Boolean = false,
    val chats: List<Chat> = emptyList(),
    val error: String? = null
)

data class ChatDetailState(
    val isLoading: Boolean = false,
    val chat: Chat? = null,
    val messages: List<Message> = emptyList(),
    val error: String? = null,
    val isSending: Boolean = false,
    val typingUsers: Set<String> = emptySet()
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val messagesRepository: MessagesRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _chatsListState = MutableStateFlow(ChatsListState())
    val chatsListState: StateFlow<ChatsListState> = _chatsListState.asStateFlow()
    
    private val _chatDetailState = MutableStateFlow(ChatDetailState())
    val chatDetailState: StateFlow<ChatDetailState> = _chatDetailState.asStateFlow()
    
    // Legacy compatibility
    private val _chats = MutableStateFlow<List<Chat>>(emptyList())
    val chats: StateFlow<List<Chat>> = _chats
    
    private val _messages = MutableStateFlow<List<Message>>(emptyList())
    val messages: StateFlow<List<Message>> = _messages
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading
    
    private var presenceClient: PresenceClient? = null
    private var currentChatId: String? = null
    
    init {
        loadChats()
    }
    
    fun loadChats() {
        val userId = authRepository.getCurrentUserId() ?: return
        
        viewModelScope.launch {
            _chatsListState.value = _chatsListState.value.copy(isLoading = true, error = null)
            _isLoading.value = true
            
            chatRepository.getChats(userId).collect { result ->
                result.onSuccess { chatsList ->
                    val sorted = chatsList.sortedByDescending { it.updatedAt }
                    _chatsListState.value = _chatsListState.value.copy(
                        isLoading = false,
                        chats = sorted
                    )
                    _chats.value = sorted
                    _isLoading.value = false
                }.onFailure { exception ->
                    _chatsListState.value = _chatsListState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "Failed to load chats"
                    )
                    _isLoading.value = false
                }
            }
        }
    }
    
    fun loadChat(chatId: String) {
        currentChatId = chatId
        viewModelScope.launch {
            _chatDetailState.value = _chatDetailState.value.copy(isLoading = true, error = null)
            
            chatRepository.getChatById(chatId)
                .onSuccess { chat ->
                    _chatDetailState.value = _chatDetailState.value.copy(chat = chat)
                }
                .onFailure { exception ->
                    _chatDetailState.value = _chatDetailState.value.copy(
                        error = exception.message
                    )
                }
            
            loadMessages(chatId)
        }
    }
    
    fun loadMessages(chatId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            
            messagesRepository.getMessages(chatId, 50, 0).collect { result ->
                result.onSuccess { messagesList ->
                    val sorted = messagesList.sortedBy { it.timestamp }
                    _chatDetailState.value = _chatDetailState.value.copy(
                        isLoading = false,
                        messages = sorted
                    )
                    _messages.value = sorted
                    _isLoading.value = false
                }.onFailure { exception ->
                    _chatDetailState.value = _chatDetailState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "Failed to load messages"
                    )
                    _isLoading.value = false
                }
            }
        }
    }
    
    fun loadMoreMessages(chatId: String) {
        val currentCount = _chatDetailState.value.messages.size
        viewModelScope.launch {
            messagesRepository.getMessages(chatId, limit = 50, offset = currentCount).collect { result ->
                result.onSuccess { newMessages ->
                    val allMessages = _chatDetailState.value.messages + newMessages
                    _chatDetailState.value = _chatDetailState.value.copy(
                        messages = allMessages.sortedBy { it.timestamp }
                    )
                }
            }
        }
    }
    
    fun sendMessage(chatId: String, content: String, type: MessageType = MessageType.TEXT, replyTo: String? = null, mediaUrl: String? = null) {
        viewModelScope.launch {
            _chatDetailState.value = _chatDetailState.value.copy(isSending = true)
            
            messagesRepository.sendMessage(
                SendMessageRequest(
                    conversationId = chatId,
                    content = content,
                    type = type,
                    replyTo = replyTo,
                    mediaUrl = mediaUrl
                )
            ).onSuccess { message ->
                val updatedMessages = _chatDetailState.value.messages + message
                _chatDetailState.value = _chatDetailState.value.copy(
                    isSending = false,
                    messages = updatedMessages.sortedBy { it.timestamp }
                )
                _messages.value = updatedMessages.sortedBy { it.timestamp }
            }.onFailure { exception ->
                _chatDetailState.value = _chatDetailState.value.copy(
                    isSending = false,
                    error = exception.message ?: "Failed to send message"
                )
            }
        }
    }
    
    fun editMessage(messageId: String, newContent: String) {
        viewModelScope.launch {
            messagesRepository.editMessage(messageId, newContent)
                .onSuccess { updatedMessage ->
                    val updatedMessages = _chatDetailState.value.messages.map {
                        if (it.id == messageId) updatedMessage else it
                    }
                    _chatDetailState.value = _chatDetailState.value.copy(messages = updatedMessages)
                    _messages.value = updatedMessages
                }
                .onFailure { exception ->
                    _chatDetailState.value = _chatDetailState.value.copy(
                        error = exception.message
                    )
                }
        }
    }
    
    fun deleteMessage(messageId: String) {
        viewModelScope.launch {
            messagesRepository.deleteMessage(messageId)
                .onSuccess {
                    val updatedMessages = _chatDetailState.value.messages.filter { it.id != messageId }
                    _chatDetailState.value = _chatDetailState.value.copy(messages = updatedMessages)
                    _messages.value = updatedMessages
                }
                .onFailure { exception ->
                    _chatDetailState.value = _chatDetailState.value.copy(
                        error = exception.message
                    )
                }
        }
    }
    
    fun markAsRead(messageId: String) {
        viewModelScope.launch {
            messagesRepository.markAsRead(messageId)
        }
    }
    
    fun addReaction(messageId: String, emoji: String) {
        viewModelScope.launch {
            messagesRepository.addReaction(messageId, emoji)
                .onSuccess {
                    currentChatId?.let { loadMessages(it) }
                }
        }
    }
    
    fun createChat(participants: List<String>, isGroup: Boolean = false, groupName: String? = null) {
        viewModelScope.launch {
            chatRepository.createChat(participants, isGroup, groupName)
                .onSuccess { chat ->
                    loadChats()
                }
                .onFailure { exception ->
                    _chatsListState.value = _chatsListState.value.copy(
                        error = exception.message
                    )
                }
        }
    }
    
    fun deleteChat(chatId: String) {
        viewModelScope.launch {
            chatRepository.deleteChat(chatId)
                .onSuccess {
                    val updatedChats = _chatsListState.value.chats.filter { it.id != chatId }
                    _chatsListState.value = _chatsListState.value.copy(chats = updatedChats)
                    _chats.value = updatedChats
                }
        }
    }
    
    fun addParticipant(chatId: String, userId: String) {
        viewModelScope.launch {
            chatRepository.addParticipant(chatId, userId)
                .onSuccess {
                    loadChat(chatId)
                }
        }
    }
    
    fun removeParticipant(chatId: String, userId: String) {
        viewModelScope.launch {
            chatRepository.removeParticipant(chatId, userId)
                .onSuccess {
                    loadChat(chatId)
                }
        }
    }
    
    // Presence & Typing indicators
    fun connectPresence(userId: String, token: String) {
        presenceClient = PresenceClient(userId, token) { event ->
            when (event) {
                is PresenceClient.PresenceEvent.UserTyping -> {
                    if (event.conversationId == currentChatId) {
                        _chatDetailState.value = _chatDetailState.value.copy(
                            typingUsers = _chatDetailState.value.typingUsers + event.userId
                        )
                    }
                }
                is PresenceClient.PresenceEvent.UserStoppedTyping -> {
                    _chatDetailState.value = _chatDetailState.value.copy(
                        typingUsers = _chatDetailState.value.typingUsers - event.userId
                    )
                }
                is PresenceClient.PresenceEvent.NewMessage -> {
                    if (event.conversationId == currentChatId) {
                        currentChatId?.let { loadMessages(it) }
                    }
                    loadChats() // Refresh chat list
                }
                else -> {}
            }
        }
        presenceClient?.connect()
    }
    
    fun sendTypingIndicator(conversationId: String) {
        presenceClient?.sendTyping(conversationId)
    }
    
    fun sendStopTypingIndicator(conversationId: String) {
        presenceClient?.sendStopTyping(conversationId)
    }
    
    fun clearError() {
        _chatDetailState.value = _chatDetailState.value.copy(error = null)
        _chatsListState.value = _chatsListState.value.copy(error = null)
    }
    
    override fun onCleared() {
        super.onCleared()
        presenceClient?.disconnect()
    }
}
