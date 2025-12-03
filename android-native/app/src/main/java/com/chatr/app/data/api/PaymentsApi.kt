package com.chatr.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface PaymentsApi {
    
    // ==================== UPI PAYMENTS ====================
    @POST("upi-payments")
    suspend fun createPayment(@Body request: CreateUPIPaymentRequest): Response<UPIPaymentResponse>
    
    @GET("upi-payments/{paymentId}")
    suspend fun getPayment(@Path("paymentId") paymentId: String): Response<UPIPaymentResponse>
    
    @GET("upi-payments")
    suspend fun getUserPayments(
        @Query("userId") userId: String,
        @Query("status") status: String? = null
    ): Response<List<UPIPaymentResponse>>
    
    @POST("upi-payments/{paymentId}/screenshot")
    suspend fun uploadScreenshot(
        @Path("paymentId") paymentId: String,
        @Body request: UploadScreenshotRequest
    ): Response<UPIPaymentResponse>
    
    @PUT("upi-payments/{paymentId}/verify")
    suspend fun verifyPayment(
        @Path("paymentId") paymentId: String,
        @Body request: VerifyPaymentRequest
    ): Response<UPIPaymentResponse>
    
    // ==================== SELLER SETTLEMENTS ====================
    @GET("seller-settlements")
    suspend fun getSellerSettlements(
        @Query("sellerId") sellerId: String
    ): Response<List<SellerSettlementResponse>>
    
    @POST("seller-settlements")
    suspend fun createSettlement(@Body request: CreateSettlementRequest): Response<SellerSettlementResponse>
    
    @PUT("seller-settlements/{settlementId}")
    suspend fun updateSettlement(
        @Path("settlementId") settlementId: String,
        @Body request: UpdateSettlementRequest
    ): Response<SellerSettlementResponse>
    
    // ==================== SUBSCRIPTIONS ====================
    @GET("subscriptions/user")
    suspend fun getUserSubscription(): Response<SubscriptionResponse>
    
    @POST("subscriptions/subscribe")
    suspend fun subscribe(@Body request: SubscribeRequest): Response<SubscriptionResponse>
    
    @POST("subscriptions/cancel")
    suspend fun cancelSubscription(): Response<Unit>
    
    // ==================== WALLET ====================
    @GET("wallet/balance")
    suspend fun getWalletBalance(): Response<WalletBalanceResponse>
    
    @GET("wallet/transactions")
    suspend fun getWalletTransactions(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<List<WalletTransactionResponse>>
}

// Request/Response models
data class CreateUPIPaymentRequest(
    val amount: Double,
    val orderType: String, // subscription, food_order, healthcare_booking, service_booking
    val orderId: String? = null,
    val sellerId: String? = null,
    val description: String? = null
)

data class UPIPaymentResponse(
    val id: String,
    val userId: String,
    val amount: Double,
    val orderType: String,
    val orderId: String?,
    val sellerId: String?,
    val status: String, // pending, screenshot_uploaded, verified, rejected, refunded
    val screenshotUrl: String?,
    val verifiedBy: String?,
    val verifiedAt: String?,
    val createdAt: String,
    val upiTransactionId: String?
)

data class UploadScreenshotRequest(
    val screenshotBase64: String,
    val upiTransactionId: String?
)

data class VerifyPaymentRequest(
    val status: String, // verified, rejected
    val notes: String? = null
)

data class SellerSettlementResponse(
    val id: String,
    val sellerId: String,
    val amount: Double,
    val status: String, // pending, processing, completed, failed
    val paymentMethod: String?,
    val transactionId: String?,
    val createdAt: String,
    val processedAt: String?
)

data class CreateSettlementRequest(
    val sellerId: String,
    val amount: Double,
    val paymentMethod: String
)

data class UpdateSettlementRequest(
    val status: String,
    val transactionId: String? = null
)

data class SubscriptionResponse(
    val id: String,
    val userId: String,
    val planType: String, // free, premium, seller, rewards
    val status: String, // active, cancelled, expired
    val startDate: String,
    val endDate: String?,
    val features: List<String>
)

data class SubscribeRequest(
    val planType: String,
    val paymentId: String
)

data class WalletBalanceResponse(
    val balance: Int,
    val currency: String
)

data class WalletTransactionResponse(
    val id: String,
    val type: String, // credit, debit
    val amount: Int,
    val description: String,
    val createdAt: String
)
