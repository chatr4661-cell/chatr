package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.*
import com.chatr.app.data.repository.SearchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchUiState(
    val isLoading: Boolean = false,
    val query: String = "",
    val results: List<SearchResult> = emptyList(),
    val aiAnswer: String? = null,
    val totalResults: Int = 0,
    val selectedCategory: String? = null,
    val recentSearches: List<String> = emptyList(),
    val error: String? = null
)

data class VisualSearchState(
    val isLoading: Boolean = false,
    val imageAnalysis: ImageAnalysis? = null,
    val results: List<SearchResult> = emptyList(),
    val aiRecommendations: String? = null,
    val error: String? = null
)

data class JobSearchState(
    val isLoading: Boolean = false,
    val jobs: List<JobListing> = emptyList(),
    val totalResults: Int = 0,
    val error: String? = null
)

data class HealthcareSearchState(
    val isLoading: Boolean = false,
    val providers: List<HealthcareProvider> = emptyList(),
    val totalResults: Int = 0,
    val error: String? = null
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val searchRepository: SearchRepository
) : ViewModel() {
    
    private val _searchState = MutableStateFlow(SearchUiState())
    val searchState: StateFlow<SearchUiState> = _searchState.asStateFlow()
    
    private val _visualSearchState = MutableStateFlow(VisualSearchState())
    val visualSearchState: StateFlow<VisualSearchState> = _visualSearchState.asStateFlow()
    
    private val _jobSearchState = MutableStateFlow(JobSearchState())
    val jobSearchState: StateFlow<JobSearchState> = _jobSearchState.asStateFlow()
    
    private val _healthcareSearchState = MutableStateFlow(HealthcareSearchState())
    val healthcareSearchState: StateFlow<HealthcareSearchState> = _healthcareSearchState.asStateFlow()
    
    private var searchJob: Job? = null
    private var currentLocation: Pair<Double, Double>? = null
    
    fun setLocation(lat: Double, lon: Double) {
        currentLocation = Pair(lat, lon)
    }
    
    fun universalSearch(query: String, category: String? = null) {
        if (query.isBlank()) return
        
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300) // Debounce
            
            _searchState.value = _searchState.value.copy(
                isLoading = true,
                query = query,
                selectedCategory = category,
                error = null
            )
            
            searchRepository.universalSearch(
                query = query,
                lat = currentLocation?.first,
                lon = currentLocation?.second,
                category = category
            ).onSuccess { response ->
                _searchState.value = _searchState.value.copy(
                    isLoading = false,
                    results = response.results,
                    aiAnswer = response.aiAnswer,
                    totalResults = response.totalResults
                )
                
                // Save to recent searches
                saveRecentSearch(query)
            }.onFailure { exception ->
                _searchState.value = _searchState.value.copy(
                    isLoading = false,
                    error = exception.message ?: "Search failed"
                )
            }
        }
    }
    
    fun geoSearch(query: String, radius: Int = 5000, category: String? = null) {
        val location = currentLocation ?: return
        
        viewModelScope.launch {
            _searchState.value = _searchState.value.copy(
                isLoading = true,
                query = query,
                error = null
            )
            
            searchRepository.geoSearch(
                query = query,
                lat = location.first,
                lon = location.second,
                radius = radius,
                category = category
            ).onSuccess { response ->
                _searchState.value = _searchState.value.copy(
                    isLoading = false,
                    results = response.results,
                    aiAnswer = response.aiAnswer,
                    totalResults = response.totalResults
                )
            }.onFailure { exception ->
                _searchState.value = _searchState.value.copy(
                    isLoading = false,
                    error = exception.message
                )
            }
        }
    }
    
    fun visualSearch(imageUrl: String? = null, imageBase64: String? = null) {
        viewModelScope.launch {
            _visualSearchState.value = _visualSearchState.value.copy(
                isLoading = true,
                error = null
            )
            
            searchRepository.visualSearch(imageUrl, imageBase64)
                .onSuccess { response ->
                    _visualSearchState.value = _visualSearchState.value.copy(
                        isLoading = false,
                        imageAnalysis = response.imageAnalysis,
                        results = response.results,
                        aiRecommendations = response.aiRecommendations
                    )
                }
                .onFailure { exception ->
                    _visualSearchState.value = _visualSearchState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun aiBrowserSearch(query: String, context: String? = null) {
        viewModelScope.launch {
            _searchState.value = _searchState.value.copy(
                isLoading = true,
                query = query,
                error = null
            )
            
            searchRepository.aiBrowserSearch(query, context)
                .onSuccess { response ->
                    // Convert AI search response to regular search results
                    val results = response.sources.map { source ->
                        SearchResult(
                            id = source.url,
                            title = source.title,
                            description = source.snippet,
                            url = source.url,
                            imageUrl = null,
                            source = "AI Browser"
                        )
                    }
                    
                    _searchState.value = _searchState.value.copy(
                        isLoading = false,
                        results = results,
                        aiAnswer = response.answer,
                        totalResults = results.size
                    )
                }
                .onFailure { exception ->
                    _searchState.value = _searchState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun perplexitySearch(query: String) {
        viewModelScope.launch {
            _searchState.value = _searchState.value.copy(
                isLoading = true,
                query = query,
                error = null
            )
            
            searchRepository.perplexitySearch(query)
                .onSuccess { response ->
                    val results = response.sources.map { source ->
                        SearchResult(
                            id = source.url,
                            title = source.title,
                            description = source.snippet,
                            url = source.url,
                            imageUrl = null,
                            source = "Perplexity"
                        )
                    }
                    
                    _searchState.value = _searchState.value.copy(
                        isLoading = false,
                        results = results,
                        aiAnswer = response.answer,
                        totalResults = results.size
                    )
                }
                .onFailure { exception ->
                    _searchState.value = _searchState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun searchJobs(query: String, location: String? = null) {
        viewModelScope.launch {
            _jobSearchState.value = _jobSearchState.value.copy(
                isLoading = true,
                error = null
            )
            
            searchRepository.fetchJobs(
                query = query,
                lat = currentLocation?.first,
                lon = currentLocation?.second,
                location = location
            ).onSuccess { response ->
                _jobSearchState.value = _jobSearchState.value.copy(
                    isLoading = false,
                    jobs = response.jobs,
                    totalResults = response.totalResults
                )
            }.onFailure { exception ->
                _jobSearchState.value = _jobSearchState.value.copy(
                    isLoading = false,
                    error = exception.message
                )
            }
        }
    }
    
    fun searchHealthcare(query: String) {
        val location = currentLocation ?: return
        
        viewModelScope.launch {
            _healthcareSearchState.value = _healthcareSearchState.value.copy(
                isLoading = true,
                error = null
            )
            
            searchRepository.fetchHealthcare(
                query = query,
                lat = location.first,
                lon = location.second
            ).onSuccess { response ->
                _healthcareSearchState.value = _healthcareSearchState.value.copy(
                    isLoading = false,
                    providers = response.providers,
                    totalResults = response.totalResults
                )
            }.onFailure { exception ->
                _healthcareSearchState.value = _healthcareSearchState.value.copy(
                    isLoading = false,
                    error = exception.message
                )
            }
        }
    }
    
    fun logClick(url: String, position: Int) {
        viewModelScope.launch {
            searchRepository.logClick(
                query = _searchState.value.query,
                url = url,
                position = position
            )
        }
    }
    
    private fun saveRecentSearch(query: String) {
        val recent = _searchState.value.recentSearches.toMutableList()
        recent.remove(query)
        recent.add(0, query)
        if (recent.size > 10) recent.removeLast()
        _searchState.value = _searchState.value.copy(recentSearches = recent)
    }
    
    fun setCategory(category: String?) {
        _searchState.value = _searchState.value.copy(selectedCategory = category)
        val query = _searchState.value.query
        if (query.isNotBlank()) {
            universalSearch(query, category)
        }
    }
    
    fun clearSearch() {
        searchJob?.cancel()
        _searchState.value = SearchUiState(recentSearches = _searchState.value.recentSearches)
    }
    
    fun clearVisualSearch() {
        _visualSearchState.value = VisualSearchState()
    }
    
    fun clearError() {
        _searchState.value = _searchState.value.copy(error = null)
        _visualSearchState.value = _visualSearchState.value.copy(error = null)
        _jobSearchState.value = _jobSearchState.value.copy(error = null)
        _healthcareSearchState.value = _healthcareSearchState.value.copy(error = null)
    }
}
