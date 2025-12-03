package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StealthModeRepository @Inject constructor(
    private val api: StealthModeApi
) {
    
    // Stealth Mode Status
    suspend fun getStealthModeStatus(): Result<StealthModeStatusResponse> {
        return safeApiCall {
            api.getStealthModeStatus()
        }
    }
    
    suspend fun switchStealthMode(targetMode: String, subscriptionId: String? = null): Result<StealthModeStatusResponse> {
        return safeApiCall {
            api.switchStealthMode(SwitchModeRequest(targetMode, subscriptionId))
        }
    }
    
    // Seller Mode
    suspend fun getSellerSettings(): Result<SellerModeSettingsResponse> {
        return safeApiCall {
            api.getSellerSettings()
        }
    }
    
    suspend fun updateSellerSettings(
        businessName: String? = null,
        businessDescription: String? = null,
        businessCategory: String? = null,
        contactPhone: String? = null,
        contactEmail: String? = null,
        businessHours: Map<String, Any>? = null,
        broadcastEnabled: Boolean? = null,
        autoReplyEnabled: Boolean? = null,
        autoReplyMessage: String? = null
    ): Result<SellerModeSettingsResponse> {
        return safeApiCall {
            api.updateSellerSettings(UpdateSellerSettingsRequest(
                businessName, businessDescription, businessCategory,
                contactPhone, contactEmail, businessHours,
                broadcastEnabled, autoReplyEnabled, autoReplyMessage
            ))
        }
    }
    
    suspend fun getSellerAnalytics(startDate: String? = null, endDate: String? = null): Result<SellerAnalyticsResponse> {
        return safeApiCall {
            api.getSellerAnalytics(startDate, endDate)
        }
    }
    
    suspend fun getSellerProducts(): Result<List<SellerProductResponse>> {
        return safeApiCall {
            api.getSellerProducts()
        }
    }
    
    suspend fun createProduct(
        name: String,
        description: String?,
        category: String,
        price: Double,
        imageUrls: List<String>,
        stock: Int?
    ): Result<SellerProductResponse> {
        return safeApiCall {
            api.createProduct(CreateProductRequest(name, description, category, price, imageUrls, stock))
        }
    }
    
    suspend fun updateProduct(
        productId: String,
        name: String? = null,
        description: String? = null,
        category: String? = null,
        price: Double? = null,
        imageUrls: List<String>? = null,
        isActive: Boolean? = null,
        stock: Int? = null
    ): Result<SellerProductResponse> {
        return safeApiCall {
            api.updateProduct(productId, UpdateProductRequest(name, description, category, price, imageUrls, isActive, stock))
        }
    }
    
    suspend fun deleteProduct(productId: String): Result<Unit> {
        return safeApiCall {
            api.deleteProduct(productId)
        }
    }
    
    // Rewards Mode
    suspend fun getRewardsSettings(): Result<RewardsModeSettingsResponse> {
        return safeApiCall {
            api.getRewardsSettings()
        }
    }
    
    suspend fun updateRewardsSettings(notificationsEnabled: Boolean?): Result<RewardsModeSettingsResponse> {
        return safeApiCall {
            api.updateRewardsSettings(UpdateRewardsSettingsRequest(notificationsEnabled))
        }
    }
    
    suspend fun getDailyChallenges(): Result<List<DailyChallengeResponse>> {
        return safeApiCall {
            api.getDailyChallenges()
        }
    }
    
    suspend fun completeChallenge(challengeId: String): Result<ChallengeRewardResponse> {
        return safeApiCall {
            api.completeChallenge(challengeId)
        }
    }
    
    suspend fun getReferralStats(): Result<ReferralStatsResponse> {
        return safeApiCall {
            api.getReferralStats()
        }
    }
    
    suspend fun generateReferralCode(): Result<ReferralCodeResponse> {
        return safeApiCall {
            api.generateReferralCode()
        }
    }
    
    // Subscriptions
    suspend fun getAvailableSubscriptions(): Result<List<StealthSubscriptionResponse>> {
        return safeApiCall {
            api.getAvailableSubscriptions()
        }
    }
    
    suspend fun purchaseSubscription(subscriptionId: String, paymentId: String): Result<SubscriptionPurchaseResponse> {
        return safeApiCall {
            api.purchaseSubscription(PurchaseSubscriptionRequest(subscriptionId, paymentId))
        }
    }
}
