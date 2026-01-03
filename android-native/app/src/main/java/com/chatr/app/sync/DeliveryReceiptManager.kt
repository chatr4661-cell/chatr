package com.chatr.app.sync

import android.util.Log
import com.chatr.app.data.local.dao.MessageDao
import com.chatr.app.data.local.entity.SyncStatus
import com.chatr.app.security.SecureStore
import com.chatr.app.websocket.PresenceClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

/**
 * DeliveryReceiptManager - GSM-grade message delivery confirmation
 * 
 * CRITICAL FOR GSM REPLACEMENT:
 * This ensures senders KNOW their messages were delivered/read,
 * just like SMS delivery reports.
 * 
 * Flow:
 * 1. Message sent → status = "sent"
 * 2. Server receives → status = "delivered" → push to sender
 * 3. Recipient reads → status = "read" → push to sender
 * 
 * This closes the feedback loop that makes messaging feel reliable.
 */
@Singleton
class DeliveryReceiptManager @Inject constructor(
    private val messageDao: MessageDao,
    private val secureStore: SecureStore,
    private val presenceClient: PresenceClient,
    private val okHttpClient: OkHttpClient
) {
    companion object {
        private const val TAG = "DeliveryReceipt"
        private const val SUPABASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co"
        private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw"
    }
    
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    // Track pending delivery confirmations
    private val _pendingDeliveries = MutableStateFlow<Set<String>>(emptySet())
    val pendingDeliveries: StateFlow<Set<String>> = _pendingDeliveries.asStateFlow()
    
    /**
     * Report that a message was successfully delivered to this device
     * Called when we receive and store a new message
     */
    fun reportMessageDelivered(messageId: String, senderId: String) {
        scope.launch {
            try {
                Log.d(TAG, "📬 Reporting delivery for message: $messageId")
                
                val accessToken = secureStore.getString("access_token") ?: return@launch
                
                // Update message status in backend
                val bodyContent = """{"status": "delivered", "delivered_at": "${java.time.Instant.now()}"}"""
                
                val request = Request.Builder()
                    .url("$SUPABASE_URL/rest/v1/messages?id=eq.$messageId")
                    .addHeader("Authorization", "Bearer $accessToken")
                    .addHeader("apikey", SUPABASE_ANON_KEY)
                    .addHeader("Content-Type", "application/json")
                    .patch(bodyContent.toRequestBody("application/json".toMediaType()))
                    .build()
                
                val response = okHttpClient.newCall(request).execute()
                
                if (response.isSuccessful) {
                    Log.d(TAG, "📬 Delivery reported for $messageId")
                    
                    // Update local status
                    messageDao.updateStatus(messageId, "delivered")
                    
                    // Notify sender via realtime (they'll see the double-check mark)
                    notifySenderViaRealtime(senderId, messageId, "delivered")
                } else {
                    Log.w(TAG, "Failed to report delivery: ${response.code}")
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Error reporting delivery", e)
                // Queue for retry
                _pendingDeliveries.value = _pendingDeliveries.value + messageId
            }
        }
    }
    
    /**
     * Report that messages in a conversation were read
     * Called when user opens a chat
     */
    fun reportMessagesRead(conversationId: String, messageIds: List<String>) {
        scope.launch {
            try {
                Log.d(TAG, "👁 Reporting read for ${messageIds.size} messages in $conversationId")
                
                val accessToken = secureStore.getString("access_token") ?: return@launch
                val userId = secureStore.getString("user_id") ?: return@launch
                
                // Batch update - mark all messages as read
                for (messageId in messageIds) {
                    val bodyContent = """{"status": "read", "read_at": "${java.time.Instant.now()}"}"""
                    
                    val request = Request.Builder()
                        .url("$SUPABASE_URL/rest/v1/messages?id=eq.$messageId&sender_id=neq.$userId")
                        .addHeader("Authorization", "Bearer $accessToken")
                        .addHeader("apikey", SUPABASE_ANON_KEY)
                        .addHeader("Content-Type", "application/json")
                        .patch(bodyContent.toRequestBody("application/json".toMediaType()))
                        .build()
                    
                    okHttpClient.newCall(request).execute()
                    
                    // Update local
                    messageDao.updateStatus(messageId, "read")
                }
                
                Log.d(TAG, "👁 Read status reported for ${messageIds.size} messages")
                
            } catch (e: Exception) {
                Log.e(TAG, "Error reporting read status", e)
            }
        }
    }
    
    /**
     * Notify sender about delivery/read status via realtime
     */
    private fun notifySenderViaRealtime(senderId: String, messageId: String, status: String) {
        // This would use the presence channel to push status updates
        // For now, the sender will see it on next sync
        Log.d(TAG, "📡 Would notify $senderId that $messageId is $status")
    }
    
    /**
     * Sync any pending delivery receipts
     * Called by MessageSyncWorker
     */
    suspend fun syncPendingReceipts() {
        val pending = _pendingDeliveries.value.toList()
        if (pending.isEmpty()) return
        
        Log.d(TAG, "📬 Syncing ${pending.size} pending delivery receipts")
        
        for (messageId in pending) {
            try {
                // Re-attempt delivery report
                val accessToken = secureStore.getString("access_token") ?: continue
                
                val bodyContent = """{"status": "delivered", "delivered_at": "${java.time.Instant.now()}"}"""
                
                val request = Request.Builder()
                    .url("$SUPABASE_URL/rest/v1/messages?id=eq.$messageId")
                    .addHeader("Authorization", "Bearer $accessToken")
                    .addHeader("apikey", SUPABASE_ANON_KEY)
                    .addHeader("Content-Type", "application/json")
                    .patch(bodyContent.toRequestBody("application/json".toMediaType()))
                    .build()
                
                val response = okHttpClient.newCall(request).execute()
                
                if (response.isSuccessful) {
                    _pendingDeliveries.value = _pendingDeliveries.value - messageId
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to sync delivery receipt for $messageId", e)
            }
        }
    }
    
    /**
     * Poll for delivery status updates for sent messages
     * This handles the case where we're the SENDER and want to know if recipient got it
     */
    suspend fun pollDeliveryStatus() {
        try {
            val accessToken = secureStore.getString("access_token") ?: return
            val userId = secureStore.getString("user_id") ?: return
            
            // Get our sent messages that are still "sent" (not yet delivered/read)
            val pendingMessages = messageDao.getMessagesByStatus(userId, "sent")
            
            if (pendingMessages.isEmpty()) return
            
            Log.d(TAG, "📊 Polling delivery status for ${pendingMessages.size} messages")
            
            for (message in pendingMessages) {
                val request = Request.Builder()
                    .url("$SUPABASE_URL/rest/v1/messages?id=eq.${message.id}&select=status")
                    .addHeader("Authorization", "Bearer $accessToken")
                    .addHeader("apikey", SUPABASE_ANON_KEY)
                    .get()
                    .build()
                
                val response = okHttpClient.newCall(request).execute()
                
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: continue
                    
                    // Parse status from response
                    when {
                        body.contains("\"read\"") -> {
                            messageDao.updateStatus(message.id, "read")
                            messageDao.updateSyncStatus(message.id, SyncStatus.SYNCED)
                            Log.d(TAG, "✅ Message ${message.id} was READ")
                        }
                        body.contains("\"delivered\"") -> {
                            messageDao.updateStatus(message.id, "delivered")
                            Log.d(TAG, "✅ Message ${message.id} was DELIVERED")
                        }
                    }
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error polling delivery status", e)
        }
    }
}
