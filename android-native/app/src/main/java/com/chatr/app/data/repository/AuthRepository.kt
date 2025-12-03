package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import com.chatr.app.data.models.User
import com.chatr.app.security.SecureStore
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ChatrApi,
    private val secureStore: SecureStore,
    private val firebaseAuth: FirebaseAuth
) {
    
    val currentFirebaseUser get() = firebaseAuth.currentUser
    
    /**
     * Sign up with email and password
     */
    suspend fun signUp(request: SignUpRequest): Result<AuthResponse> {
        return try {
            // First create Firebase user
            val firebaseResult = firebaseAuth.createUserWithEmailAndPassword(
                request.email ?: throw IllegalArgumentException("Email required"),
                request.password ?: throw IllegalArgumentException("Password required")
            ).await()
            
            // Then register with backend
            val response = api.signUp(request)
            if (response.isSuccessful && response.body() != null) {
                val authResponse = response.body()!!
                saveTokens(authResponse)
                Result.success(authResponse)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Sign up failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Sign in with email and password
     */
    suspend fun signIn(request: SignInRequest): Result<AuthResponse> {
        return try {
            // Sign in with Firebase first
            if (request.email != null && request.password != null) {
                firebaseAuth.signInWithEmailAndPassword(request.email, request.password).await()
            }
            
            // Then authenticate with backend
            val response = api.signIn(request)
            if (response.isSuccessful && response.body() != null) {
                val authResponse = response.body()!!
                saveTokens(authResponse)
                Result.success(authResponse)
            } else {
                Result.failure(Exception(response.errorBody()?.string() ?: "Sign in failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Sign in with Google
     */
    suspend fun signInWithGoogle(idToken: String): Result<AuthResponse> {
        return try {
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            val firebaseResult = firebaseAuth.signInWithCredential(credential).await()
            
            // Get Firebase ID token for backend
            val firebaseToken = firebaseResult.user?.getIdToken(false)?.await()?.token
            
            // Authenticate with backend using Firebase token
            val request = SignInRequest(
                email = firebaseResult.user?.email,
                password = null,
                phone = null,
                otp = firebaseToken // Send Firebase token as OTP for verification
            )
            
            val response = api.signIn(request)
            if (response.isSuccessful && response.body() != null) {
                val authResponse = response.body()!!
                saveTokens(authResponse)
                Result.success(authResponse)
            } else {
                Result.failure(Exception("Google sign in failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Send OTP to phone number
     */
    suspend fun sendOtp(phoneNumber: String): Result<Unit> {
        return try {
            val response = api.sendOtp(OtpRequest(phoneNumber))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to send OTP"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Verify OTP
     */
    suspend fun verifyOtp(phoneNumber: String, otp: String): Result<AuthResponse> {
        return try {
            val response = api.verifyOtp(OtpVerifyRequest(phoneNumber, otp))
            if (response.isSuccessful && response.body() != null) {
                val authResponse = response.body()!!
                saveTokens(authResponse)
                Result.success(authResponse)
            } else {
                Result.failure(Exception("OTP verification failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Get current user from backend
     */
    suspend fun getCurrentUser(): Result<User> {
        return try {
            val response = api.getCurrentUser()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to get user"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Update user profile
     */
    suspend fun updateUser(userId: String, request: UpdateUserRequest): Result<User> {
        return try {
            val response = api.updateUser(userId, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to update user"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Refresh access token
     */
    suspend fun refreshToken(): Result<AuthResponse> {
        return try {
            val refreshToken = secureStore.getString("refresh_token")
                ?: return Result.failure(Exception("No refresh token"))
            
            val response = api.refreshToken(RefreshTokenRequest(refreshToken))
            if (response.isSuccessful && response.body() != null) {
                val authResponse = response.body()!!
                saveTokens(authResponse)
                Result.success(authResponse)
            } else {
                clearTokens()
                Result.failure(Exception("Token refresh failed"))
            }
        } catch (e: Exception) {
            clearTokens()
            Result.failure(e)
        }
    }
    
    /**
     * Sign out
     */
    suspend fun signOut(): Result<Unit> {
        return try {
            api.signOut()
            firebaseAuth.signOut()
            clearTokens()
            Result.success(Unit)
        } catch (e: Exception) {
            clearTokens()
            Result.success(Unit) // Still consider sign out successful
        }
    }
    
    /**
     * Update online status
     */
    suspend fun updateOnlineStatus(isOnline: Boolean): Result<Unit> {
        return try {
            val response = api.updateOnlineStatus(OnlineStatusRequest(isOnline))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to update status"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Check if user is logged in
     */
    fun isLoggedIn(): Boolean {
        return secureStore.getString("access_token") != null && firebaseAuth.currentUser != null
    }
    
    /**
     * Get current user ID
     */
    fun getCurrentUserId(): String? {
        return secureStore.getString("user_id")
    }
    
    /**
     * Get access token
     */
    fun getAccessToken(): String? {
        return secureStore.getString("access_token")
    }
    
    private fun saveTokens(response: AuthResponse) {
        secureStore.putString("access_token", response.accessToken)
        secureStore.putString("refresh_token", response.refreshToken)
        secureStore.putString("user_id", response.user.id)
        secureStore.putLong("token_expires_at", System.currentTimeMillis() + (response.expiresIn * 1000))
    }
    
    private fun clearTokens() {
        secureStore.remove("access_token")
        secureStore.remove("refresh_token")
        secureStore.remove("user_id")
        secureStore.remove("token_expires_at")
    }
}
