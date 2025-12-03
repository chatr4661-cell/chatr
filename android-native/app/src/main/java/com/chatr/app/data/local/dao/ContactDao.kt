package com.chatr.app.data.local.dao

import androidx.room.*
import com.chatr.app.data.local.entity.ContactEntity

@Dao
interface ContactDao {
    
    @Query("SELECT * FROM contacts ORDER BY contactName ASC")
    suspend fun getAllContacts(): List<ContactEntity>
    
    @Query("SELECT * FROM contacts WHERE isRegistered = 1 ORDER BY contactName ASC")
    suspend fun getRegisteredContacts(): List<ContactEntity>
    
    @Query("SELECT * FROM contacts WHERE id = :contactId")
    suspend fun getContactById(contactId: String): ContactEntity?
    
    @Query("SELECT * FROM contacts WHERE contactPhone = :phone")
    suspend fun getContactByPhone(phone: String): ContactEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(contact: ContactEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(contacts: List<ContactEntity>)
    
    @Query("DELETE FROM contacts WHERE id = :contactId")
    suspend fun deleteById(contactId: String)
    
    @Query("DELETE FROM contacts")
    suspend fun deleteAll()
    
    @Query("UPDATE contacts SET isOnline = :isOnline WHERE contactUserId = :userId")
    suspend fun updateOnlineStatus(userId: String, isOnline: Boolean)
    
    @Query("SELECT * FROM contacts WHERE contactName LIKE '%' || :query || '%' OR contactPhone LIKE '%' || :query || '%'")
    suspend fun searchContacts(query: String): List<ContactEntity>
}
