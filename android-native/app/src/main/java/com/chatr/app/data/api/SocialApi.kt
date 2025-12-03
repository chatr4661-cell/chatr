package com.chatr.app.data.api

import com.chatr.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface SocialApi {
    
    // Stories
    @GET("stories")
    suspend fun getStories(): Response<List<Story>>
    
    @POST("stories")
    suspend fun createStory(@Body request: CreateStoryRequest): Response<Story>
    
    @DELETE("stories/{id}")
    suspend fun deleteStory(@Path("id") storyId: String): Response<Unit>
    
    @POST("stories/{id}/view")
    suspend fun markStoryViewed(@Path("id") storyId: String): Response<Unit>
    
    // Communities
    @GET("communities")
    suspend fun getCommunities(): Response<List<Community>>
    
    @POST("communities")
    suspend fun createCommunity(@Body request: CreateCommunityRequest): Response<Community>
    
    @GET("communities/{id}")
    suspend fun getCommunity(@Path("id") communityId: String): Response<Community>
    
    @POST("communities/{id}/join")
    suspend fun joinCommunity(@Path("id") communityId: String): Response<Unit>
    
    @POST("communities/{id}/leave")
    suspend fun leaveCommunity(@Path("id") communityId: String): Response<Unit>
    
    // Fame Cam
    @GET("fame-cam/posts")
    suspend fun getFameCamPosts(): Response<List<FameCamPost>>
    
    @POST("fame-cam/posts")
    suspend fun createFameCamPost(@Body request: CreateFameCamPostRequest): Response<FameCamPost>
    
    @POST("fame-cam/posts/{id}/like")
    suspend fun likeFameCamPost(@Path("id") postId: String): Response<Unit>
    
    @GET("fame-leaderboard")
    suspend fun getFameLeaderboard(): Response<List<FameLeaderboardEntry>>
}

// Request models
data class CreateStoryRequest(
    val mediaUrl: String,
    val caption: String?,
    val type: String
)

data class CreateCommunityRequest(
    val name: String,
    val description: String?
)

data class CreateFameCamPostRequest(
    val mediaUrl: String,
    val caption: String?,
    val challengeId: String?
)

// Response models
data class Story(
    val id: String,
    val userId: String,
    val username: String?,
    val avatarUrl: String?,
    val mediaUrl: String,
    val caption: String?,
    val type: String,
    val viewCount: Int = 0,
    val createdAt: Long,
    val expiresAt: Long
)

data class Community(
    val id: String,
    val name: String,
    val description: String?,
    val iconUrl: String?,
    val memberCount: Int = 0,
    val createdBy: String,
    val createdAt: Long,
    val isJoined: Boolean = false
)

data class FameCamPost(
    val id: String,
    val userId: String,
    val username: String?,
    val avatarUrl: String?,
    val mediaUrl: String,
    val caption: String?,
    val likeCount: Int = 0,
    val commentCount: Int = 0,
    val viralityScore: Double = 0.0,
    val coinsEarned: Int = 0,
    val createdAt: Long
)

data class FameLeaderboardEntry(
    val userId: String,
    val username: String?,
    val avatarUrl: String?,
    val totalFameScore: Double,
    val totalPosts: Int,
    val totalViralPosts: Int,
    val rank: Int
)
