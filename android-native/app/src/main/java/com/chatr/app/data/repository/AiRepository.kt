package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AiRepository @Inject constructor(
    private val api: AIApi
) {
    
    suspend fun aiAssistant(message: String, context: String? = null): Result<AIAssistantResponse> {
        return safeApiCall {
            api.aiAssistant(AIAssistantRequest(message, context))
        }
    }
    
    suspend fun aiAgentChat(agentId: String, message: String): Result<AIAgentChatResponse> {
        return safeApiCall {
            api.aiAgentChat(AIAgentChatRequest(agentId, message))
        }
    }
    
    suspend fun getAIAnswer(query: String, context: String? = null): Result<AIAnswerResponse> {
        return safeApiCall {
            api.getAIAnswer(AIAnswerRequest(query, context))
        }
    }
    
    suspend fun aiHealthAssistant(symptoms: String, history: String? = null): Result<AIHealthResponse> {
        return safeApiCall {
            api.aiHealthAssistant(AIHealthRequest(symptoms, history))
        }
    }
    
    suspend fun getSmartReplies(conversationContext: String): Result<SmartReplyResponse> {
        return safeApiCall {
            api.getSmartReplies(SmartReplyRequest(conversationContext))
        }
    }
    
    suspend fun smartCompose(partialText: String, context: String? = null): Result<SmartComposeResponse> {
        return safeApiCall {
            api.smartCompose(SmartComposeRequest(partialText, context))
        }
    }
    
    suspend fun checkSymptoms(symptoms: List<String>): Result<SymptomCheckerResponse> {
        return safeApiCall {
            api.checkSymptoms(SymptomCheckerRequest(symptoms))
        }
    }
    
    suspend fun summarizeChat(conversationId: String): Result<SummarizeChatResponse> {
        return safeApiCall {
            api.summarizeChat(SummarizeChatRequest(conversationId))
        }
    }
    
    suspend fun translateMessage(text: String, targetLang: String): Result<TranslateResponse> {
        return safeApiCall {
            api.translateMessage(TranslateRequest(text, targetLang))
        }
    }
    
    suspend fun transcribeVoice(audioUrl: String): Result<TranscribeResponse> {
        return safeApiCall {
            api.transcribeVoice(TranscribeRequest(audioUrl))
        }
    }
    
    suspend fun generateImage(prompt: String): Result<ImageGeneratorResponse> {
        return safeApiCall {
            api.generateImage(ImageGeneratorRequest(prompt))
        }
    }
}
