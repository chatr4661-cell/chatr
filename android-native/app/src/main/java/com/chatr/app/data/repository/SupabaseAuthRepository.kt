package com.chatr.app.data.repository

import com.chatr.app.data.model.*
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.gotrue.providers.builtin.Phone
import io.github.jan.supabase.gotrue.user.UserInfo
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Supabase Auth Repository
 * 
 * Handles all authentication operations using Supabase SDK
 */
@Singleton
class SupabaseAuthRepository @Inject constructor(
    private val auth: Auth,
    private val postgrest: Postgrest
) {
    
    /**
     * Sign up with email and password
     */
    suspend fun signUpWithEmail(email: String, password: String): Result<UserInfo> {
        return try {
            auth.signUpWith(Email) {
                this.email = email
                this.password = password
            }
            val user = auth.currentUserOrNull()
            if (user != null) {
                Result.success(user)
            } else {
                Result.failure(Exception("Sign up failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Sign in with email and password
     */
    suspend fun signInWithEmail(email: String, password: String): Result<UserInfo> {
        return try {
            auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            val user = auth.currentUserOrNull()
            if (user != null) {
                Result.success(user)
            } else {
                Result.failure(Exception("Sign in failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Sign in with phone number (OTP)
     */
    suspend fun signInWithPhone(phoneNumber: String): Result<Unit> {
        return try {
            auth.signInWith(Phone) {
                this.phone = phoneNumber
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Verify OTP for phone auth
     */
    suspend fun verifyOtp(phoneNumber: String, otp: String): Result<UserInfo> {
        return try {
            auth.verifyPhoneOtp(
                type = io.github.jan.supabase.gotrue.OtpType.Phone.SMS,
                phone = phoneNumber,
                token = otp
            )
            val user = auth.currentUserOrNull()
            if (user != null) {
                Result.success(user)
            } else {
                Result.failure(Exception("OTP verification failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Sign out current user
     */
    suspend fun signOut(): Result<Unit> {
        return try {
            auth.signOut()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Get current user
     */
    fun getCurrentUser(): UserInfo? {
        return auth.currentUserOrNull()
    }
    
    /**
     * Check if user is authenticated
     */
    fun isAuthenticated(): Boolean {
        return auth.currentUserOrNull() != null
    }
    
    /**
     * Get current session access token
     */
    suspend fun getAccessToken(): String? {
        return auth.currentSessionOrNull()?.accessToken
    }
    
    /**
     * Refresh session
     */
    suspend fun refreshSession(): Result<Unit> {
        return try {
            auth.refreshCurrentSession()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Get user profile from profiles table
     */
    suspend fun getProfile(userId: String): Result<Profile> {
        return try {
            val profile = postgrest.from("profiles")
                .select {
                    filter {
                        eq("id", userId)
                    }
                }
                .decodeSingle<Profile>()
            Result.success(profile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Update user profile
     */
    suspend fun updateProfile(userId: String, updates: ProfileUpdate): Result<Profile> {
        return try {
            postgrest.from("profiles")
                .update(updates) {
                    filter {
                        eq("id", userId)
                    }
                }
            getProfile(userId)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

@Serializable
data class Profile(
    val id: String,
    val username: String? = null,
    val email: String? = null,
    val phone_number: String? = null,
    val avatar_url: String? = null,
    val is_online: Boolean = false,
    val onboarding_completed: Boolean = false
)

@Serializable
data class ProfileUpdate(
    val username: String? = null,
    val avatar_url: String? = null,
    val phone_number: String? = null
)
