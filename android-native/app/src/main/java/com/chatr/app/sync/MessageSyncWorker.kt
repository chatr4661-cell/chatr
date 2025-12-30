package com.chatr.app.sync

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.chatr.app.data.api.GetMessagesRequest
import com.chatr.app.data.api.SupabaseRestApi
import com.chatr.app.data.local.dao.MessageDao
import com.chatr.app.data.local.dao.PendingMessageDao
import com.chatr.app.data.local.entity.MessageEntity
import com.chatr.app.data.local.entity.SyncStatus
import com.chatr.app.security.SecureStore
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * WorkManager worker for background message synchronization
 * 
 * Uses SupabaseRestApi which calls the correct REST/RPC endpoints:
 * - /rest/v1/rpc/get_user_conversations
 * - /rest/v1/rpc/get_conversation_messages
 * 
 * This fixes the HTTP 405 error caused by using edge functions URL for RPC calls.
 */
@HiltWorker
class MessageSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val restApi: SupabaseRestApi,
    private val messageDao: MessageDao,
    private val pendingMessageDao: PendingMessageDao,
    private val secureStore: SecureStore
) : CoroutineWorker(context, workerParams) {
    
    companion object {
        const val TAG = "MessageSyncWorker"
        const val WORK_NAME = "message_sync"
        const val WORK_NAME_PERIODIC = "message_sync_periodic"
        
        private const val MAX_RETRY_COUNT = 5
        
        /**
         * Schedule one-time sync
         */
        fun scheduleOneTimeSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            
            val request = OneTimeWorkRequestBuilder<MessageSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .addTag(WORK_NAME)
                .build()
            
            WorkManager.getInstance(context)
                .enqueueUniqueWork(
                    WORK_NAME,
                    ExistingWorkPolicy.REPLACE,
                    request
                )
        }
        
        /**
         * Schedule periodic sync (every 15 minutes)
         */
        fun schedulePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()
            
            val request = PeriodicWorkRequestBuilder<MessageSyncWorker>(
                15, TimeUnit.MINUTES,
                5, TimeUnit.MINUTES // Flex interval
            )
                .setConstraints(constraints)
                .addTag(WORK_NAME_PERIODIC)
                .build()
            
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME_PERIODIC,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )
        }
        
        /**
         * Cancel all sync work
         */
        fun cancelAllSync(context: Context) {
            WorkManager.getInstance(context).cancelAllWorkByTag(WORK_NAME)
            WorkManager.getInstance(context).cancelAllWorkByTag(WORK_NAME_PERIODIC)
        }
    }
    
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.d(TAG, "Starting message sync...")
        
        // Check if authenticated
        val accessToken = secureStore.getString("access_token")
        if (accessToken.isNullOrBlank()) {
            Log.w(TAG, "Not authenticated, skipping sync")
            return@withContext Result.success()
        }
        
        try {
            // Step 1: Upload pending messages
            val uploadResult = uploadPendingMessages()
            if (!uploadResult) {
                Log.w(TAG, "Some pending messages failed to upload")
            }
            
            // Step 2: Download new messages
            val downloadResult = downloadNewMessages()
            if (!downloadResult) {
                Log.w(TAG, "Failed to download new messages")
            }
            
            // Step 3: Update message statuses
            updateMessageStatuses()
            
            Log.d(TAG, "Message sync completed successfully")
            Result.success()
            
        } catch (e: Exception) {
            Log.e(TAG, "Message sync failed", e)
            
            if (runAttemptCount < MAX_RETRY_COUNT) {
                Result.retry()
            } else {
                Result.failure(
                    workDataOf("error" to e.message)
                )
            }
        }
    }
    
    /**
     * Upload all pending messages to server
     */
    private suspend fun uploadPendingMessages(): Boolean {
        val pendingMessages = pendingMessageDao.getAllPending()
        Log.d(TAG, "Found ${pendingMessages.size} pending messages to upload")
        
        var allSuccess = true
        
        for (pending in pendingMessages) {
            try {
                if (pending.retryCount >= MAX_RETRY_COUNT) {
                    Log.w(TAG, "Message ${pending.id} exceeded max retries, marking as failed")
                    messageDao.updateSyncStatus(pending.id, SyncStatus.FAILED)
                    pendingMessageDao.delete(pending.id)
                    continue
                }
                
                // Use REST API to insert message
                val request = com.chatr.app.data.api.InsertMessageRequest(
                    conversation_id = pending.conversationId,
                    sender_id = secureStore.getString("user_id") ?: "",
                    content = pending.content,
                    message_type = pending.messageType
                )
                
                val response = restApi.insertMessage(request)
                
                if (response.isSuccessful && response.body()?.isNotEmpty() == true) {
                    Log.d(TAG, "Successfully uploaded message ${pending.id}")
                    
                    // Update local message with synced status
                    messageDao.updateSyncStatus(pending.id, SyncStatus.SYNCED)
                    
                    // Remove from pending queue
                    pendingMessageDao.delete(pending.id)
                } else {
                    Log.w(TAG, "Failed to upload message ${pending.id}: ${response.code()} - ${response.errorBody()?.string()}")
                    pendingMessageDao.incrementRetry(pending.id)
                    allSuccess = false
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Error uploading message ${pending.id}", e)
                pendingMessageDao.incrementRetry(pending.id)
                allSuccess = false
            }
        }
        
        return allSuccess
    }
    
    /**
     * Download new messages from server using RPC functions
     */
    private suspend fun downloadNewMessages(): Boolean {
        try {
            // Get conversations using the RPC endpoint
            val response = restApi.getConversations()
            
            if (!response.isSuccessful) {
                Log.w(TAG, "Failed to get conversations: ${response.code()}")
                return false
            }
            
            val conversations = response.body() ?: return true
            Log.d(TAG, "Found ${conversations.size} conversations to sync")
            
            for (conversation in conversations) {
                try {
                    // Get messages using the RPC endpoint
                    val messagesRequest = GetMessagesRequest(
                        p_conversation_id = conversation.conversation_id,
                        p_limit = 50
                    )
                    
                    val messagesResponse = restApi.getMessages(messagesRequest)
                    
                    if (messagesResponse.isSuccessful) {
                        messagesResponse.body()?.forEach { serverMessage ->
                            // Convert and insert
                            val localMessage = MessageEntity(
                                id = serverMessage.messageId,
                                conversationId = conversation.conversation_id,
                                senderId = serverMessage.sender_id,
                                senderName = serverMessage.sender_name,
                                content = serverMessage.content,
                                timestamp = parseTimestamp(serverMessage.created_at),
                                type = serverMessage.message_type,
                                status = serverMessage.status,
                                replyTo = serverMessage.reply_to_id,
                                mediaUrl = serverMessage.media_url,
                                syncStatus = SyncStatus.SYNCED
                            )
                            messageDao.insertMessage(localMessage)
                        }
                        
                        Log.d(TAG, "Synced messages for conversation ${conversation.conversation_id}")
                    }
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error syncing conversation ${conversation.conversation_id}", e)
                }
            }
            
            return true
            
        } catch (e: Exception) {
            Log.e(TAG, "Error downloading messages", e)
            return false
        }
    }
    
    /**
     * Update delivery/read statuses
     */
    private suspend fun updateMessageStatuses() {
        try {
            // Get undelivered messages
            val pendingDelivery = messageDao.getPendingMessages(SyncStatus.PENDING)
            
            for (message in pendingDelivery) {
                // Check status on server
                // This would call an endpoint to check delivery status
                // For now, just mark as synced after successful upload
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error updating message statuses", e)
        }
    }
    
    private fun parseTimestamp(timestamp: String?): Long {
        if (timestamp.isNullOrBlank()) return System.currentTimeMillis()
        return try {
            java.time.Instant.parse(timestamp).toEpochMilli()
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }
}

/**
 * Worker for syncing contacts in background
 */
@HiltWorker
class ContactSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {
    
    companion object {
        const val TAG = "ContactSyncWorker"
        const val WORK_NAME = "contact_sync"
        
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()
            
            val request = PeriodicWorkRequestBuilder<ContactSyncWorker>(
                24, TimeUnit.HOURS, // Daily sync
                1, TimeUnit.HOURS
            )
                .setConstraints(constraints)
                .addTag(WORK_NAME)
                .build()
            
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )
        }
    }
    
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.d(TAG, "Starting contact sync...")
        
        try {
            // Read device contacts
            val deviceContacts = readDeviceContacts()
            Log.d(TAG, "Found ${deviceContacts.size} device contacts")
            
            // Contact sync would use Supabase RPC or REST API
            // For now, just log success
            Log.d(TAG, "Contact sync completed")
            Result.success()
            
        } catch (e: Exception) {
            Log.e(TAG, "Contact sync error", e)
            Result.retry()
        }
    }
    
    private fun readDeviceContacts(): List<Pair<String, String>> {
        val contacts = mutableListOf<Pair<String, String>>()
        
        try {
            val cursor = applicationContext.contentResolver.query(
                android.provider.ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(
                    android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER
                ),
                null, null, null
            )
            
            cursor?.use {
                val nameIndex = it.getColumnIndex(android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                val numberIndex = it.getColumnIndex(android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER)
                
                while (it.moveToNext()) {
                    val name = it.getString(nameIndex) ?: continue
                    val number = it.getString(numberIndex) ?: continue
                    
                    contacts.add(name to number.replace(Regex("[^0-9+]"), ""))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading contacts", e)
        }
        
        return contacts.distinctBy { it.second }
    }
}

/**
 * Worker for syncing stories/status
 */
@HiltWorker
class StorySyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {
    
    companion object {
        const val TAG = "StorySyncWorker"
        const val WORK_NAME = "story_sync"
        
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            
            val request = PeriodicWorkRequestBuilder<StorySyncWorker>(
                30, TimeUnit.MINUTES,
                5, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .addTag(WORK_NAME)
                .build()
            
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )
        }
    }
    
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.d(TAG, "Syncing stories...")
        
        try {
            // Story sync would use Supabase REST API
            // For now, just log success
            Log.d(TAG, "Story sync completed")
            Result.success()
            
        } catch (e: Exception) {
            Log.e(TAG, "Story sync failed", e)
            Result.retry()
        }
    }
}

/**
 * Initialize all background sync workers
 */
object SyncManager {
    fun initializeAllSync(context: Context) {
        // Message sync
        MessageSyncWorker.schedulePeriodicSync(context)
        
        // Contact sync
        ContactSyncWorker.schedule(context)
        
        // Story sync
        StorySyncWorker.schedule(context)
        
        Log.d("SyncManager", "All background sync workers initialized")
    }
    
    fun cancelAllSync(context: Context) {
        WorkManager.getInstance(context).cancelAllWork()
        Log.d("SyncManager", "All background sync workers cancelled")
    }
    
    fun triggerImmediateSync(context: Context) {
        MessageSyncWorker.scheduleOneTimeSync(context)
    }
}
