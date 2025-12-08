package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import com.chatr.app.data.models.HealthcareProvider
import com.chatr.app.data.models.ImageAnalysis
import com.chatr.app.data.models.JobListing
import com.chatr.app.data.models.SearchResult
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
    ): Result<UniversalSearchResult> {
        val result = safeApiCall {
            api.universalSearch(UniversalSearchRequest(query, lat, lon, category))
        }
        
        // Fallback to DuckDuckGo if primary search fails or returns empty
        return if (result.isFailure || (result.isSuccess && result.getOrNull()?.results.isNullOrEmpty())) {
            fallbackToDuckDuckGo(query)
        } else {
            result.map { response ->
                UniversalSearchResult(
                    results = response.results.map { it.toModel() },
                    aiAnswer = response.aiAnswer,
                    totalResults = response.totalResults
                )
            }
        }
    }
    
    suspend fun aiBrowserSearch(query: String, context: String? = null): Result<AIBrowserSearchResult> {
        return safeApiCall {
            api.aiBrowserSearch(AISearchRequest(query, context))
        }.map { response ->
            AIBrowserSearchResult(
                answer = response.answer,
                sources = response.sources.map { SearchSource(it.title, it.url, it.snippet) },
                relatedQueries = response.relatedQueries
            )
        }
    }
    
    suspend fun visualSearch(imageUrl: String?, imageBase64: String?): Result<VisualSearchResult> {
        return safeApiCall {
            api.visualSearch(VisualSearchRequest(imageUrl, imageBase64))
        }.map { response ->
            VisualSearchResult(
                imageAnalysis = ImageAnalysis(
                    objects = response.imageAnalysis.objects,
                    searchQuery = response.imageAnalysis.searchQuery
                ),
                results = response.results.map { it.toModel() },
                aiRecommendations = response.aiRecommendations
            )
        }
    }
    
    suspend fun geoSearch(
        query: String,
        lat: Double,
        lon: Double,
        radius: Int = 5000,
        category: String? = null
    ): Result<UniversalSearchResult> {
        val result = safeApiCall {
            api.geoSearch(GeoSearchRequest(query, lat, lon, radius, category))
        }
        
        return if (result.isFailure || (result.isSuccess && result.getOrNull()?.results.isNullOrEmpty())) {
            fallbackToDuckDuckGo("$query near me")
        } else {
            result.map { response ->
                UniversalSearchResult(
                    results = response.results.map { it.toModel() },
                    aiAnswer = response.aiAnswer,
                    totalResults = response.totalResults
                )
            }
        }
    }
    
    suspend fun perplexitySearch(query: String): Result<PerplexitySearchResult> {
        return safeApiCall {
            api.perplexitySearch(PerplexitySearchRequest(query))
        }.map { response ->
            PerplexitySearchResult(
                answer = response.answer,
                citations = response.citations,
                sources = response.sources.map { SearchSource(it.title, it.url, it.snippet) }
            )
        }
    }
    
    suspend fun fetchJobs(query: String, lat: Double?, lon: Double?, location: String? = null): Result<JobsSearchResult> {
        return safeApiCall {
            api.fetchJobs(JobSearchRequest(query, lat, lon, location))
        }.map { response ->
            JobsSearchResult(
                jobs = response.jobs.map { job ->
                    JobListing(
                        id = job.id,
                        title = job.title,
                        company = job.company,
                        location = job.location,
                        salary = job.salary,
                        description = job.description,
                        url = job.url,
                        postedAt = job.postedAt
                    )
                },
                totalResults = response.totalResults
            )
        }
    }
    
    suspend fun fetchHealthcare(query: String, lat: Double, lon: Double): Result<HealthcareSearchResult> {
        return safeApiCall {
            api.fetchHealthcare(HealthcareSearchRequest(query, lat, lon))
        }.map { response ->
            HealthcareSearchResult(
                providers = response.providers.map { provider ->
                    HealthcareProvider(
                        id = provider.id,
                        name = provider.name,
                        type = provider.type,
                        address = provider.address,
                        phone = provider.phone,
                        rating = provider.rating,
                        distance = provider.distance,
                        isOpen = provider.isOpen
                    )
                },
                totalResults = response.totalResults
            )
        }
    }
    
    suspend fun logClick(query: String, url: String, position: Int): Result<Unit> {
        return safeApiCall {
            api.logClick(ClickLogRequest(query, url, position))
        }
    }
    
    // DuckDuckGo fallback implementation
    private suspend fun fallbackToDuckDuckGo(query: String): Result<UniversalSearchResult> {
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
                
                Result.success(UniversalSearchResult(
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

// Extension to convert API SearchResult to domain model
private fun com.chatr.app.data.api.SearchResult.toModel() = SearchResult(
    id = id,
    title = title,
    description = description,
    url = url,
    imageUrl = imageUrl,
    rating = rating,
    distance = distance,
    price = price,
    category = category,
    source = source
)

// Result classes for domain layer
data class UniversalSearchResult(
    val results: List<SearchResult>,
    val aiAnswer: String?,
    val totalResults: Int
)

data class AIBrowserSearchResult(
    val answer: String,
    val sources: List<SearchSource>,
    val relatedQueries: List<String>
)

data class SearchSource(
    val title: String,
    val url: String,
    val snippet: String
)

data class VisualSearchResult(
    val imageAnalysis: ImageAnalysis,
    val results: List<SearchResult>,
    val aiRecommendations: String?
)

data class PerplexitySearchResult(
    val answer: String,
    val citations: List<String>,
    val sources: List<SearchSource>
)

data class JobsSearchResult(
    val jobs: List<JobListing>,
    val totalResults: Int
)

data class HealthcareSearchResult(
    val providers: List<HealthcareProvider>,
    val totalResults: Int
)
