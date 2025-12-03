package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.api.*
import com.chatr.app.data.repository.AIBrowserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AIBrowserViewModel @Inject constructor(
    private val repository: AIBrowserRepository
) : ViewModel() {
    
    private val _searchResults = MutableStateFlow<AIBrowserSearchResponse?>(null)
    val searchResults: StateFlow<AIBrowserSearchResponse?> = _searchResults.asStateFlow()
    
    private val _aiAnswer = MutableStateFlow<String?>(null)
    val aiAnswer: StateFlow<String?> = _aiAnswer.asStateFlow()
    
    private val _results = MutableStateFlow<List<AISearchResult>>(emptyList())
    val results: StateFlow<List<AISearchResult>> = _results.asStateFlow()
    
    private val _sources = MutableStateFlow<List<SourceInfo>>(emptyList())
    val sources: StateFlow<List<SourceInfo>> = _sources.asStateFlow()
    
    private val _searchHistory = MutableStateFlow<List<SearchHistoryItem>>(emptyList())
    val searchHistory: StateFlow<List<SearchHistoryItem>> = _searchHistory.asStateFlow()
    
    private val _isSearching = MutableStateFlow(false)
    val isSearching: StateFlow<Boolean> = _isSearching.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    init {
        loadSearchHistory()
    }
    
    fun search(
        query: String,
        city: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        category: String? = null
    ) {
        viewModelScope.launch {
            _isSearching.value = true
            _aiAnswer.value = null
            _results.value = emptyList()
            _sources.value = emptyList()
            
            repository.search(query, city, lat, lon, includeAll = true, category)
                .onSuccess { response ->
                    _searchResults.value = response
                    _aiAnswer.value = response.answer
                    _results.value = response.results
                    _sources.value = response.sources ?: emptyList()
                    loadSearchHistory()
                }
                .onFailure { _error.value = it.message }
            
            _isSearching.value = false
        }
    }
    
    fun perplexitySearch(
        query: String,
        lat: Double? = null,
        lon: Double? = null
    ) {
        viewModelScope.launch {
            _isSearching.value = true
            
            repository.perplexitySearch(query, lat = lat, lon = lon)
                .onSuccess { response ->
                    _aiAnswer.value = response.answer
                    _sources.value = response.sources.map { 
                        SourceInfo(it.title, it.url, it.favicon) 
                    }
                }
                .onFailure { _error.value = it.message }
            
            _isSearching.value = false
        }
    }
    
    fun summarizePage(url: String, onResult: (SummarizePageResponse) -> Unit) {
        viewModelScope.launch {
            _isSearching.value = true
            repository.summarizePage(url)
                .onSuccess { onResult(it) }
                .onFailure { _error.value = it.message }
            _isSearching.value = false
        }
    }
    
    fun extractContent(url: String, extractType: String = "all", onResult: (ExtractContentResponse) -> Unit) {
        viewModelScope.launch {
            _isSearching.value = true
            repository.extractContent(url, extractType)
                .onSuccess { onResult(it) }
                .onFailure { _error.value = it.message }
            _isSearching.value = false
        }
    }
    
    fun translatePage(url: String, targetLanguage: String, onResult: (TranslatePageResponse) -> Unit) {
        viewModelScope.launch {
            _isSearching.value = true
            repository.translatePage(url, targetLanguage)
                .onSuccess { onResult(it) }
                .onFailure { _error.value = it.message }
            _isSearching.value = false
        }
    }
    
    fun loadSearchHistory() {
        viewModelScope.launch {
            repository.getSearchHistory()
                .onSuccess { _searchHistory.value = it }
        }
    }
    
    fun clearSearchHistory() {
        viewModelScope.launch {
            repository.clearSearchHistory()
                .onSuccess { 
                    _searchHistory.value = emptyList()
                }
        }
    }
    
    fun favoriteSearch(searchId: String) {
        viewModelScope.launch {
            repository.favoriteSearch(searchId)
                .onSuccess { loadSearchHistory() }
        }
    }
    
    fun clearResults() {
        _searchResults.value = null
        _aiAnswer.value = null
        _results.value = emptyList()
        _sources.value = emptyList()
    }
    
    fun clearError() {
        _error.value = null
    }
}
