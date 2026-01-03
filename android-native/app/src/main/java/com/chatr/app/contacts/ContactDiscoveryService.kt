package com.chatr.app.contacts

import android.content.Context
import android.util.Log
import androidx.work.*
import com.chatr.app.data.local.ChatrDatabase
import com.chatr.app.data.local.entity.ContactEntity
import com.chatr.app.security.SecureStore
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * ContactDiscoveryService - Complete "Who's on CHATR" implementation
 * 
 * CRITICAL FOR GSM REPLACEMENT:
 * This enables users to find their contacts on CHATR,
 * similar to WhatsApp/Telegram contact discovery.
 * 
 * Flow:
 * 1. Read device contacts with permission
 * 2. Hash phone numbers (privacy-preserving)
 * 3. Send hashes to backend
 * 4. Backend returns matching user IDs
 * 5. Store in local DB as "registered" contacts
 */
@Singleton
class ContactDiscoveryService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val contactSyncEngine: ContactSyncEngine,
    private val database: ChatrDatabase,
    private val secureStore: SecureStore,
    private val okHttpClient: OkHttpClient
) {
    companion object {
        private const val TAG = "ContactDiscovery"
        private const val SUPABASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co"
        private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw"
    }
    
    private val contactDao get() = database.contactDao()
    private val json = Json { ignoreUnknownKeys = true }
    
    /**
     * Discover which device contacts are on CHATR
     * Returns (total, registered, invitable) counts
     */
    suspend fun discoverContacts(): DiscoveryResult = withContext(Dispatchers.IO) {
        try {
            if (!contactSyncEngine.hasContactPermission()) {
                return@withContext DiscoveryResult.NoPermission
            }
            
            Log.d(TAG, "📱 Starting contact discovery...")
            
            // Step 1: Read device contacts
            val deviceContacts = contactSyncEngine.readDeviceContacts()
            if (deviceContacts.isEmpty()) {
                return@withContext DiscoveryResult.Success(0, 0, emptyList(), emptyList())
            }
            
            Log.d(TAG, "📱 Found ${deviceContacts.size} device contacts")
            
            // Step 2: Hash phone numbers for privacy
            val phoneHashes = deviceContacts.associate { contact ->
                contactSyncEngine.hashPhoneNumber(contact.phoneNumber) to contact
            }
            
            // Step 3: Query backend for registered users
            val accessToken = secureStore.getString("access_token")
            val registeredUsers = queryRegisteredUsers(phoneHashes.keys.toList(), accessToken)
            
            Log.d(TAG, "✅ Found ${registeredUsers.size} registered CHATR users")
            
            // Step 4: Create contact entities
            val registeredEntities = mutableListOf<ContactEntity>()
            val invitableEntities = mutableListOf<ContactEntity>()
            
            val currentUserId = secureStore.getString("user_id") ?: ""
            
            for ((hash, contact) in phoneHashes) {
                val registeredUser = registeredUsers.find { it.phoneHash == hash }
                
                val entity = ContactEntity(
                    id = contact.id,
                    userId = currentUserId,
                    contactUserId = registeredUser?.userId,
                    contactName = contact.name,
                    contactPhone = contact.phoneNumber,
                    isRegistered = registeredUser != null,
                    avatarUrl = registeredUser?.avatarUrl ?: contact.photoUri,
                    isOnline = registeredUser?.isOnline ?: false,
                    lastSeen = registeredUser?.lastSeen
                )
                
                if (registeredUser != null) {
                    registeredEntities.add(entity)
                } else {
                    invitableEntities.add(entity)
                }
            }
            
            // Step 5: Save to local database
            contactDao.deleteAll()
            contactDao.insertAll(registeredEntities + invitableEntities)
            
            Log.d(TAG, "✅ Contact discovery complete: ${registeredEntities.size} on CHATR, ${invitableEntities.size} to invite")
            
            DiscoveryResult.Success(
                totalContacts = deviceContacts.size,
                registeredCount = registeredEntities.size,
                registeredContacts = registeredEntities.map { it.toContact() },
                invitableContacts = invitableEntities.map { it.toContact() }
            )
            
        } catch (e: Exception) {
            Log.e(TAG, "Contact discovery failed", e)
            DiscoveryResult.Error(e.message ?: "Unknown error")
        }
    }
    
    /**
     * Query backend for which phone hashes are registered
     */
    private suspend fun queryRegisteredUsers(
        phoneHashes: List<String>,
        accessToken: String?
    ): List<RegisteredUser> {
        return try {
            val requestBody = json.encodeToString(PhoneHashRequest(phoneHashes))
            
            val request = Request.Builder()
                .url("$SUPABASE_URL/functions/v1/contact-discovery")
                .addHeader("Authorization", "Bearer ${accessToken ?: SUPABASE_ANON_KEY}")
                .addHeader("apikey", SUPABASE_ANON_KEY)
                .addHeader("Content-Type", "application/json")
                .post(requestBody.toRequestBody("application/json".toMediaType()))
                .build()
            
            val response = okHttpClient.newCall(request).execute()
            
            if (response.isSuccessful) {
                val body = response.body?.string() ?: "[]"
                json.decodeFromString<List<RegisteredUser>>(body)
            } else {
                Log.w(TAG, "Contact discovery API returned ${response.code}")
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error querying registered users", e)
            emptyList()
        }
    }
    
    /**
     * Get contacts grouped by status
     */
    suspend fun getGroupedContacts(): GroupedContacts = withContext(Dispatchers.IO) {
        val registered = contactDao.getRegisteredContacts().map { it.toContact() }
        val invitable = contactDao.getInvitableContacts().map { it.toContact() }
        
        GroupedContacts(
            onChatr = registered.sortedBy { it.name },
            invite = invitable.sortedBy { it.name }
        )
    }
    
    /**
     * Search contacts
     */
    suspend fun searchContacts(query: String): GroupedContacts = withContext(Dispatchers.IO) {
        val results = contactDao.searchContacts(query).map { it.toContact() }
        
        GroupedContacts(
            onChatr = results.filter { it.isRegistered }.sortedBy { it.name },
            invite = results.filter { !it.isRegistered }.sortedBy { it.name }
        )
    }
    
    /**
     * Schedule periodic contact sync
     */
    fun schedulePeriodicSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val syncRequest = PeriodicWorkRequestBuilder<ContactDiscoveryWorker>(
            6, TimeUnit.HOURS
        )
            .setConstraints(constraints)
            .setInitialDelay(1, TimeUnit.MINUTES)
            .build()
        
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(
                "contact_discovery",
                ExistingPeriodicWorkPolicy.UPDATE,
                syncRequest
            )
        
        Log.d(TAG, "📅 Scheduled periodic contact discovery")
    }
    
    /**
     * Generate invite link for a contact
     */
    fun generateInviteLink(contactName: String): String {
        return "https://chatr.chat/invite?ref=${secureStore.getString("user_id")}"
    }
    
    /**
     * Generate invite message
     */
    fun generateInviteMessage(contactName: String): String {
        return "Hey $contactName! Let's chat on CHATR - it's faster and more secure than SMS. Get it free: ${generateInviteLink(contactName)}"
    }
}

