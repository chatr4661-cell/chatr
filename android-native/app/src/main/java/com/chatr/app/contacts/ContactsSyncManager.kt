package com.chatr.app.contacts

import android.content.Context
import android.provider.ContactsContract
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.security.MessageDigest
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContactsSyncManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    fun schedulePeriodicSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val syncRequest = PeriodicWorkRequestBuilder<ContactsSyncWorker>(
            12, TimeUnit.HOURS
        )
            .setConstraints(constraints)
            .build()
        
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(
                "contacts_sync",
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )
    }
    
    suspend fun syncContacts(): SyncResult = withContext(Dispatchers.IO) {
        try {
            val contacts = readContacts()
            val normalizedContacts = normalizeContacts(contacts)
            val hashedContacts = hashContacts(normalizedContacts)
            
            uploadContacts(hashedContacts)
            
            SyncResult.Success(normalizedContacts.size)
        } catch (e: Exception) {
            SyncResult.Error(e.message ?: "Unknown error")
        }
    }
    
    private fun readContacts(): List<RawContact> {
        val contacts = mutableListOf<RawContact>()
        val cursor = context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER,
                ContactsContract.CommonDataKinds.Phone.CONTACT_ID
            ),
            null,
            null,
            null
        )
        
        cursor?.use {
            val nameIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numberIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            val idIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
            
            while (it.moveToNext()) {
                val name = it.getString(nameIndex) ?: ""
                val number = it.getString(numberIndex) ?: continue
                val id = it.getString(idIndex) ?: continue
                
                contacts.add(RawContact(id, name, number))
            }
        }
        
        return contacts
    }
    
    private fun normalizeContacts(contacts: List<RawContact>): List<NormalizedContact> {
        val normalized = mutableListOf<NormalizedContact>()
        val seen = mutableSetOf<String>()
        
        for (contact in contacts) {
            val normalizedPhone = normalizePhoneNumber(contact.phone)
            
            // Deduplicate by normalized phone
            if (normalizedPhone.isNotEmpty() && !seen.contains(normalizedPhone)) {
                seen.add(normalizedPhone)
                normalized.add(
                    NormalizedContact(
                        name = contact.name,
                        phoneNormalized = normalizedPhone
                    )
                )
            }
        }
        
        return normalized
    }
    
    private fun normalizePhoneNumber(phone: String): String {
        // Remove all non-digit characters
        val digits = phone.filter { it.isDigit() }
        
        // Remove leading country code if present
        return when {
            digits.startsWith("1") && digits.length == 11 -> digits.substring(1)
            digits.length >= 10 -> digits.takeLast(10)
            else -> digits
        }
    }
    
    private fun hashContacts(contacts: List<NormalizedContact>): List<HashedContact> {
        return contacts.map { contact ->
            HashedContact(
                nameHash = hashString(contact.name),
                phoneHash = hashString(contact.phoneNormalized)
            )
        }
    }
    
    private fun hashString(input: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }
    
    private fun uploadContacts(contacts: List<HashedContact>) {
        // Upload to backend
        val json = Json.encodeToString(contacts)
        // Make API call to backend
        // Implementation would use Ktor client
    }
}

@HiltWorker
class ContactsSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val contactsSyncManager: ContactsSyncManager
) : CoroutineWorker(context, workerParams) {
    
    override suspend fun doWork(): Result {
        return when (val result = contactsSyncManager.syncContacts()) {
            is SyncResult.Success -> Result.success()
            is SyncResult.Error -> Result.retry()
        }
    }
}

@Serializable
data class RawContact(
    val id: String,
    val name: String,
    val phone: String
)

@Serializable
data class NormalizedContact(
    val name: String,
    val phoneNormalized: String
)

@Serializable
data class HashedContact(
    val nameHash: String,
    val phoneHash: String
)

sealed class SyncResult {
    data class Success(val count: Int) : SyncResult()
    data class Error(val message: String) : SyncResult()
}
