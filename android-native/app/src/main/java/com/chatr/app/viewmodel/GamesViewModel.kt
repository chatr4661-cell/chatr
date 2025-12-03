package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.api.*
import com.chatr.app.data.repository.GamesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class GamesViewModel @Inject constructor(
    private val repository: GamesRepository
) : ViewModel() {
    
    private val _games = MutableStateFlow<List<GameResponse>>(emptyList())
    val games: StateFlow<List<GameResponse>> = _games.asStateFlow()
    
    private val _featuredGames = MutableStateFlow<List<GameResponse>>(emptyList())
    val featuredGames: StateFlow<List<GameResponse>> = _featuredGames.asStateFlow()
    
    private val _categories = MutableStateFlow<List<GameCategoryResponse>>(emptyList())
    val categories: StateFlow<List<GameCategoryResponse>> = _categories.asStateFlow()
    
    private val _userProgress = MutableStateFlow<List<GameProgressResponse>>(emptyList())
    val userProgress: StateFlow<List<GameProgressResponse>> = _userProgress.asStateFlow()
    
    private val _dailyChallenges = MutableStateFlow<List<GameChallengeResponse>>(emptyList())
    val dailyChallenges: StateFlow<List<GameChallengeResponse>> = _dailyChallenges.asStateFlow()
    
    private val _leaderboard = MutableStateFlow<LeaderboardResponse?>(null)
    val leaderboard: StateFlow<LeaderboardResponse?> = _leaderboard.asStateFlow()
    
    private val _currentGame = MutableStateFlow<GameResponse?>(null)
    val currentGame: StateFlow<GameResponse?> = _currentGame.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    init {
        loadGames()
        loadFeaturedGames()
        loadCategories()
        loadUserProgress()
        loadDailyChallenges()
    }
    
    fun loadGames(category: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getGames(category)
                .onSuccess { _games.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun loadFeaturedGames() {
        viewModelScope.launch {
            repository.getGames(featured = true)
                .onSuccess { _featuredGames.value = it }
        }
    }
    
    fun loadCategories() {
        viewModelScope.launch {
            repository.getGameCategories()
                .onSuccess { _categories.value = it }
        }
    }
    
    fun loadUserProgress() {
        viewModelScope.launch {
            repository.getUserProgress()
                .onSuccess { _userProgress.value = it }
        }
    }
    
    fun loadDailyChallenges() {
        viewModelScope.launch {
            repository.getDailyChallenges()
                .onSuccess { _dailyChallenges.value = it }
        }
    }
    
    fun loadGame(gameId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getGame(gameId)
                .onSuccess { _currentGame.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun completeLevel(gameId: String, level: Int, score: Int, timeSpent: Long, stars: Int, onResult: (LevelCompleteResponse) -> Unit) {
        viewModelScope.launch {
            repository.completeLevel(gameId, level, score, timeSpent, stars)
                .onSuccess { 
                    onResult(it)
                    loadUserProgress()
                }
                .onFailure { _error.value = it.message }
        }
    }
    
    fun completeChallenge(challengeId: String, value: Int, onResult: (ChallengeCompleteResponse) -> Unit) {
        viewModelScope.launch {
            repository.completeChallenge(challengeId, value)
                .onSuccess {
                    onResult(it)
                    loadDailyChallenges()
                }
                .onFailure { _error.value = it.message }
        }
    }
    
    fun loadLeaderboard(gameId: String, timeframe: String = "all") {
        viewModelScope.launch {
            repository.getLeaderboard(gameId, timeframe)
                .onSuccess { _leaderboard.value = it }
        }
    }
    
    fun loadGlobalLeaderboard() {
        viewModelScope.launch {
            repository.getGlobalLeaderboard()
                .onSuccess { _leaderboard.value = it }
        }
    }
    
    // AI Features
    fun analyzeEmotion(audioData: String?, textInput: String?, gameContext: String, onResult: (EmotionAnalysisResponse) -> Unit) {
        viewModelScope.launch {
            repository.analyzeEmotion(audioData, textInput, gameContext)
                .onSuccess { onResult(it) }
                .onFailure { _error.value = it.message }
        }
    }
    
    fun parallelYouQuery(gameId: String, userAction: String, context: Map<String, Any>, onResult: (ParallelYouResponse) -> Unit) {
        viewModelScope.launch {
            repository.parallelYouQuery(gameId, userAction, context)
                .onSuccess { onResult(it) }
                .onFailure { _error.value = it.message }
        }
    }
    
    fun clearError() {
        _error.value = null
    }
}
