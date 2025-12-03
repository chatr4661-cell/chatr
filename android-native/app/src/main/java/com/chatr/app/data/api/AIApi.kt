package com.chatr.app.data.api

import com.chatr.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface AIApi {
    
    @POST("ai-assistant")
    suspend fun aiAssistant(@Body request: AIAssistantRequest): Response<AIAssistantResponse>
    
    @POST("ai-agent-chat")
    suspend fun aiAgentChat(@Body request: AIAgentChatRequest): Response<AIAgentChatResponse>
    
    @POST("ai-answer")
    suspend fun getAIAnswer(@Body request: AIAnswerRequest): Response<AIAnswerResponse>
    
    @POST("ai-health-assistant")
    suspend fun aiHealthAssistant(@Body request: AIHealthRequest): Response<AIHealthResponse>
    
    @POST("ai-smart-reply")
    suspend fun getSmartReplies(@Body request: SmartReplyRequest): Response<SmartReplyResponse>
    
    @POST("smart-compose")
    suspend fun smartCompose(@Body request: SmartComposeRequest): Response<SmartComposeResponse>
    
    @POST("symptom-checker")
    suspend fun checkSymptoms(@Body request: SymptomCheckerRequest): Response<SymptomCheckerResponse>
    
    @POST("summarize-chat")
    suspend fun summarizeChat(@Body request: SummarizeChatRequest): Response<SummarizeChatResponse>
    
    @POST("translate-message")
    suspend fun translateMessage(@Body request: TranslateRequest): Response<TranslateResponse>
    
    @POST("transcribe-voice")
    suspend fun transcribeVoice(@Body request: TranscribeRequest): Response<TranscribeResponse>
    
    @POST("ai-image-generator")
    suspend fun generateImage(@Body request: ImageGeneratorRequest): Response<ImageGeneratorResponse>
}

// Request models
data class AIAssistantRequest(
    val message: String,
    val context: String? = null
)

data class AIAgentChatRequest(
    val agentId: String,
    val message: String
)

data class AIAnswerRequest(
    val query: String,
    val context: String? = null
)

data class AIHealthRequest(
    val symptoms: String,
    val history: String? = null
)

data class SmartReplyRequest(
    val conversationContext: String
)

data class SmartComposeRequest(
    val partialText: String,
    val context: String? = null
)

data class SymptomCheckerRequest(
    val symptoms: List<String>
)

data class SummarizeChatRequest(
    val conversationId: String
)

data class TranslateRequest(
    val text: String,
    val targetLang: String
)

data class TranscribeRequest(
    val audioUrl: String
)

data class ImageGeneratorRequest(
    val prompt: String
)

// Response models
data class AIAssistantResponse(
    val response: String,
    val suggestions: List<String>?
)

data class AIAgentChatResponse(
    val response: String,
    val agentName: String
)

data class AIAnswerResponse(
    val answer: String,
    val sources: List<SearchSource>?
)

data class AIHealthResponse(
    val analysis: String,
    val recommendations: List<String>,
    val urgencyLevel: String
)

data class SmartReplyResponse(
    val replies: List<String>
)

data class SmartComposeResponse(
    val completions: List<String>
)

data class SymptomCheckerResponse(
    val possibleConditions: List<PossibleCondition>,
    val recommendations: String,
    val urgencyLevel: String
)

data class PossibleCondition(
    val name: String,
    val probability: Double,
    val description: String
)

data class SummarizeChatResponse(
    val summary: String,
    val keyPoints: List<String>
)

data class TranslateResponse(
    val translatedText: String,
    val detectedLanguage: String?
)

data class TranscribeResponse(
    val text: String,
    val duration: Float?
)

data class ImageGeneratorResponse(
    val imageUrl: String
)
