package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import com.chatr.app.data.models.Community
import com.chatr.app.data.models.FameCamPost
import com.chatr.app.data.models.FameLeaderboardEntry
import com.chatr.app.data.models.Story
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
        val result = safeApiCall { api.getStories() }
        emit(result.map { apiStories ->
            apiStories.map { it.toModel() }
        })
    }
    
    suspend fun createStory(mediaUrl: String, caption: String?, type: String): Result<Story> {
        return safeApiCall {
            api.createStory(CreateStoryRequest(mediaUrl, caption, type))
        }.map { it.toModel() }
    }
    
    suspend fun deleteStory(storyId: String): Result<Unit> {
        return safeApiCall { api.deleteStory(storyId) }
    }
    
    suspend fun markStoryViewed(storyId: String): Result<Unit> {
        return safeApiCall { api.markStoryViewed(storyId) }
    }
    
    // Communities
    fun getCommunities(): Flow<Result<List<Community>>> = flow {
        val result = safeApiCall { api.getCommunities() }
        emit(result.map { apiCommunities ->
            apiCommunities.map { it.toModel() }
        })
    }
    
    suspend fun getCommunity(communityId: String): Result<Community> {
        return safeApiCall { api.getCommunity(communityId) }.map { it.toModel() }
    }
    
    suspend fun createCommunity(name: String, description: String?): Result<Community> {
        return safeApiCall {
            api.createCommunity(CreateCommunityRequest(name, description))
        }.map { it.toModel() }
    }
    
    suspend fun joinCommunity(communityId: String): Result<Unit> {
        return safeApiCall { api.joinCommunity(communityId) }
    }
    
    suspend fun leaveCommunity(communityId: String): Result<Unit> {
        return safeApiCall { api.leaveCommunity(communityId) }
    }
    
    // Fame Cam
    fun getFameCamPosts(): Flow<Result<List<FameCamPost>>> = flow {
        val result = safeApiCall { api.getFameCamPosts() }
        emit(result.map { apiPosts ->
            apiPosts.map { it.toModel() }
        })
    }
    
    suspend fun createFameCamPost(mediaUrl: String, caption: String?, challengeId: String?): Result<FameCamPost> {
        return safeApiCall {
            api.createFameCamPost(CreateFameCamPostRequest(mediaUrl, caption, challengeId))
        }.map { it.toModel() }
    }
    
    suspend fun likeFameCamPost(postId: String): Result<Unit> {
        return safeApiCall { api.likeFameCamPost(postId) }
    }
    
    fun getFameLeaderboard(): Flow<Result<List<FameLeaderboardEntry>>> = flow {
        val result = safeApiCall { api.getFameLeaderboard() }
        emit(result.map { apiEntries ->
            apiEntries.map { it.toModel() }
        })
    }
}

// Extension functions to convert API models to domain models
private fun com.chatr.app.data.api.Story.toModel() = Story(
    id = id,
    userId = userId,
    username = username,
    avatarUrl = avatarUrl,
    mediaUrl = mediaUrl,
    caption = caption,
    type = type,
    viewCount = viewCount,
    createdAt = createdAt,
    expiresAt = expiresAt
)

private fun com.chatr.app.data.api.Community.toModel() = Community(
    id = id,
    name = name,
    description = description,
    iconUrl = iconUrl,
    memberCount = memberCount,
    createdBy = createdBy,
    createdAt = createdAt,
    isJoined = isJoined
)

private fun com.chatr.app.data.api.FameCamPost.toModel() = FameCamPost(
    id = id,
    userId = userId,
    username = username,
    avatarUrl = avatarUrl,
    mediaUrl = mediaUrl,
    caption = caption,
    likeCount = likeCount,
    commentCount = commentCount,
    viralityScore = viralityScore,
    coinsEarned = coinsEarned,
    createdAt = createdAt
)

private fun com.chatr.app.data.api.FameLeaderboardEntry.toModel() = FameLeaderboardEntry(
    userId = userId,
    username = username,
    avatarUrl = avatarUrl,
    totalFameScore = totalFameScore,
    totalPosts = totalPosts,
    totalViralPosts = totalViralPosts,
    rank = rank
)
