package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.*
import com.chatr.app.data.repository.AiRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AIAssistantState(
    val isLoading: Boolean = false,
    val messages: List<AIMessage> = emptyList(),
    val suggestions: List<String> = emptyList(),
    val error: String? = null
)

data class AIMessage(
    val id: String,
    val content: String,
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis()
)

data class HealthAIState(
    val isLoading: Boolean = false,
    val analysis: String? = null,
    val recommendations: List<String> = emptyList(),
    val urgencyLevel: String? = null,
    val error: String? = null
)

data class SymptomCheckerState(
    val isLoading: Boolean = false,
    val possibleConditions: List<PossibleCondition> = emptyList(),
    val recommendations: String? = null,
    val urgencyLevel: String? = null,
    val error: String? = null
)

data class SmartReplyState(
    val isLoading: Boolean = false,
    val replies: List<String> = emptyList(),
    val error: String? = null
)

data class TranslationState(
    val isLoading: Boolean = false,
    val translatedText: String? = null,
    val detectedLanguage: String? = null,
    val error: String? = null
)

@HiltViewModel
class AIViewModel @Inject constructor(
    private val aiRepository: AiRepository
) : ViewModel() {
    
    private val _assistantState = MutableStateFlow(AIAssistantState())
    val assistantState: StateFlow<AIAssistantState> = _assistantState.asStateFlow()
    
    private val _healthAIState = MutableStateFlow(HealthAIState())
    val healthAIState: StateFlow<HealthAIState> = _healthAIState.asStateFlow()
    
    private val _symptomCheckerState = MutableStateFlow(SymptomCheckerState())
    val symptomCheckerState: StateFlow<SymptomCheckerState> = _symptomCheckerState.asStateFlow()
    
    private val _smartReplyState = MutableStateFlow(SmartReplyState())
    val smartReplyState: StateFlow<SmartReplyState> = _smartReplyState.asStateFlow()
    
    private val _translationState = MutableStateFlow(TranslationState())
    val translationState: StateFlow<TranslationState> = _translationState.asStateFlow()
    
    // AI Assistant Chat
    fun sendMessage(message: String, context: String? = null) {
        viewModelScope.launch {
            // Add user message to chat
            val userMessage = AIMessage(
                id = System.currentTimeMillis().toString(),
                content = message,
                isUser = true
            )
            _assistantState.value = _assistantState.value.copy(
                messages = _assistantState.value.messages + userMessage,
                isLoading = true,
                error = null
            )
            
            aiRepository.aiAssistant(message, context)
                .onSuccess { response ->
                    val aiMessage = AIMessage(
                        id = System.currentTimeMillis().toString(),
                        content = response.response,
                        isUser = false
                    )
                    _assistantState.value = _assistantState.value.copy(
                        messages = _assistantState.value.messages + aiMessage,
                        suggestions = response.suggestions ?: emptyList(),
                        isLoading = false
                    )
                }
                .onFailure { exception ->
                    _assistantState.value = _assistantState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "Failed to get response"
                    )
                }
        }
    }
    
    // AI Agent Chat
    fun chatWithAgent(agentId: String, message: String) {
        viewModelScope.launch {
            val userMessage = AIMessage(
                id = System.currentTimeMillis().toString(),
                content = message,
                isUser = true
            )
            _assistantState.value = _assistantState.value.copy(
                messages = _assistantState.value.messages + userMessage,
                isLoading = true,
                error = null
            )
            
            aiRepository.aiAgentChat(agentId, message)
                .onSuccess { response ->
                    val aiMessage = AIMessage(
                        id = System.currentTimeMillis().toString(),
                        content = response.response,
                        isUser = false
                    )
                    _assistantState.value = _assistantState.value.copy(
                        messages = _assistantState.value.messages + aiMessage,
                        isLoading = false
                    )
                }
                .onFailure { exception ->
                    _assistantState.value = _assistantState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    // Health AI Assistant
    fun healthAssistant(symptoms: String, history: String? = null) {
        viewModelScope.launch {
            _healthAIState.value = _healthAIState.value.copy(
                isLoading = true,
                error = null
            )
            
            aiRepository.aiHealthAssistant(symptoms, history)
                .onSuccess { response ->
                    _healthAIState.value = _healthAIState.value.copy(
                        isLoading = false,
                        analysis = response.analysis,
                        recommendations = response.recommendations,
                        urgencyLevel = response.urgencyLevel
                    )
                }
                .onFailure { exception ->
                    _healthAIState.value = _healthAIState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    // Symptom Checker
    fun checkSymptoms(symptoms: List<String>) {
        viewModelScope.launch {
            _symptomCheckerState.value = _symptomCheckerState.value.copy(
                isLoading = true,
                error = null
            )
            
            aiRepository.checkSymptoms(symptoms)
                .onSuccess { response ->
                    _symptomCheckerState.value = _symptomCheckerState.value.copy(
                        isLoading = false,
                        possibleConditions = response.possibleConditions,
                        recommendations = response.recommendations,
                        urgencyLevel = response.urgencyLevel
                    )
                }
                .onFailure { exception ->
                    _symptomCheckerState.value = _symptomCheckerState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    // Smart Replies
    fun getSmartReplies(conversationContext: String) {
        viewModelScope.launch {
            _smartReplyState.value = _smartReplyState.value.copy(
                isLoading = true,
                error = null
            )
            
            aiRepository.getSmartReplies(conversationContext)
                .onSuccess { response ->
                    _smartReplyState.value = _smartReplyState.value.copy(
                        isLoading = false,
                        replies = response.replies
                    )
                }
                .onFailure { exception ->
                    _smartReplyState.value = _smartReplyState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    // Smart Compose
    suspend fun smartCompose(partialText: String, context: String? = null): List<String> {
        return aiRepository.smartCompose(partialText, context)
            .getOrNull()?.completions ?: emptyList()
    }
    
    // Summarize Chat
    suspend fun summarizeChat(conversationId: String): String? {
        return aiRepository.summarizeChat(conversationId)
            .getOrNull()?.summary
    }
    
    // Translation
    fun translateMessage(text: String, targetLang: String) {
        viewModelScope.launch {
            _translationState.value = _translationState.value.copy(
                isLoading = true,
                error = null
            )
            
            aiRepository.translateMessage(text, targetLang)
                .onSuccess { response ->
                    _translationState.value = _translationState.value.copy(
                        isLoading = false,
                        translatedText = response.translatedText,
                        detectedLanguage = response.detectedLanguage
                    )
                }
                .onFailure { exception ->
                    _translationState.value = _translationState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    // Voice Transcription
    suspend fun transcribeVoice(audioUrl: String): String? {
        return aiRepository.transcribeVoice(audioUrl)
            .getOrNull()?.text
    }
    
    // Image Generation
    suspend fun generateImage(prompt: String): String? {
        return aiRepository.generateImage(prompt)
            .getOrNull()?.imageUrl
    }
    
    fun clearAssistantChat() {
        _assistantState.value = AIAssistantState()
    }
    
    fun clearHealthAI() {
        _healthAIState.value = HealthAIState()
    }
    
    fun clearSymptomChecker() {
        _symptomCheckerState.value = SymptomCheckerState()
    }
    
    fun clearSmartReplies() {
        _smartReplyState.value = SmartReplyState()
    }
    
    fun clearTranslation() {
        _translationState.value = TranslationState()
    }
    
    fun clearError() {
        _assistantState.value = _assistantState.value.copy(error = null)
        _healthAIState.value = _healthAIState.value.copy(error = null)
        _symptomCheckerState.value = _symptomCheckerState.value.copy(error = null)
        _smartReplyState.value = _smartReplyState.value.copy(error = null)
        _translationState.value = _translationState.value.copy(error = null)
    }
}