@Serializable
data class PhoneHashRequest(val phoneHashes: List<String>)

@Serializable
data class RegisteredUser(
    val phoneHash: String,
    val userId: String,
    val avatarUrl: String? = null,
    val isOnline: Boolean = false,
    val lastSeen: Long? = null
)

data class GroupedContacts(
    val onChatr: List<com.chatr.app.data.api.Contact>,
    val invite: List<com.chatr.app.data.api.Contact>
)

sealed class DiscoveryResult {
    data class Success(
        val totalContacts: Int,
        val registeredCount: Int,
        val registeredContacts: List<com.chatr.app.data.api.Contact>,
        val invitableContacts: List<com.chatr.app.data.api.Contact>
    ) : DiscoveryResult()
    
    object NoPermission : DiscoveryResult()
    data class Error(val message: String) : DiscoveryResult()
}

/**
 * WorkManager worker for periodic contact discovery
 */
@androidx.hilt.work.HiltWorker
class ContactDiscoveryWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val contactDiscoveryService: ContactDiscoveryService
) : CoroutineWorker(context, workerParams) {
    
    override suspend fun doWork(): Result {
        return when (val result = contactDiscoveryService.discoverContacts()) {
            is DiscoveryResult.Success -> Result.success()
            is DiscoveryResult.NoPermission -> Result.failure()
            is DiscoveryResult.Error -> Result.retry()
        }
    }
}
