package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.*
import com.chatr.app.data.repository.SocialRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StoriesState(
    val isLoading: Boolean = false,
    val stories: List<Story> = emptyList(),
    val myStories: List<Story> = emptyList(),
    val error: String? = null
)

data class CommunitiesState(
    val isLoading: Boolean = false,
    val communities: List<Community> = emptyList(),
    val joinedCommunities: List<Community> = emptyList(),
    val selectedCommunity: Community? = null,
    val error: String? = null
)

data class FameCamState(
    val isLoading: Boolean = false,
    val posts: List<FameCamPost> = emptyList(),
    val leaderboard: List<FameLeaderboardEntry> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class SocialViewModel @Inject constructor(
    private val socialRepository: SocialRepository
) : ViewModel() {
    
    private val _storiesState = MutableStateFlow(StoriesState())
    val storiesState: StateFlow<StoriesState> = _storiesState.asStateFlow()
    
    private val _communitiesState = MutableStateFlow(CommunitiesState())
    val communitiesState: StateFlow<CommunitiesState> = _communitiesState.asStateFlow()
    
    private val _fameCamState = MutableStateFlow(FameCamState())
    val fameCamState: StateFlow<FameCamState> = _fameCamState.asStateFlow()
    
    private var currentUserId: String? = null
    
    fun setCurrentUser(userId: String) {
        currentUserId = userId
    }
    
    // Stories
    fun loadStories() {
        viewModelScope.launch {
            _storiesState.value = _storiesState.value.copy(isLoading = true, error = null)
            
            socialRepository.getStories().collect { result ->
                result.onSuccess { stories ->
                    val myStories = stories.filter { it.userId == currentUserId }
                    val otherStories = stories.filter { it.userId != currentUserId }
                    
                    _storiesState.value = _storiesState.value.copy(
                        isLoading = false,
                        stories = otherStories,
                        myStories = myStories
                    )
                }.onFailure { exception ->
                    _storiesState.value = _storiesState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
            }
        }
    }
    
    fun createStory(mediaUrl: String, caption: String?, type: String) {
        viewModelScope.launch {
            _storiesState.value = _storiesState.value.copy(isLoading = true)
            
            socialRepository.createStory(mediaUrl, caption, type)
                .onSuccess {
                    loadStories()
                }
                .onFailure { exception ->
                    _storiesState.value = _storiesState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun deleteStory(storyId: String) {
        viewModelScope.launch {
            socialRepository.deleteStory(storyId)
                .onSuccess {
                    val updatedMyStories = _storiesState.value.myStories.filter { it.id != storyId }
                    _storiesState.value = _storiesState.value.copy(myStories = updatedMyStories)
                }
        }
    }
    
    fun markStoryViewed(storyId: String) {
        viewModelScope.launch {
            socialRepository.markStoryViewed(storyId)
        }
    }
    
    // Communities
    fun loadCommunities() {
        viewModelScope.launch {
            _communitiesState.value = _communitiesState.value.copy(isLoading = true, error = null)
            
            socialRepository.getCommunities().collect { result ->
                result.onSuccess { communities ->
                    _communitiesState.value = _communitiesState.value.copy(
                        isLoading = false,
                        communities = communities
                    )
                }.onFailure { exception ->
                    _communitiesState.value = _communitiesState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
            }
        }
    }
    
    fun loadCommunity(communityId: String) {
        viewModelScope.launch {
            _communitiesState.value = _communitiesState.value.copy(isLoading = true)
            
            socialRepository.getCommunity(communityId)
                .onSuccess { community ->
                    _communitiesState.value = _communitiesState.value.copy(
                        isLoading = false,
                        selectedCommunity = community
                    )
                }
                .onFailure { exception ->
                    _communitiesState.value = _communitiesState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun createCommunity(name: String, description: String?) {
        viewModelScope.launch {
            _communitiesState.value = _communitiesState.value.copy(isLoading = true)
            
            socialRepository.createCommunity(name, description)
                .onSuccess {
                    loadCommunities()
                }
                .onFailure { exception ->
                    _communitiesState.value = _communitiesState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun joinCommunity(communityId: String) {
        viewModelScope.launch {
            socialRepository.joinCommunity(communityId)
                .onSuccess {
                    loadCommunities()
                }
                .onFailure { exception ->
                    _communitiesState.value = _communitiesState.value.copy(
                        error = exception.message
                    )
                }
        }
    }
    
    fun leaveCommunity(communityId: String) {
        viewModelScope.launch {
            socialRepository.leaveCommunity(communityId)
                .onSuccess {
                    loadCommunities()
                }
                .onFailure { exception ->
                    _communitiesState.value = _communitiesState.value.copy(
                        error = exception.message
                    )
                }
        }
    }
    
    // Fame Cam
    fun loadFameCamPosts() {
        viewModelScope.launch {
            _fameCamState.value = _fameCamState.value.copy(isLoading = true, error = null)
            
            socialRepository.getFameCamPosts().collect { result ->
                result.onSuccess { posts ->
                    _fameCamState.value = _fameCamState.value.copy(
                        isLoading = false,
                        posts = posts
                    )
                }.onFailure { exception ->
                    _fameCamState.value = _fameCamState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
            }
        }
    }
    
    fun createFameCamPost(mediaUrl: String, caption: String?, challengeId: String?) {
        viewModelScope.launch {
            _fameCamState.value = _fameCamState.value.copy(isLoading = true)
            
            socialRepository.createFameCamPost(mediaUrl, caption, challengeId)
                .onSuccess {
                    loadFameCamPosts()
                }
                .onFailure { exception ->
                    _fameCamState.value = _fameCamState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun likeFameCamPost(postId: String) {
        viewModelScope.launch {
            socialRepository.likeFameCamPost(postId)
                .onSuccess {
                    loadFameCamPosts()
                }
        }
    }
    
    fun loadFameLeaderboard() {
        viewModelScope.launch {
            socialRepository.getFameLeaderboard().collect { result ->
                result.onSuccess { leaderboard ->
                    _fameCamState.value = _fameCamState.value.copy(
                        leaderboard = leaderboard
                    )
                }
            }
        }
    }
    
    fun clearError() {
        _storiesState.value = _storiesState.value.copy(error = null)
        _communitiesState.value = _communitiesState.value.copy(error = null)
        _fameCamState.value = _fameCamState.value.copy(error = null)
    }
}
