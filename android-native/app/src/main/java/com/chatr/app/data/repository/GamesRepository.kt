package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GamesRepository @Inject constructor(
    private val api: GamesApi
) {
    
    // Games List
    suspend fun getGames(category: String? = null, featured: Boolean? = null): Result<List<GameResponse>> {
        return safeApiCall {
            api.getGames(category, featured)
        }
    }
    
    suspend fun getGame(gameId: String): Result<GameResponse> {
        return safeApiCall {
            api.getGame(gameId)
        }
    }
    
    suspend fun getGameCategories(): Result<List<GameCategoryResponse>> {
        return safeApiCall {
            api.getGameCategories()
        }
    }
    
    // User Progress
    suspend fun getUserProgress(): Result<List<GameProgressResponse>> {
        return safeApiCall {
            api.getUserProgress()
        }
    }
    
    suspend fun getGameProgress(gameId: String): Result<GameProgressResponse> {
        return safeApiCall {
            api.getGameProgress(gameId)
        }
    }
    
    suspend fun updateGameProgress(
        gameId: String,
        currentLevel: Int? = null,
        score: Int? = null,
        achievements: List<String>? = null
    ): Result<GameProgressResponse> {
        return safeApiCall {
            api.updateGameProgress(gameId, UpdateProgressRequest(currentLevel, score, achievements))
        }
    }
    
    suspend fun completeLevel(gameId: String, level: Int, score: Int, timeSpent: Long, stars: Int): Result<LevelCompleteResponse> {
        return safeApiCall {
            api.completeLevel(gameId, CompleteLevelRequest(level, score, timeSpent, stars))
        }
    }
    
    // Challenges
    suspend fun getDailyChallenges(): Result<List<GameChallengeResponse>> {
        return safeApiCall {
            api.getDailyChallenges()
        }
    }
    
    suspend fun completeChallenge(challengeId: String, value: Int, proof: String? = null): Result<ChallengeCompleteResponse> {
        return safeApiCall {
            api.completeChallenge(challengeId, CompleteChallengeRequest(value, proof))
        }
    }
    
    // Leaderboards
    suspend fun getLeaderboard(gameId: String, timeframe: String = "all"): Result<LeaderboardResponse> {
        return safeApiCall {
            api.getLeaderboard(gameId, timeframe)
        }
    }
    
    suspend fun getGlobalLeaderboard(): Result<LeaderboardResponse> {
        return safeApiCall {
            api.getGlobalLeaderboard()
        }
    }
    
    // AI Features
    suspend fun generateAIChallenge(gameId: String, difficulty: String, userLevel: Int): Result<GameChallengeResponse> {
        return safeApiCall {
            api.generateAIChallenge(AIGenerateChallengeRequest(gameId, difficulty, userLevel))
        }
    }
    
    suspend fun analyzeEmotion(audioData: String?, textInput: String?, gameContext: String): Result<EmotionAnalysisResponse> {
        return safeApiCall {
            api.analyzeEmotion(EmotionAnalysisRequest(audioData, textInput, gameContext))
        }
    }
    
    suspend fun parallelYouQuery(gameId: String, userAction: String, context: Map<String, Any>): Result<ParallelYouResponse> {
        return safeApiCall {
            api.parallelYouQuery(ParallelYouRequest(gameId, userAction, context))
        }
    }
}
