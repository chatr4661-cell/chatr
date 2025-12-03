package com.chatr.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface StealthModeApi {
    
    // ==================== STEALTH MODE ====================
    @GET("stealth-mode/status")
    suspend fun getStealthModeStatus(): Response<StealthModeStatusResponse>
    
    @POST("stealth-mode/switch")
    suspend fun switchStealthMode(@Body request: SwitchModeRequest): Response<StealthModeStatusResponse>
    
    // ==================== SELLER MODE ====================
    @GET("stealth-mode/seller/settings")
    suspend fun getSellerSettings(): Response<SellerModeSettingsResponse>
    
    @PUT("stealth-mode/seller/settings")
    suspend fun updateSellerSettings(@Body request: UpdateSellerSettingsRequest): Response<SellerModeSettingsResponse>
    
    @GET("stealth-mode/seller/analytics")
    suspend fun getSellerAnalytics(
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<SellerAnalyticsResponse>
    
    @GET("stealth-mode/seller/products")
    suspend fun getSellerProducts(): Response<List<SellerProductResponse>>
    
    @POST("stealth-mode/seller/products")
    suspend fun createProduct(@Body request: CreateProductRequest): Response<SellerProductResponse>
    
    @PUT("stealth-mode/seller/products/{productId}")
    suspend fun updateProduct(
        @Path("productId") productId: String,
        @Body request: UpdateProductRequest
    ): Response<SellerProductResponse>
    
    @DELETE("stealth-mode/seller/products/{productId}")
    suspend fun deleteProduct(@Path("productId") productId: String): Response<Unit>
    
    // ==================== REWARDS MODE ====================
    @GET("stealth-mode/rewards/settings")
    suspend fun getRewardsSettings(): Response<RewardsModeSettingsResponse>
    
    @PUT("stealth-mode/rewards/settings")
    suspend fun updateRewardsSettings(@Body request: UpdateRewardsSettingsRequest): Response<RewardsModeSettingsResponse>
    
    @GET("stealth-mode/rewards/challenges")
    suspend fun getDailyChallenges(): Response<List<DailyChallengeResponse>>
    
    @POST("stealth-mode/rewards/challenges/{challengeId}/complete")
    suspend fun completeChallenge(@Path("challengeId") challengeId: String): Response<ChallengeRewardResponse>
    
    @GET("stealth-mode/rewards/referrals")
    suspend fun getReferralStats(): Response<ReferralStatsResponse>
    
    @POST("stealth-mode/rewards/referrals/generate-code")
    suspend fun generateReferralCode(): Response<ReferralCodeResponse>
    
    // ==================== SUBSCRIPTIONS ====================
    @GET("stealth-mode/subscriptions")
    suspend fun getAvailableSubscriptions(): Response<List<StealthSubscriptionResponse>>
    
    @POST("stealth-mode/subscriptions/purchase")
    suspend fun purchaseSubscription(@Body request: PurchaseSubscriptionRequest): Response<SubscriptionPurchaseResponse>
}

// Request/Response models
data class StealthModeStatusResponse(
    val currentMode: String, // default, seller, rewards
    val isActive: Boolean,
    val activatedAt: String?,
    val expiresAt: String?,
    val features: List<String>
)

data class SwitchModeRequest(
    val targetMode: String,
    val subscriptionId: String? = null
)

data class SellerModeSettingsResponse(
    val id: String,
    val userId: String,
    val businessName: String?,
    val businessDescription: String?,
    val businessCategory: String?,
    val contactPhone: String?,
    val contactEmail: String?,
    val businessHours: Map<String, Any>?,
    val broadcastEnabled: Boolean,
    val autoReplyEnabled: Boolean,
    val autoReplyMessage: String?,
    val createdAt: String
)

data class UpdateSellerSettingsRequest(
    val businessName: String?,
    val businessDescription: String?,
    val businessCategory: String?,
    val contactPhone: String?,
    val contactEmail: String?,
    val businessHours: Map<String, Any>?,
    val broadcastEnabled: Boolean?,
    val autoReplyEnabled: Boolean?,
    val autoReplyMessage: String?
)

data class SellerAnalyticsResponse(
    val totalRevenue: Double,
    val totalOrders: Int,
    val totalProducts: Int,
    val totalImpressions: Int,
    val conversionRate: Float,
    val averageOrderValue: Double,
    val topProducts: List<TopProductResponse>,
    val revenueByDay: Map<String, Double>
)

data class TopProductResponse(
    val productId: String,
    val productName: String,
    val sales: Int,
    val revenue: Double
)

data class SellerProductResponse(
    val id: String,
    val sellerId: String,
    val name: String,
    val description: String?,
    val category: String,
    val price: Double,
    val currency: String,
    val imageUrls: List<String>,
    val isActive: Boolean,
    val stock: Int?,
    val createdAt: String
)

data class CreateProductRequest(
    val name: String,
    val description: String?,
    val category: String,
    val price: Double,
    val imageUrls: List<String>,
    val stock: Int?
)

data class UpdateProductRequest(
    val name: String?,
    val description: String?,
    val category: String?,
    val price: Double?,
    val imageUrls: List<String>?,
    val isActive: Boolean?,
    val stock: Int?
)

data class RewardsModeSettingsResponse(
    val id: String,
    val userId: String,
    val coinMultiplier: Float,
    val dailyBonusStreak: Int,
    val totalCoinsEarned: Int,
    val referralCode: String?,
    val referralCount: Int,
    val achievements: List<String>,
    val createdAt: String
)

data class UpdateRewardsSettingsRequest(
    val notificationsEnabled: Boolean?
)

data class DailyChallengeResponse(
    val id: String,
    val title: String,
    val description: String,
    val type: String, // login, share, referral, purchase, engage
    val targetValue: Int,
    val currentValue: Int,
    val reward: Int,
    val isCompleted: Boolean,
    val expiresAt: String
)

data class ChallengeRewardResponse(
    val success: Boolean,
    val coinsEarned: Int,
    val newBalance: Int,
    val bonusMultiplier: Float?
)

data class ReferralStatsResponse(
    val referralCode: String,
    val totalReferrals: Int,
    val pendingReferrals: Int,
    val coinsEarned: Int,
    val referralHistory: List<ReferralHistoryEntry>
)

data class ReferralHistoryEntry(
    val referredUserId: String,
    val referredUsername: String,
    val coinsEarned: Int,
    val status: String,
    val createdAt: String
)

data class ReferralCodeResponse(
    val code: String,
    val shareUrl: String
)

data class StealthSubscriptionResponse(
    val id: String,
    val mode: String, // seller, rewards
    val name: String,
    val description: String,
    val price: Double,
    val currency: String,
    val duration: Int, // in days
    val features: List<String>
)

data class PurchaseSubscriptionRequest(
    val subscriptionId: String,
    val paymentId: String
)

data class SubscriptionPurchaseResponse(
    val success: Boolean,
    val subscriptionId: String,
    val activatedAt: String,
    val expiresAt: String
)
