package com.chatr.app.domain.model

import kotlinx.serialization.Serializable

/**
 * Domain model for Contact (device contacts)
 */
@Serializable
data class Contact(
    val id: String,
    val phoneNumber: String,
    val displayName: String,
    val photoUri: String? = null,
    val chatrUserId: String? = null,
    val isOnChatr: Boolean = false,
    val isFavorite: Boolean = false,
    val lastContactedAt: Long? = null
)

/**
 * Device contact raw data
 */
data class DeviceContact(
    val id: String,
    val displayName: String,
    val phoneNumbers: List<String>,
    val photoUri: String? = null
)
