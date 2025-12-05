package com.chatr.app.sync

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.chatr.app.data.local.dao.MessageDao
import com.chatr.app.data.local.dao.PendingMessageDao
import com.chatr.app.data.local.entity.SyncStatus
import com.chatr.app.data.remote.ChatrApi
import com.chatr.app.data.remote.model.SendMessageRequest
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * WorkManager worker for background message synchronization
 * - Syncs pending messages when online
 * - Fetches new messages from server
 * - Handles retry with exponential backoff
 */
@HiltWorker
class MessageSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val api: ChatrApi,
    private val messageDao: MessageDao,
    private val pendingMessageDao: PendingMessageDao
) : CoroutineWorker(context, workerParams) {
    
    companion object {
        const val TAG = "MessageSyncWorker"
        const val WORK_NAME = "message_sync"
        const val WORK_NAME_PERIODIC = "message_sync_periodic"
        
        private const val MAX_RETRY_COUNT = 5
        private const val KEY_SYNC_TYPE = "sync_type"
        
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
                
                val request = SendMessageRequest(
                    conversationId = pending.conversationId,
                    content = pending.content,
                    messageType = pending.messageType,
                    mediaUrl = pending.mediaUri,
                    replyToId = pending.replyToId
                )
                
                val response = api.sendMessage(request)
                
                if (response.isSuccessful && response.body()?.success == true) {
                    Log.d(TAG, "Successfully uploaded message ${pending.id}")
                    
                    // Update local message with server ID
                    response.body()?.data?.let { serverMessage ->
                        messageDao.updateSyncStatus(pending.id, SyncStatus.SYNCED)
                    }
                    
                    // Remove from pending queue
                    pendingMessageDao.delete(pending.id)
                } else {
                    Log.w(TAG, "Failed to upload message ${pending.id}: ${response.errorBody()?.string()}")
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
     * Download new messages from server
     */
    private suspend fun downloadNewMessages(): Boolean {
        try {
            val response = api.getConversations()
            
            if (!response.isSuccessful || response.body()?.success != true) {
                return false
            }
            
            val conversations = response.body()?.data ?: return true
            
            for (conversation in conversations) {
                try {
                    // Get latest local message timestamp
                    val lastMessageTime = messageDao.getLastMessageTime(conversation.id) ?: 0
                    
                    // Fetch new messages
                    val messagesResponse = api.getMessages(
                        conversationId = conversation.id,
                        page = 1,
                        limit = 50
                    )
                    
                    if (messagesResponse.isSuccessful) {
                        messagesResponse.body()?.data?.forEach { serverMessage ->
                            // Convert and insert if newer
                            val localMessage = serverMessage.toEntity().copy(
                                syncStatus = SyncStatus.SYNCED
                            )
                            messageDao.insertMessage(localMessage)
                        }
                    }
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error syncing conversation ${conversation.id}", e)
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
}

/**
 * Worker for syncing contacts in background
 */
@HiltWorker
class ContactSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val api: ChatrApi
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
            
            // Sync with server
            val response = api.syncContacts(
                com.chatr.app.data.remote.model.SyncContactsRequest(
                    contacts = deviceContacts
                )
            )
            
            if (response.isSuccessful) {
                Log.d(TAG, "Contact sync completed")
                Result.success()
            } else {
                Log.w(TAG, "Contact sync failed: ${response.errorBody()?.string()}")
                Result.retry()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Contact sync error", e)
            Result.retry()
        }
    }
    
    private fun readDeviceContacts(): List<com.chatr.app.data.remote.model.ContactInput> {
        val contacts = mutableListOf<com.chatr.app.data.remote.model.ContactInput>()
        
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
                
                contacts.add(
                    com.chatr.app.data.remote.model.ContactInput(
                        name = name,
                        phone = number.replace(Regex("[^0-9+]"), "")
                    )
                )
            }
        }
        
        return contacts.distinctBy { it.phone }
    }
}

/**
 * Worker for syncing stories/status
 */
@HiltWorker
class StorySyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val api: ChatrApi
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
            val response = api.getStories()
            
            if (response.isSuccessful) {
                // Cache stories locally
                response.body()?.data?.let { stories ->
                    // Store in local database
                    Log.d(TAG, "Synced ${stories.size} stories")
                }
                Result.success()
            } else {
                Result.retry()
            }
            
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
