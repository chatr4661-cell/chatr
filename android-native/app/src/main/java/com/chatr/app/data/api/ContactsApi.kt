package com.chatr.app.data.api

import com.chatr.app.data.models.User
import retrofit2.Response
import retrofit2.http.*

interface ContactsApi {
    
    @POST("contacts/sync")
    suspend fun syncContacts(@Body contacts: List<ContactInfo>): Response<List<User>>
    
    @GET("contacts")
    suspend fun getContacts(): Response<List<ContactResponse>>
    
    @POST("contacts/block")
    suspend fun blockContact(@Body request: BlockContactRequest): Response<Unit>
    
    @DELETE("contacts/block/{userId}")
    suspend fun unblockContact(@Path("userId") userId: String): Response<Unit>
    
    @GET("contacts/blocked")
    suspend fun getBlockedContacts(): Response<List<ContactResponse>>
}

// Request/Response models
data class ContactInfo(
    val name: String,
    val phoneNumber: String?,
    val email: String?
)

// Response model - renamed to avoid conflict with domain Contact
data class ContactResponse(
    val id: String,
    val userId: String,
    val contactUserId: String?,
    val contactName: String,
    val contactPhone: String?,
    val isRegistered: Boolean = false,
    val avatarUrl: String? = null,
    val isOnline: Boolean = false
)

data class BlockContactRequest(val userId: String)
