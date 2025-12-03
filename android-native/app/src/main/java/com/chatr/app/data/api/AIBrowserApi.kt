package com.chatr.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface AIBrowserApi {
    
    // ==================== AI BROWSER SEARCH ====================
    @POST("ai-browser-search")
    suspend fun search(@Body request: AIBrowserSearchRequest): Response<AIBrowserSearchResponse>
    
    @POST("perplexity-search")
    suspend fun perplexitySearch(@Body request: PerplexitySearchRequest): Response<PerplexitySearchResponse>
    
    @POST("universal-ai-search")
    suspend fun universalAISearch(@Body request: UniversalAISearchRequest): Response<UniversalAISearchResponse>
    
    // ==================== PAGE ACTIONS ====================
    @POST("ai-browser/summarize")
    suspend fun summarizePage(@Body request: SummarizePageRequest): Response<SummarizePageResponse>
    
    @POST("ai-browser/extract")
    suspend fun extractContent(@Body request: ExtractContentRequest): Response<ExtractContentResponse>
    
    @POST("ai-browser/translate")
    suspend fun translatePage(@Body request: TranslatePageRequest): Response<TranslatePageResponse>
    
    // ==================== SEARCH HISTORY ====================
    @GET("ai-browser/history")
    suspend fun getSearchHistory(
        @Query("limit") limit: Int = 50
    ): Response<List<SearchHistoryItem>>
    
    @DELETE("ai-browser/history")
    suspend fun clearSearchHistory(): Response<Unit>
    
    @POST("ai-browser/history/{searchId}/favorite")
    suspend fun favoriteSearch(@Path("searchId") searchId: String): Response<Unit>
}

// Request/Response models
data class AIBrowserSearchRequest(
    val query: String,
    val city: String? = null,
    val location: LocationData? = null,
    val includeAll: Boolean = true,
    val category: String? = null // web, image, video, news, tech, research
)

data class LocationData(
    val lat: Double,
    val lon: Double
)

data class AIBrowserSearchResponse(
    val query: String,
    val answer: String?,
    val results: List<AISearchResult>,
    val relatedQueries: List<String>?,
    val sources: List<SourceInfo>?
)

data class AISearchResult(
    val title: String,
    val url: String,
    val snippet: String,
    val source: String?,
    val category: String?, // web, image, video, news, tech, research, social
    val thumbnail: String?,
    val imageUrl: String?,
    val videoUrl: String?,
    val duration: String?,
    val views: String?,
    val publishedAt: String?
)

data class SourceInfo(
    val name: String,
    val url: String,
    val favicon: String?
)

data class PerplexitySearchRequest(
    val query: String,
    val maxResults: Int = 10,
    val latitude: Double? = null,
    val longitude: Double? = null
)

data class PerplexitySearchResponse(
    val answer: String,
    val sources: List<WebSource>,
    val relatedQuestions: List<String>?
)

data class WebSource(
    val title: String,
    val url: String,
    val snippet: String,
    val favicon: String?
)

data class UniversalAISearchRequest(
    val query: String
)

data class UniversalAISearchResponse(
    val intent: String,
    val category: String,
    val keywords: List<String>,
    val location: String?,
    val suggestions: List<String>
)

data class SummarizePageRequest(
    val url: String,
    val maxLength: Int = 500
)

data class SummarizePageResponse(
    val summary: String,
    val keyPoints: List<String>,
    val readingTime: Int // in minutes
)

data class ExtractContentRequest(
    val url: String,
    val extractType: String // text, links, images, all
)

data class ExtractContentResponse(
    val title: String,
    val content: String,
    val links: List<ExtractedLink>?,
    val images: List<ExtractedImage>?
)

data class ExtractedLink(
    val text: String,
    val url: String
)

data class ExtractedImage(
    val alt: String?,
    val url: String
)

data class TranslatePageRequest(
    val url: String,
    val targetLanguage: String
)

data class TranslatePageResponse(
    val translatedContent: String,
    val sourceLanguage: String,
    val targetLanguage: String
)

data class SearchHistoryItem(
    val id: String,
    val query: String,
    val category: String?,
    val resultCount: Int,
    val isFavorite: Boolean,
    val searchedAt: String
)
