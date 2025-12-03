package com.chatr.app.data.api

import com.chatr.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface SearchApi {
    
    @POST("universal-search")
    suspend fun universalSearch(@Body request: UniversalSearchRequest): Response<SearchResponse>
    
    @POST("ai-browser-search")
    suspend fun aiBrowserSearch(@Body request: AISearchRequest): Response<AISearchResponse>
    
    @POST("visual-search")
    suspend fun visualSearch(@Body request: VisualSearchRequest): Response<VisualSearchResponse>
    
    @POST("geo-search")
    suspend fun geoSearch(@Body request: GeoSearchRequest): Response<SearchResponse>
    
    @POST("perplexity-search")
    suspend fun perplexitySearch(@Body request: PerplexitySearchRequest): Response<PerplexityResponse>
    
    @POST("click-log")
    suspend fun logClick(@Body request: ClickLogRequest): Response<Unit>
    
    @POST("fetch-jobs")
    suspend fun fetchJobs(@Body request: JobSearchRequest): Response<JobSearchResponse>
    
    @POST("fetch-healthcare")
    suspend fun fetchHealthcare(@Body request: HealthcareSearchRequest): Response<HealthcareResponse>
    
    // DuckDuckGo fallback
    @GET("https://api.duckduckgo.com/")
    suspend fun duckDuckGoSearch(
        @Query("q") query: String,
        @Query("format") format: String = "json",
        @Query("no_redirect") noRedirect: Int = 1,
        @Query("no_html") noHtml: Int = 1
    ): Response<DuckDuckGoResponse>
}

// Request models
data class UniversalSearchRequest(
    val query: String,
    val lat: Double? = null,
    val lon: Double? = null,
    val category: String? = null,
    val limit: Int = 20
)

data class AISearchRequest(
    val query: String,
    val context: String? = null
)

data class VisualSearchRequest(
    val imageUrl: String? = null,
    val imageBase64: String? = null,
    val userId: String? = null
)

data class GeoSearchRequest(
    val query: String,
    val lat: Double,
    val lon: Double,
    val radius: Int = 5000,
    val category: String? = null
)

data class PerplexitySearchRequest(val query: String)

data class ClickLogRequest(
    val query: String,
    val url: String,
    val position: Int
)

data class JobSearchRequest(
    val query: String,
    val lat: Double? = null,
    val lon: Double? = null,
    val location: String? = null
)

data class HealthcareSearchRequest(
    val query: String,
    val lat: Double,
    val lon: Double
)

// Response models
data class SearchResponse(
    val results: List<SearchResult>,
    val aiAnswer: String?,
    val totalResults: Int
)

data class SearchResult(
    val id: String,
    val title: String,
    val description: String?,
    val url: String?,
    val imageUrl: String?,
    val rating: Double? = null,
    val distance: String? = null,
    val price: String? = null,
    val category: String? = null,
    val source: String? = null
)

data class AISearchResponse(
    val answer: String,
    val sources: List<SearchSource>,
    val relatedQueries: List<String>
)

data class SearchSource(
    val title: String,
    val url: String,
    val snippet: String
)

data class VisualSearchResponse(
    val imageAnalysis: ImageAnalysis,
    val results: List<SearchResult>,
    val aiRecommendations: String?
)

data class ImageAnalysis(
    val objects: List<String>,
    val searchQuery: String
)

data class PerplexityResponse(
    val answer: String,
    val citations: List<String>,
    val sources: List<SearchSource>
)

data class JobSearchResponse(
    val jobs: List<Job>,
    val totalResults: Int
)

data class Job(
    val id: String,
    val title: String,
    val company: String,
    val location: String,
    val salary: String?,
    val description: String?,
    val url: String?,
    val postedAt: Long?
)

data class HealthcareResponse(
    val providers: List<HealthcareProvider>,
    val totalResults: Int
)

data class HealthcareProvider(
    val id: String,
    val name: String,
    val type: String,
    val address: String,
    val phone: String?,
    val rating: Double?,
    val distance: String?,
    val isOpen: Boolean?
)

data class DuckDuckGoResponse(
    val Abstract: String?,
    val AbstractText: String?,
    val AbstractSource: String?,
    val AbstractURL: String?,
    val Image: String?,
    val Heading: String?,
    val Answer: String?,
    val RelatedTopics: List<DuckDuckGoTopic>?
)

data class DuckDuckGoTopic(
    val Result: String?,
    val FirstURL: String?,
    val Icon: DuckDuckGoIcon?,
    val Text: String?
)

data class DuckDuckGoIcon(
    val URL: String?,
    val Height: String?,
    val Width: String?
)
