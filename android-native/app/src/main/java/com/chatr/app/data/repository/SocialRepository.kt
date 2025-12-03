package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SocialRepository @Inject constructor(
    private val api: SocialApi
) {
    
    // Stories
    fun getStories(): Flow<Result<List<Story>>> = flow {
        emit(safeApiCall { api.getStories() })
    }
    
    suspend fun createStory(mediaUrl: String, caption: String?, type: String): Result<Story> {
        return safeApiCall {
            api.createStory(CreateStoryRequest(mediaUrl, caption, type))
        }
    }
    
    suspend fun deleteStory(storyId: String): Result<Unit> {
        return safeApiCall { api.deleteStory(storyId) }
    }
    
    suspend fun markStoryViewed(storyId: String): Result<Unit> {
        return safeApiCall { api.markStoryViewed(storyId) }
    }
    
    // Communities
    fun getCommunities(): Flow<Result<List<Community>>> = flow {
        emit(safeApiCall { api.getCommunities() })
    }
    
    suspend fun getCommunity(communityId: String): Result<Community> {
        return safeApiCall { api.getCommunity(communityId) }
    }
    
    suspend fun createCommunity(name: String, description: String?): Result<Community> {
        return safeApiCall {
            api.createCommunity(CreateCommunityRequest(name, description))
        }
    }
    
    suspend fun joinCommunity(communityId: String): Result<Unit> {
        return safeApiCall { api.joinCommunity(communityId) }
    }
    
    suspend fun leaveCommunity(communityId: String): Result<Unit> {
        return safeApiCall { api.leaveCommunity(communityId) }
    }
    
    // Fame Cam
    fun getFameCamPosts(): Flow<Result<List<FameCamPost>>> = flow {
        emit(safeApiCall { api.getFameCamPosts() })
    }
    
    suspend fun createFameCamPost(mediaUrl: String, caption: String?, challengeId: String?): Result<FameCamPost> {
        return safeApiCall {
            api.createFameCamPost(CreateFameCamPostRequest(mediaUrl, caption, challengeId))
        }
    }
    
    suspend fun likeFameCamPost(postId: String): Result<Unit> {
        return safeApiCall { api.likeFameCamPost(postId) }
    }
    
    fun getFameLeaderboard(): Flow<Result<List<FameLeaderboardEntry>>> = flow {
        emit(safeApiCall { api.getFameLeaderboard() })
    }
}
