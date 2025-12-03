package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AIBrowserRepository @Inject constructor(
    private val api: AIBrowserApi
) {
    
    // AI Browser Search
    suspend fun search(
        query: String,
        city: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        includeAll: Boolean = true,
        category: String? = null
    ): Result<AIBrowserSearchResponse> {
        val location = if (lat != null && lon != null) LocationData(lat, lon) else null
        return safeApiCall {
            api.search(AIBrowserSearchRequest(query, city, location, includeAll, category))
        }
    }
    
    suspend fun perplexitySearch(
        query: String,
        maxResults: Int = 10,
        lat: Double? = null,
        lon: Double? = null
    ): Result<PerplexitySearchResponse> {
        return safeApiCall {
            api.perplexitySearch(PerplexitySearchRequest(query, maxResults, lat, lon))
        }
    }
    
    suspend fun universalAISearch(query: String): Result<UniversalAISearchResponse> {
        return safeApiCall {
            api.universalAISearch(UniversalAISearchRequest(query))
        }
    }
    
    // Page Actions
    suspend fun summarizePage(url: String, maxLength: Int = 500): Result<SummarizePageResponse> {
        return safeApiCall {
            api.summarizePage(SummarizePageRequest(url, maxLength))
        }
    }
    
    suspend fun extractContent(url: String, extractType: String = "all"): Result<ExtractContentResponse> {
        return safeApiCall {
            api.extractContent(ExtractContentRequest(url, extractType))
        }
    }
    
    suspend fun translatePage(url: String, targetLanguage: String): Result<TranslatePageResponse> {
        return safeApiCall {
            api.translatePage(TranslatePageRequest(url, targetLanguage))
        }
    }
    
    // Search History
    suspend fun getSearchHistory(limit: Int = 50): Result<List<SearchHistoryItem>> {
        return safeApiCall {
            api.getSearchHistory(limit)
        }
    }
    
    suspend fun clearSearchHistory(): Result<Unit> {
        return safeApiCall {
            api.clearSearchHistory()
        }
    }
    
    suspend fun favoriteSearch(searchId: String): Result<Unit> {
        return safeApiCall {
            api.favoriteSearch(searchId)
        }
    }
}
