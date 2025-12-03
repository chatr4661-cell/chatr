package com.chatr.app.contacts

import android.Manifest
import android.content.ContentResolver
import android.content.Context
import android.content.pm.PackageManager
import android.provider.ContactsContract
import androidx.core.content.ContextCompat
import com.chatr.app.data.api.ContactInfo
import com.chatr.app.data.local.ChatrDatabase
import com.chatr.app.data.local.entity.ContactEntity
import com.chatr.app.data.repository.ContactsRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.security.MessageDigest
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Contact Sync Engine - Reads device contacts and syncs with CHATR backend
 * Identifies which contacts are registered on CHATR
 */
@Singleton
class ContactSyncEngine @Inject constructor(
    @ApplicationContext private val context: Context,
    private val contactsRepository: ContactsRepository,
    private val database: ChatrDatabase
) {
    
    private val contactDao get() = database.contactDao()
    
    /**
     * Check if contact permission is granted
     */
    fun hasContactPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    /**
     * Read all contacts from device
     */
    suspend fun readDeviceContacts(): List<DeviceContact> = withContext(Dispatchers.IO) {
        if (!hasContactPermission()) {
            return@withContext emptyList()
        }
        
        val contacts = mutableListOf<DeviceContact>()
        val contentResolver: ContentResolver = context.contentResolver
        
        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER,
            ContactsContract.CommonDataKinds.Phone.PHOTO_URI
        )
        
        val cursor = contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            projection,
            null,
            null,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
        )
        
        cursor?.use {
            val idIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
            val nameIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numberIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            val photoIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.PHOTO_URI)
            
            val seenNumbers = mutableSetOf<String>()
            
            while (it.moveToNext()) {
                val id = it.getString(idIndex) ?: continue
                val name = it.getString(nameIndex) ?: continue
                val number = it.getString(numberIndex)?.normalizePhoneNumber() ?: continue
                val photo = it.getString(photoIndex)
                
                // Skip duplicates
                if (seenNumbers.contains(number)) continue
                seenNumbers.add(number)
                
                contacts.add(DeviceContact(
                    id = id,
                    name = name,
                    phoneNumber = number,
                    photoUri = photo
                ))
            }
        }
        
        contacts
    }
    
    /**
     * Sync contacts with CHATR backend
     * Returns list of contacts that are registered on CHATR
     */
    suspend fun syncContacts(): Result<SyncResult> = withContext(Dispatchers.IO) {
        try {
            // Read device contacts
            val deviceContacts = readDeviceContacts()
            if (deviceContacts.isEmpty()) {
                return@withContext Result.success(SyncResult(0, 0, emptyList()))
            }
            
            // Prepare contacts for sync
            val contactInfos = deviceContacts.map { contact ->
                ContactInfo(
                    name = contact.name,
                    phoneNumber = contact.phoneNumber,
                    email = null
                )
            }
            
            // Sync with backend
            val result = contactsRepository.syncContacts(contactInfos)
            
            result.fold(
                onSuccess = { registeredUsers ->
                    // Create map of registered phone numbers to user data
                    val registeredMap = registeredUsers.associateBy { 
                        it.phoneNumber?.normalizePhoneNumber() 
                    }
                    
                    // Update local database
                    val entities = deviceContacts.map { contact ->
                        val registeredUser = registeredMap[contact.phoneNumber]
                        ContactEntity(
                            id = contact.id,
                            userId = "", // Will be set by backend
                            contactUserId = registeredUser?.id,
                            contactName = contact.name,
                            contactPhone = contact.phoneNumber,
                            isRegistered = registeredUser != null,
                            avatarUrl = registeredUser?.avatarUrl ?: contact.photoUri,
                            isOnline = registeredUser?.isOnline ?: false
                        )
                    }
                    
                    contactDao.deleteAll()
                    contactDao.insertAll(entities)
                    
                    val registeredContacts = entities.filter { it.isRegistered }
                    
                    Result.success(SyncResult(
                        totalContacts = deviceContacts.size,
                        registeredCount = registeredContacts.size,
                        registeredContacts = registeredContacts.map { it.toContact() }
                    ))
                },
                onFailure = { error ->
                    Result.failure(error)
                }
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Get cached contacts from local database
     */
    suspend fun getCachedContacts() = contactDao.getAllContacts().map { it.toContact() }
    
    /**
     * Get only registered CHATR contacts
     */
    suspend fun getRegisteredContacts() = contactDao.getRegisteredContacts().map { it.toContact() }
    
    /**
     * Search contacts locally
     */
    suspend fun searchContacts(query: String) = contactDao.searchContacts(query).map { it.toContact() }
    
    /**
     * Hash a phone number for privacy-preserving sync
     */
    fun hashPhoneNumber(phoneNumber: String): String {
        val normalized = phoneNumber.normalizePhoneNumber()
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(normalized.toByteArray())
        return hash.joinToString("") { "%02x".format(it) }
    }
    
    private fun String.normalizePhoneNumber(): String {
        return this.replace(Regex("[^0-9+]"), "")
            .let { if (it.startsWith("+")) it else "+91$it" } // Default to India
    }
}

data class DeviceContact(
    val id: String,
    val name: String,
    val phoneNumber: String,
    val photoUri: String? = null
)

data class SyncResult(
    val totalContacts: Int,
    val registeredCount: Int,
    val registeredContacts: List<com.chatr.app.data.api.Contact>
)
