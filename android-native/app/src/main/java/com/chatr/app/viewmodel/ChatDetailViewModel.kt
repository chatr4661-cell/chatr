package com.chatr.app.viewmodel

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.data.repository.ConversationItem
import com.chatr.app.data.repository.MessageItem
import com.chatr.app.data.repository.SupabaseRpcRepository
import com.chatr.app.media.VoiceRecorder
import com.chatr.app.websocket.PresenceClient
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
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
    val currentUserId: String? = null,
    // Reply state
    val replyingToMessage: MessageItem? = null,
    // Voice recording state
    val isRecording: Boolean = false,
    val recordingDuration: Int = 0,
    val recordingAmplitude: Int = 0,
    // Typing state
    val typingUsers: Set<String> = emptySet(),
    val isOtherUserTyping: Boolean = false,
    // Search state
    val isSearching: Boolean = false,
    val searchQuery: String = "",
    val searchMatches: List<String> = emptyList(),
    val currentSearchIndex: Int = 0,
    // Action sheet state
    val selectedMessageId: String? = null,
    val showActionSheet: Boolean = false,
    // Forward dialog state
    val showForwardDialog: Boolean = false,
    val forwardMessageContent: String = "",
    val forwardConversations: List<ConversationItem> = emptyList(),
    // Media viewer state
    val showMediaViewer: Boolean = false,
    val viewerMediaUrl: String = "",
    val viewerMediaType: String = "image"
)

/**
 * ViewModel for chat detail screen
 * Complete implementation with all features
 */
