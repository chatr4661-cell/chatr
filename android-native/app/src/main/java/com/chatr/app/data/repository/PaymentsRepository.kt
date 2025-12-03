package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PaymentsRepository @Inject constructor(
    private val api: PaymentsApi
) {
    
    // UPI Payments
    suspend fun createPayment(
        amount: Double,
        orderType: String,
        orderId: String? = null,
        sellerId: String? = null,
        description: String? = null
    ): Result<UPIPaymentResponse> {
        return safeApiCall {
            api.createPayment(CreateUPIPaymentRequest(amount, orderType, orderId, sellerId, description))
        }
    }
    
    suspend fun getPayment(paymentId: String): Result<UPIPaymentResponse> {
        return safeApiCall {
            api.getPayment(paymentId)
        }
    }
    
    suspend fun getUserPayments(userId: String, status: String? = null): Result<List<UPIPaymentResponse>> {
        return safeApiCall {
            api.getUserPayments(userId, status)
        }
    }
    
    suspend fun uploadScreenshot(
        paymentId: String,
        screenshotBase64: String,
        upiTransactionId: String? = null
    ): Result<UPIPaymentResponse> {
        return safeApiCall {
            api.uploadScreenshot(paymentId, UploadScreenshotRequest(screenshotBase64, upiTransactionId))
        }
    }
    
    suspend fun verifyPayment(paymentId: String, status: String, notes: String? = null): Result<UPIPaymentResponse> {
        return safeApiCall {
            api.verifyPayment(paymentId, VerifyPaymentRequest(status, notes))
        }
    }
    
    // Seller Settlements
    suspend fun getSellerSettlements(sellerId: String): Result<List<SellerSettlementResponse>> {
        return safeApiCall {
            api.getSellerSettlements(sellerId)
        }
    }
    
    suspend fun createSettlement(sellerId: String, amount: Double, paymentMethod: String): Result<SellerSettlementResponse> {
        return safeApiCall {
            api.createSettlement(CreateSettlementRequest(sellerId, amount, paymentMethod))
        }
    }
    
    // Subscriptions
    suspend fun getUserSubscription(): Result<SubscriptionResponse> {
        return safeApiCall {
            api.getUserSubscription()
        }
    }
    
    suspend fun subscribe(planType: String, paymentId: String): Result<SubscriptionResponse> {
        return safeApiCall {
            api.subscribe(SubscribeRequest(planType, paymentId))
        }
    }
    
    suspend fun cancelSubscription(): Result<Unit> {
        return safeApiCall {
            api.cancelSubscription()
        }
    }
    
    // Wallet
    suspend fun getWalletBalance(): Result<WalletBalanceResponse> {
        return safeApiCall {
            api.getWalletBalance()
        }
    }
    
    suspend fun getWalletTransactions(limit: Int = 20, offset: Int = 0): Result<List<WalletTransactionResponse>> {
        return safeApiCall {
            api.getWalletTransactions(limit, offset)
        }
    }
}
