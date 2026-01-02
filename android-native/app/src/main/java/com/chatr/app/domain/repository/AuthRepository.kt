package com.chatr.app.domain.repository

import com.chatr.app.domain.model.AuthenticatedUser
import com.chatr.app.domain.model.User
import kotlinx.coroutines.flow.Flow

/**
 * Authentication repository interface
 * Phone-only authentication (Telegram/WhatsApp style)
 */
interface AuthRepository {
    
    /**
     * Check if user is currently authenticated
     */
    val isAuthenticated: Flow<Boolean>
    
    /**
     * Current authenticated user
     */
    val currentUser: Flow<User?>
    
    /**
     * Request OTP for phone number
     * @return verificationId for OTP verification
     */
    suspend fun requestOtp(phoneNumber: String): Result<String>
    
    /**
     * Verify OTP and authenticate
     */
    suspend fun verifyOtp(
        verificationId: String,
        otpCode: String
    ): Result<AuthenticatedUser>
    
    /**
     * Refresh authentication token
     */
    suspend fun refreshToken(): Result<AuthenticatedUser>
    
    /**
     * Get current access token
     */
    suspend fun getAccessToken(): String?
    
    /**
     * Get current user ID
     */
    suspend fun getCurrentUserId(): String?
    
    /**
     * Update user profile
     */
    suspend fun updateProfile(
        displayName: String?,
        avatarUrl: String?,
        bio: String?
    ): Result<User>
    
    /**
     * Sign out and clear all auth data
     */
    suspend fun signOut()
    
    /**
     * Register FCM token for push notifications
     */
    suspend fun registerFcmToken(token: String): Result<Unit>
}
