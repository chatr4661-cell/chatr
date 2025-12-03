package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SearchRepository @Inject constructor(
    private val api: SearchApi
) {
    
    suspend fun universalSearch(
        query: String,
        lat: Double? = null,
        lon: Double? = null,
        category: String? = null
    ): Result<SearchResponse> {
        val result = safeApiCall {
            api.universalSearch(UniversalSearchRequest(query, lat, lon, category))
        }
        
        // Fallback to DuckDuckGo if primary search fails or returns empty
        return if (result.isFailure || (result.isSuccess && result.getOrNull()?.results.isNullOrEmpty())) {
            fallbackToDuckDuckGo(query)
        } else {
            result
        }
    }
    
    suspend fun aiBrowserSearch(query: String, context: String? = null): Result<AISearchResponse> {
        return safeApiCall {
            api.aiBrowserSearch(AISearchRequest(query, context))
        }
    }
    
    suspend fun visualSearch(imageUrl: String?, imageBase64: String?): Result<VisualSearchResponse> {
        return safeApiCall {
            api.visualSearch(VisualSearchRequest(imageUrl, imageBase64))
        }
    }
    
    suspend fun geoSearch(
        query: String,
        lat: Double,
        lon: Double,
        radius: Int = 5000,
        category: String? = null
    ): Result<SearchResponse> {
        val result = safeApiCall {
            api.geoSearch(GeoSearchRequest(query, lat, lon, radius, category))
        }
        
        return if (result.isFailure || (result.isSuccess && result.getOrNull()?.results.isNullOrEmpty())) {
            fallbackToDuckDuckGo("$query near me")
        } else {
            result
        }
    }
    
    suspend fun perplexitySearch(query: String): Result<PerplexityResponse> {
        return safeApiCall {
            api.perplexitySearch(PerplexitySearchRequest(query))
        }
    }
    
    suspend fun fetchJobs(query: String, lat: Double?, lon: Double?, location: String? = null): Result<JobSearchResponse> {
        return safeApiCall {
            api.fetchJobs(JobSearchRequest(query, lat, lon, location))
        }
    }
    
    suspend fun fetchHealthcare(query: String, lat: Double, lon: Double): Result<HealthcareResponse> {
        return safeApiCall {
            api.fetchHealthcare(HealthcareSearchRequest(query, lat, lon))
        }
    }
    
    suspend fun logClick(query: String, url: String, position: Int): Result<Unit> {
        return safeApiCall {
            api.logClick(ClickLogRequest(query, url, position))
        }
    }
    
    // DuckDuckGo fallback implementation
    private suspend fun fallbackToDuckDuckGo(query: String): Result<SearchResponse> {
        return try {
            val response = api.duckDuckGoSearch(query)
            if (response.isSuccessful && response.body() != null) {
                val ddgResponse = response.body()!!
                val results = mutableListOf<SearchResult>()
                
                // Parse abstract as main result
                if (!ddgResponse.AbstractText.isNullOrEmpty()) {
                    results.add(SearchResult(
                        id = "ddg_abstract",
                        title = ddgResponse.Heading ?: query,
                        description = ddgResponse.AbstractText,
                        url = ddgResponse.AbstractURL,
                        imageUrl = ddgResponse.Image?.let { "https://duckduckgo.com$it" },
                        source = "DuckDuckGo"
                    ))
                }
                
                // Parse related topics
                ddgResponse.RelatedTopics?.forEach { topic ->
                    if (!topic.Text.isNullOrEmpty()) {
                        results.add(SearchResult(
                            id = "ddg_${results.size}",
                            title = topic.Text?.take(100) ?: "",
                            description = topic.Text,
                            url = topic.FirstURL,
                            imageUrl = topic.Icon?.URL?.let { 
                                if (it.startsWith("http")) it else "https://duckduckgo.com$it"
                            },
                            source = "DuckDuckGo"
                        ))
                    }
                }
                
                Result.success(SearchResponse(
                    results = results,
                    aiAnswer = ddgResponse.Answer ?: ddgResponse.AbstractText,
                    totalResults = results.size
                ))
            } else {
                Result.failure(Exception("DuckDuckGo search failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
