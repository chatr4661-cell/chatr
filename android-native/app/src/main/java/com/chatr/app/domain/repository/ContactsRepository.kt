package com.chatr.app.domain.repository

import com.chatr.app.domain.model.Contact
import com.chatr.app.domain.model.DeviceContact
import kotlinx.coroutines.flow.Flow

/**
 * Contacts repository interface
 * Device contacts + CHATR user matching
 */
interface ContactsRepository {
    
    /**
     * Get all contacts (device + CHATR matched)
     */
    fun getContacts(): Flow<List<Contact>>
    
    /**
     * Get contacts that are on CHATR
     */
    fun getChatrContacts(): Flow<List<Contact>>
    
    /**
     * Get contacts not on CHATR (for invite)
     */
    fun getNonChatrContacts(): Flow<List<Contact>>
    
    /**
     * Sync device contacts
     */
    suspend fun syncDeviceContacts(): Result<Int>
    
    /**
     * Search contacts
     */
    fun searchContacts(query: String): Flow<List<Contact>>
    
    /**
     * Get device contacts raw
     */
    suspend fun getDeviceContacts(): List<DeviceContact>
    
    /**
     * Match device contacts with CHATR users
     */
    suspend fun matchContactsWithChatrUsers(
        phoneNumbers: List<String>
    ): Result<Map<String, String>>
    
    /**
     * Toggle favorite
     */
    suspend fun toggleFavorite(contactId: String, isFavorite: Boolean): Result<Unit>
    
    /**
     * Block contact
     */
    suspend fun blockContact(contactId: String): Result<Unit>
    
    /**
     * Unblock contact
     */
    suspend fun unblockContact(contactId: String): Result<Unit>
    
    /**
     * Get blocked contacts
     */
    fun getBlockedContacts(): Flow<List<Contact>>
}