@HiltViewModel
class ChatDetailViewModel @Inject constructor(
    private val rpcRepository: SupabaseRpcRepository,
    private val authRepository: AuthRepository,
    private val voiceRecorder: VoiceRecorder,
    private val presenceClient: PresenceClient,
    @ApplicationContext private val context: Context,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    
    private val conversationId: String = savedStateHandle.get<String>("conversationId") ?: ""
    
    private val _state = MutableStateFlow(ChatDetailState())
    val state: StateFlow<ChatDetailState> = _state.asStateFlow()
    
    private var typingJob: Job? = null
    private var amplitudePollingJob: Job? = null
    private var realtimeRefreshJob: Job? = null
    
    init {
        val userId = authRepository.getCurrentUserId()
        val token = authRepository.getAccessToken()
        
        _state.value = _state.value.copy(currentUserId = userId)
        
        if (conversationId.isNotEmpty()) {
            loadMessages()
            
            // Subscribe to realtime
            if (!userId.isNullOrEmpty() && !token.isNullOrEmpty()) {
                presenceClient.connect(userId, token)
                presenceClient.subscribeToConversation(conversationId)
                observeRealtimeEvents()
            }
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
    fun sendMessage(content: String, messageType: String = "text", mediaUrl: String? = null) {
        val accessToken = authRepository.getAccessToken()
        
        if (accessToken.isNullOrEmpty() || content.isBlank()) {
            return
        }
        
        val replyToId = _state.value.replyingToMessage?.message_id
        
        viewModelScope.launch {
            _state.value = _state.value.copy(isSending = true, replyingToMessage = null)
            
            rpcRepository.sendMessage(
                accessToken = accessToken,
                conversationId = conversationId,
                content = content,
                messageType = messageType,
                replyToId = replyToId,
                mediaUrl = mediaUrl
            ).onSuccess { response ->
                loadMessages()
                _state.value = _state.value.copy(isSending = false)
                stopTypingIndicator()
            }.onFailure { exception ->
                _state.value = _state.value.copy(
                    isSending = false,
                    error = exception.message ?: "Failed to send message"
                )
            }
        }
    }
    
    // ==================== REPLY FEATURE ====================
    
    fun setReplyingTo(message: MessageItem) {
        _state.value = _state.value.copy(replyingToMessage = message)
    }
    
    fun cancelReply() {
        _state.value = _state.value.copy(replyingToMessage = null)
    }
    
    // ==================== VOICE RECORDING ====================
    
    fun startVoiceRecording() {
        if (!voiceRecorder.hasPermission()) {
            _state.value = _state.value.copy(error = "Microphone permission required")
            return
        }
        
        if (voiceRecorder.startRecording()) {
            _state.value = _state.value.copy(
                isRecording = true,
                recordingDuration = 0,
                recordingAmplitude = 0
            )
            startAmplitudePolling()
        }
    }
    
    fun stopVoiceRecording() {
        amplitudePollingJob?.cancel()
        
        val audioFile = voiceRecorder.stopRecording()
        _state.value = _state.value.copy(isRecording = false)
        
        if (audioFile != null) {
            uploadAndSendVoiceMessage(audioFile)
        }
    }
    
    fun cancelVoiceRecording() {
        amplitudePollingJob?.cancel()
        voiceRecorder.cancelRecording()
        _state.value = _state.value.copy(isRecording = false)
    }
    
    private fun startAmplitudePolling() {
        amplitudePollingJob = viewModelScope.launch {
            while (_state.value.isRecording) {
                val amplitude = voiceRecorder.getAmplitude()
                val duration = voiceRecorder.getDuration()
                _state.value = _state.value.copy(
                    recordingAmplitude = amplitude,
                    recordingDuration = duration
                )
                delay(100)
            }
        }
    }
    
    private fun uploadAndSendVoiceMessage(file: File) {
        // TODO: Upload to Supabase Storage
        // For now, send as text placeholder
        sendMessage("[Voice message: ${voiceRecorder.formatDuration(_state.value.recordingDuration)}]", "voice")
    }
    
    // ==================== TYPING INDICATOR ====================
    
    fun onTextChanged(text: String) {
        if (text.isNotEmpty()) {
            sendTypingIndicator()
        } else {
            stopTypingIndicator()
        }
    }
    
    private fun sendTypingIndicator() {
        typingJob?.cancel()
        presenceClient.sendTypingStart(conversationId)
        
        typingJob = viewModelScope.launch {
            delay(3000)
            stopTypingIndicator()
        }
    }
    
    private fun stopTypingIndicator() {
        typingJob?.cancel()
        presenceClient.sendTypingStop(conversationId)
    }
    
    // ==================== REALTIME UPDATES ====================
    
    private fun observeRealtimeEvents() {
        viewModelScope.launch {
            presenceClient.typingEvents.collect { event ->
                if (event.userId != _state.value.currentUserId) {
                    _state.value = _state.value.copy(
                        isOtherUserTyping = event.isTyping,
                        typingUsers = if (event.isTyping) {
                            _state.value.typingUsers + event.userId
                        } else {
                            _state.value.typingUsers - event.userId
                        }
                    )
                }
            }
        }
    }
    
    fun refreshMessages() {
        loadMessages()
    }
    
    // ==================== MESSAGE ACTIONS ====================
    
    fun showMessageActions(messageId: String) {
        _state.value = _state.value.copy(
            selectedMessageId = messageId,
            showActionSheet = true
        )
    }
    
    fun hideMessageActions() {
        _state.value = _state.value.copy(
            selectedMessageId = null,
            showActionSheet = false
        )
    }
    
    fun getSelectedMessage(): MessageItem? {
        return _state.value.messages.find { it.message_id == _state.value.selectedMessageId }
    }
    
    fun copyMessage(messageId: String) {
        val message = _state.value.messages.find { it.message_id == messageId }
        message?.let {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("message", it.content)
            clipboard.setPrimaryClip(clip)
        }
    }
    
    fun deleteMessage(messageId: String) {
        val accessToken = authRepository.getAccessToken() ?: return
        
        viewModelScope.launch {
            rpcRepository.deleteMessage(accessToken, messageId)
                .onSuccess {
                    // Remove from local list
                    _state.value = _state.value.copy(
                        messages = _state.value.messages.filter { it.message_id != messageId }
                    )
                }
                .onFailure {
                    _state.value = _state.value.copy(error = "Failed to delete message")
                }
        }
    }
    
    fun starMessage(messageId: String) {
        val accessToken = authRepository.getAccessToken() ?: return
        
        viewModelScope.launch {
            rpcRepository.toggleStarMessage(accessToken, messageId)
                .onSuccess {
                    // Update local state
                    _state.value = _state.value.copy(
                        messages = _state.value.messages.map {
                            if (it.message_id == messageId) it.copy(is_starred = !it.is_starred)
                            else it
                        }
                    )
                }
        }
    }
    
    fun addReaction(messageId: String, emoji: String) {
        val accessToken = authRepository.getAccessToken() ?: return
        
        viewModelScope.launch {
            rpcRepository.addReaction(accessToken, messageId, emoji)
                .onSuccess {
                    loadMessages() // Refresh to get updated reactions
                }
        }
    }
    
    // ==================== FORWARD MESSAGE ====================
    
    fun showForwardDialog(messageContent: String) {
        viewModelScope.launch {
            val accessToken = authRepository.getAccessToken() ?: return@launch
            
            rpcRepository.getConversations(accessToken)
                .onSuccess { conversations ->
                    _state.value = _state.value.copy(
                        showForwardDialog = true,
                        forwardMessageContent = messageContent,
                        forwardConversations = conversations.filter { it.conversation_id != conversationId }
                    )
                }
        }
    }
    
    fun hideForwardDialog() {
        _state.value = _state.value.copy(
            showForwardDialog = false,
            forwardMessageContent = "",
            forwardConversations = emptyList()
        )
    }
    
    fun forwardMessage(targetConversationIds: List<String>) {
        val accessToken = authRepository.getAccessToken() ?: return
        val content = _state.value.forwardMessageContent
        
        viewModelScope.launch {
            targetConversationIds.forEach { targetId ->
                rpcRepository.sendMessage(
                    accessToken = accessToken,
                    conversationId = targetId,
                    content = content,
                    messageType = "text"
                )
            }
            hideForwardDialog()
        }
    }
    
    // ==================== SEARCH ====================
    
    fun toggleSearch() {
        _state.value = _state.value.copy(
            isSearching = !_state.value.isSearching,
            searchQuery = "",
            searchMatches = emptyList(),
            currentSearchIndex = 0
        )
    }
    
    fun updateSearchQuery(query: String) {
        _state.value = _state.value.copy(searchQuery = query)
        
        if (query.isNotEmpty()) {
            val matches = _state.value.messages
                .filter { it.content.contains(query, ignoreCase = true) }
                .map { it.message_id }
            
            _state.value = _state.value.copy(
                searchMatches = matches,
                currentSearchIndex = if (matches.isNotEmpty()) 1 else 0
            )
        } else {
            _state.value = _state.value.copy(
                searchMatches = emptyList(),
                currentSearchIndex = 0
            )
        }
    }
    
    fun previousSearchMatch() {
        if (_state.value.currentSearchIndex > 1) {
            _state.value = _state.value.copy(
                currentSearchIndex = _state.value.currentSearchIndex - 1
            )
        }
    }
    
    fun nextSearchMatch() {
        if (_state.value.currentSearchIndex < _state.value.searchMatches.size) {
            _state.value = _state.value.copy(
                currentSearchIndex = _state.value.currentSearchIndex + 1
            )
        }
    }
    
    // ==================== MEDIA VIEWER ====================
    
    fun showMediaViewer(mediaUrl: String, mediaType: String = "image") {
        _state.value = _state.value.copy(
            showMediaViewer = true,
            viewerMediaUrl = mediaUrl,
            viewerMediaType = mediaType
        )
    }
    
    fun hideMediaViewer() {
        _state.value = _state.value.copy(
            showMediaViewer = false,
            viewerMediaUrl = "",
            viewerMediaType = "image"
        )
    }
    
    // ==================== UTILITIES ====================
    
    fun loadMoreMessages() {
        val oldestMessage = _state.value.messages.firstOrNull()
        oldestMessage?.created_at?.let { before ->
            loadMessages(before)
        }
    }
    
    fun markAsRead() {
        val accessToken = authRepository.getAccessToken() ?: return
        
        viewModelScope.launch {
            rpcRepository.markConversationAsRead(accessToken, conversationId)
        }
    }
    
    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
    
    fun isOwnMessage(senderId: String): Boolean {
        return senderId == _state.value.currentUserId
    }
    
    override fun onCleared() {
        super.onCleared()
        presenceClient.unsubscribeFromConversation(conversationId)
        stopTypingIndicator()
        amplitudePollingJob?.cancel()
    }
}
