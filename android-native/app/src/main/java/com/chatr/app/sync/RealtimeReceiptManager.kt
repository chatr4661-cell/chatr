package com.chatr.app.sync

import android.util.Log
import com.chatr.app.data.local.dao.MessageDao
import com.chatr.app.data.local.entity.SyncStatus
import com.chatr.app.security.SecureStore
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import okhttp3.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * RealtimeReceiptManager - Real-time delivery/read receipts via WebSocket
 * 
 * CRITICAL FOR GSM REPLACEMENT:
 * This replaces polling with instant push updates.
 * When recipient opens message → sender instantly sees blue checkmarks.
 * 
 * Flow:
 * 1. Subscribe to message_receipts channel for conversation
 * 2. Listen for delivery/read events
 * 3. Update local UI immediately
 * 4. No polling needed!
 */
@Singleton
class RealtimeReceiptManager @Inject constructor(
    private val messageDao: MessageDao,
    private val secureStore: SecureStore
) {
    companion object {
        private const val TAG = "RealtimeReceipts"
        private const val REALTIME_URL = "wss://sbayuqgomlflmxgicplz.supabase.co/realtime/v1/websocket"
        private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw"
    }
    
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val gson = Gson()
    
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()
    
    private var currentUserId: String? = null
    private val subscribedConversations = mutableSetOf<String>()
    
    // Emit receipt events for UI updates
    private val _receiptEvents = MutableSharedFlow<ReceiptEvent>()
    val receiptEvents: SharedFlow<ReceiptEvent> = _receiptEvents
    
    /**
     * Connect to realtime channel for receipts
     */
    fun connect() {
        scope.launch {
            try {
                val accessToken = secureStore.getString("access_token") ?: return@launch
                currentUserId = secureStore.getString("user_id")
                
                val url = "$REALTIME_URL?apikey=$SUPABASE_ANON_KEY&vsn=1.0.0"
                val request = Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer $accessToken")
                    .build()
                
                webSocket = client.newWebSocket(request, object : WebSocketListener() {
                    override fun onOpen(webSocket: WebSocket, response: Response) {
                        Log.d(TAG, "📡 Realtime receipts connected")
                        sendHeartbeat()
                        // Subscribe to postgres changes on messages table
                        subscribeToMessagesChanges()
                    }
                    
                    override fun onMessage(webSocket: WebSocket, text: String) {
                        handleMessage(text)
                    }
                    
                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                        Log.e(TAG, "WebSocket error", t)
                        // Reconnect after delay
                        scope.launch {
                            kotlinx.coroutines.delay(5000)
                            connect()
                        }
                    }
                    
                    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                        Log.d(TAG, "WebSocket closed: $reason")
                    }
                })
                
            } catch (e: Exception) {
                Log.e(TAG, "Error connecting to realtime", e)
            }
        }
    }
    
    /**
     * Subscribe to message status changes
     */
    private fun subscribeToMessagesChanges() {
        val joinMessage = mapOf(
            "topic" to "realtime:public:messages",
            "event" to "phx_join",
            "payload" to mapOf(
                "config" to mapOf(
                    "broadcast" to mapOf("self" to false),
                    "presence" to mapOf("key" to ""),
                    "postgres_changes" to listOf(
                        mapOf(
                            "event" to "UPDATE",
                            "schema" to "public",
                            "table" to "messages",
                            "filter" to "sender_id=eq.${currentUserId}"
                        )
                    )
                )
            ),
            "ref" to System.currentTimeMillis().toString()
        )
        send(joinMessage)
        Log.d(TAG, "📡 Subscribed to message status changes")
    }
    
    /**
     * Subscribe to a specific conversation for receipts
     */
    fun subscribeToConversation(conversationId: String) {
        if (subscribedConversations.contains(conversationId)) return
        
        val joinMessage = mapOf(
            "topic" to "realtime:receipts:$conversationId",
            "event" to "phx_join",
            "payload" to mapOf<String, Any>(),
            "ref" to System.currentTimeMillis().toString()
        )
        send(joinMessage)
        subscribedConversations.add(conversationId)
        Log.d(TAG, "📡 Subscribed to receipts for $conversationId")
    }
    
    /**
     * Broadcast that we read messages in a conversation
     */
    fun broadcastReadReceipt(conversationId: String, messageIds: List<String>) {
        val broadcastMessage = mapOf(
            "topic" to "realtime:receipts:$conversationId",
            "event" to "broadcast",
            "payload" to mapOf(
                "type" to "messages_read",
                "reader_id" to currentUserId,
                "message_ids" to messageIds,
                "read_at" to System.currentTimeMillis()
            ),
            "ref" to System.currentTimeMillis().toString()
        )
        send(broadcastMessage)
        Log.d(TAG, "📡 Broadcast read receipt for ${messageIds.size} messages")
    }
    
    /**
     * Broadcast that we received a message (delivered)
     */
    fun broadcastDeliveryReceipt(messageId: String, senderId: String) {
        val broadcastMessage = mapOf(
            "topic" to "realtime:user:$senderId",
            "event" to "broadcast",
            "payload" to mapOf(
                "type" to "message_delivered",
                "message_id" to messageId,
                "delivered_to" to currentUserId,
                "delivered_at" to System.currentTimeMillis()
            ),
            "ref" to System.currentTimeMillis().toString()
        )
        send(broadcastMessage)
    }
    
    private fun handleMessage(text: String) {
        try {
            val message = gson.fromJson(text, Map::class.java)
            val event = message["event"] as? String
            val payload = message["payload"] as? Map<*, *>
            val topic = message["topic"] as? String
            
            when (event) {
                "postgres_changes" -> {
                    // Handle DB change notification
                    payload?.let { handleDbChange(it) }
                }
                "broadcast" -> {
                    // Handle broadcast from other users
                    payload?.let { handleBroadcast(it, topic) }
                }
                "phx_reply" -> {
                    // Acknowledgement
                    Log.d(TAG, "Received ack")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling message", e)
        }
    }
    
    private fun handleDbChange(payload: Map<*, *>) {
        scope.launch {
            try {
                val data = payload["data"] as? Map<*, *> ?: return@launch
                val record = data["record"] as? Map<*, *> ?: return@launch
                
                val messageId = record["id"] as? String ?: return@launch
                val status = record["status"] as? String ?: return@launch
                
                // Update local database
                messageDao.updateStatus(messageId, status)
                
                if (status == "delivered" || status == "read") {
                    messageDao.updateSyncStatus(messageId, SyncStatus.SYNCED)
                }
                
                // Emit event for UI
                val receiptEvent = when (status) {
                    "delivered" -> ReceiptEvent.Delivered(messageId)
                    "read" -> ReceiptEvent.Read(messageId)
                    else -> null
                }
                receiptEvent?.let { _receiptEvents.emit(it) }
                
                Log.d(TAG, "✅ Real-time receipt: $messageId is $status")
                
            } catch (e: Exception) {
                Log.e(TAG, "Error handling DB change", e)
            }
        }
    }
    
    private fun handleBroadcast(payload: Map<*, *>, topic: String?) {
        scope.launch {
            try {
                val type = payload["type"] as? String ?: return@launch
                
                when (type) {
                    "messages_read" -> {
                        val messageIds = (payload["message_ids"] as? List<*>)
                            ?.filterIsInstance<String>() ?: return@launch
                        
                        for (messageId in messageIds) {
                            messageDao.updateStatus(messageId, "read")
                            _receiptEvents.emit(ReceiptEvent.Read(messageId))
                        }
                        Log.d(TAG, "✅ Batch read receipt for ${messageIds.size} messages")
                    }
                    "message_delivered" -> {
                        val messageId = payload["message_id"] as? String ?: return@launch
                        messageDao.updateStatus(messageId, "delivered")
                        _receiptEvents.emit(ReceiptEvent.Delivered(messageId))
                        Log.d(TAG, "✅ Delivery receipt for $messageId")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error handling broadcast", e)
            }
        }
    }
    
    private fun sendHeartbeat() {
        scope.launch {
            while (webSocket != null) {
                val heartbeat = mapOf(
                    "topic" to "phoenix",
                    "event" to "heartbeat",
                    "payload" to mapOf<String, Any>(),
                    "ref" to System.currentTimeMillis().toString()
                )
                send(heartbeat)
                kotlinx.coroutines.delay(30000)
            }
        }
    }
    
    private fun send(data: Map<String, Any?>) {
        webSocket?.send(gson.toJson(data))
    }
    
    fun disconnect() {
        webSocket?.close(1000, "Client disconnecting")
        webSocket = null
        subscribedConversations.clear()
    }
}

sealed class ReceiptEvent {
    data class Delivered(val messageId: String) : ReceiptEvent()
    data class Read(val messageId: String) : ReceiptEvent()
}
