package com.chatr.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface GamesApi {
    
    // ==================== GAMES LIST ====================
    @GET("games")
    suspend fun getGames(
        @Query("category") category: String? = null,
        @Query("featured") featured: Boolean? = null
    ): Response<List<GameResponse>>
    
    @GET("games/{gameId}")
    suspend fun getGame(@Path("gameId") gameId: String): Response<GameResponse>
    
    @GET("games/categories")
    suspend fun getGameCategories(): Response<List<GameCategoryResponse>>
    
    // ==================== USER PROGRESS ====================
    @GET("games/progress")
    suspend fun getUserProgress(): Response<List<GameProgressResponse>>
    
    @GET("games/{gameId}/progress")
    suspend fun getGameProgress(@Path("gameId") gameId: String): Response<GameProgressResponse>
    
    @POST("games/{gameId}/progress")
    suspend fun updateGameProgress(
        @Path("gameId") gameId: String,
        @Body request: UpdateProgressRequest
    ): Response<GameProgressResponse>
    
    @POST("games/{gameId}/complete-level")
    suspend fun completeLavel(
        @Path("gameId") gameId: String,
        @Body request: CompleteLevelRequest
    ): Response<LevelCompleteResponse>
    
    // ==================== CHALLENGES ====================
    @GET("games/challenges")
    suspend fun getDailyChallenges(): Response<List<GameChallengeResponse>>
    
    @POST("games/challenges/{challengeId}/complete")
    suspend fun completeChallenge(
        @Path("challengeId") challengeId: String,
        @Body request: CompleteChallengeRequest
    ): Response<ChallengeCompleteResponse>
    
    // ==================== LEADERBOARDS ====================
    @GET("games/{gameId}/leaderboard")
    suspend fun getLeaderboard(
        @Path("gameId") gameId: String,
        @Query("timeframe") timeframe: String = "all" // daily, weekly, monthly, all
    ): Response<LeaderboardResponse>
    
    @GET("games/leaderboard/global")
    suspend fun getGlobalLeaderboard(): Response<LeaderboardResponse>
    
    // ==================== AI GAME FEATURES ====================
    @POST("games/ai/generate-challenge")
    suspend fun generateAIChallenge(@Body request: AIGenerateChallengeRequest): Response<GameChallengeResponse>
    
    @POST("games/ai/analyze-emotion")
    suspend fun analyzeEmotion(@Body request: EmotionAnalysisRequest): Response<EmotionAnalysisResponse>
    
    @POST("games/ai/parallel-you")
    suspend fun parallelYouQuery(@Body request: ParallelYouRequest): Response<ParallelYouResponse>
}

// Request/Response models
data class GameResponse(
    val id: String,
    val name: String,
    val description: String,
    val category: String, // self_competition, predictive, multiplayer, ai_casual
    val iconUrl: String?,
    val bannerUrl: String?,
    val totalLevels: Int,
    val difficulty: String,
    val isMultiplayer: Boolean,
    val isFeatured: Boolean,
    val playCount: Int,
    val rating: Float,
    val createdAt: String
)

data class GameCategoryResponse(
    val id: String,
    val name: String,
    val description: String?,
    val icon: String?,
    val gameCount: Int
)

data class GameProgressResponse(
    val id: String,
    val userId: String,
    val gameId: String,
    val currentLevel: Int,
    val highScore: Int,
    val totalScore: Int,
    val achievements: List<String>,
    val playTime: Long, // in seconds
    val lastPlayedAt: String,
    val createdAt: String
)

data class UpdateProgressRequest(
    val currentLevel: Int?,
    val score: Int?,
    val achievements: List<String>?
)

data class CompleteLevelRequest(
    val level: Int,
    val score: Int,
    val timeSpent: Long,
    val stars: Int // 1-3
)

data class LevelCompleteResponse(
    val success: Boolean,
    val newHighScore: Boolean,
    val coinsEarned: Int,
    val xpEarned: Int,
    val unlockedAchievements: List<String>
)

data class GameChallengeResponse(
    val id: String,
    val gameId: String?,
    val title: String,
    val description: String,
    val type: String, // daily, weekly, special
    val targetValue: Int,
    val reward: Int,
    val expiresAt: String,
    val isCompleted: Boolean
)

data class CompleteChallengeRequest(
    val value: Int,
    val proof: String? = null
)

data class ChallengeCompleteResponse(
    val success: Boolean,
    val coinsEarned: Int,
    val xpEarned: Int
)

data class LeaderboardResponse(
    val entries: List<LeaderboardEntry>,
    val userRank: Int?,
    val userEntry: LeaderboardEntry?
)

data class LeaderboardEntry(
    val rank: Int,
    val userId: String,
    val username: String,
    val avatarUrl: String?,
    val score: Int,
    val level: Int
)

data class AIGenerateChallengeRequest(
    val gameId: String,
    val difficulty: String,
    val userLevel: Int
)

data class EmotionAnalysisRequest(
    val audioData: String?, // base64 encoded audio
    val textInput: String?,
    val gameContext: String
)

data class EmotionAnalysisResponse(
    val dominantEmotion: String,
    val confidence: Float,
    val emotions: Map<String, Float>,
    val gameAction: String?
)

data class ParallelYouRequest(
    val gameId: String,
    val userAction: String,
    val context: Map<String, Any>
)

data class ParallelYouResponse(
    val aiAction: String,
    val explanation: String,
    val confidence: Float
)
