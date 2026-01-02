package com.chatr.app.domain.model

import kotlinx.serialization.Serializable

/**
 * Domain model for User
 * No Android dependencies - pure Kotlin
 */
@Serializable
data class User(
    val id: String,
    val phoneNumber: String,
    val displayName: String?,
    val avatarUrl: String?,
    val bio: String?,
    val isOnline: Boolean = false,
    val lastSeenAt: Long? = null,
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * Authenticated user with token
 */
@Serializable
data class AuthenticatedUser(
    val user: User,
    val accessToken: String,
    val refreshToken: String,
    val expiresAt: Long
)
