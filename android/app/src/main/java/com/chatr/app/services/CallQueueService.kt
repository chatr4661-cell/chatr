package com.chatr.app.services

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * CHATR+ Call Queue Service
 * 
 * Manages call queuing functionality:
 * - Queue incoming calls when agents are busy
 * - Callback requests
 * - Queue position announcements
 * - Priority handling
 */
class CallQueueService(private val context: Context) {

    companion object {
        private const val TAG = "CallQueueService"
        private const val DEFAULT_CALLBACK_TIMEOUT_MS = 3600000L // 1 hour
        
        @Volatile
        private var instance: CallQueueService? = null
        
        fun getInstance(context: Context): CallQueueService {
            return instance ?: synchronized(this) {
                instance ?: CallQueueService(context.applicationContext).also { instance = it }
            }
        }
    }

    data class QueuedCall(
        val callId: String,
        val callerNumber: String,
        val callerName: String,
        val queuedAt: Long,
        val priority: Int = 0, // Higher = more priority
        val callbackRequested: Boolean = false,
        val estimatedWaitMinutes: Int? = null
    )

    data class CallbackRequest(
        val id: String,
        val callerNumber: String,
        val callerName: String,
        val requestedAt: Long,
        val expiresAt: Long,
        val status: CallbackStatus = CallbackStatus.PENDING
    )

    enum class CallbackStatus {
        PENDING, CALLING, COMPLETED, FAILED, EXPIRED
    }

    private val callQueue = ConcurrentLinkedQueue<QueuedCall>()
    private val callbackRequests = mutableMapOf<String, CallbackRequest>()
    
    private val _queueState = MutableStateFlow<List<QueuedCall>>(emptyList())
    val queueState: StateFlow<List<QueuedCall>> = _queueState.asStateFlow()
    
    private val _callbackState = MutableStateFlow<List<CallbackRequest>>(emptyList())
    val callbackState: StateFlow<List<CallbackRequest>> = _callbackState.asStateFlow()

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    init {
        Log.i(TAG, "📞 CallQueueService initialized")
    }

    /**
     * Add a call to the queue
     */
    fun enqueueCall(
        callId: String,
        callerNumber: String,
        callerName: String,
        priority: Int = 0
    ): Int {
        val queuedCall = QueuedCall(
            callId = callId,
            callerNumber = callerNumber,
            callerName = callerName,
            queuedAt = System.currentTimeMillis(),
            priority = priority,
            estimatedWaitMinutes = calculateEstimatedWait()
        )
        
        // Insert based on priority
        val position = if (priority > 0) {
            insertByPriority(queuedCall)
        } else {
            callQueue.add(queuedCall)
            callQueue.size
        }
        
        updateQueueState()
        
        Log.i(TAG, "📞 Call queued: $callId at position $position")
        
        // Play queue position announcement
        announceQueuePosition(callId, position)
        
        return position
    }

    /**
     * Remove and return the next call from the queue
     */
    fun dequeueCall(): QueuedCall? {
        val call = callQueue.poll()
        
        if (call != null) {
            updateQueueState()
            Log.i(TAG, "📞 Call dequeued: ${call.callId}")
        }
        
        return call
    }

    /**
     * Remove a specific call from the queue (caller hung up)
     */
    fun removeFromQueue(callId: String): Boolean {
        val removed = callQueue.removeIf { it.callId == callId }
        
        if (removed) {
            updateQueueState()
            Log.i(TAG, "📞 Call removed from queue: $callId")
        }
        
        return removed
    }

    /**
     * Request a callback instead of waiting
     */
    fun requestCallback(callId: String, callerNumber: String, callerName: String): CallbackRequest {
        // Remove from queue if present
        removeFromQueue(callId)
        
        val now = System.currentTimeMillis()
        val callback = CallbackRequest(
            id = java.util.UUID.randomUUID().toString(),
            callerNumber = callerNumber,
            callerName = callerName,
            requestedAt = now,
            expiresAt = now + DEFAULT_CALLBACK_TIMEOUT_MS
        )
        
        callbackRequests[callback.id] = callback
        updateCallbackState()
        
        Log.i(TAG, "📞 Callback requested: ${callback.id} for $callerNumber")
        
        return callback
    }

    /**
     * Process a callback (agent calls back)
     */
    fun processCallback(callbackId: String): CallbackRequest? {
        val callback = callbackRequests[callbackId] ?: return null
        
        callbackRequests[callbackId] = callback.copy(status = CallbackStatus.CALLING)
        updateCallbackState()
        
        Log.i(TAG, "📞 Processing callback: $callbackId")
        
        return callback
    }

    /**
     * Complete a callback
     */
    fun completeCallback(callbackId: String, success: Boolean) {
        val callback = callbackRequests[callbackId] ?: return
        
        callbackRequests[callbackId] = callback.copy(
            status = if (success) CallbackStatus.COMPLETED else CallbackStatus.FAILED
        )
        updateCallbackState()
        
        Log.i(TAG, "📞 Callback ${if (success) "completed" else "failed"}: $callbackId")
    }

    /**
     * Get queue position for a call
     */
    fun getQueuePosition(callId: String): Int {
        return callQueue.indexOfFirst { it.callId == callId } + 1
    }

    /**
     * Get queue length
     */
    fun getQueueLength(): Int = callQueue.size

    /**
     * Get pending callbacks
     */
    fun getPendingCallbacks(): List<CallbackRequest> {
        cleanupExpiredCallbacks()
        return callbackRequests.values
            .filter { it.status == CallbackStatus.PENDING }
            .sortedBy { it.requestedAt }
    }

    private fun insertByPriority(call: QueuedCall): Int {
        // Convert to list, insert, and rebuild queue
        val list = callQueue.toMutableList()
        val position = list.indexOfFirst { it.priority < call.priority }
        
        if (position == -1) {
            list.add(call)
        } else {
            list.add(position, call)
        }
        
        callQueue.clear()
        callQueue.addAll(list)
        
        return if (position == -1) list.size else position + 1
    }

    private fun calculateEstimatedWait(): Int {
        // Estimate based on queue length (3 mins per call)
        return (callQueue.size + 1) * 3
    }

    private fun announceQueuePosition(callId: String, position: Int) {
        // This would trigger a text-to-speech announcement
        Log.d(TAG, "🔊 Announcing position $position for call $callId")
    }

    private fun cleanupExpiredCallbacks() {
        val now = System.currentTimeMillis()
        val expired = callbackRequests.entries
            .filter { it.value.expiresAt < now && it.value.status == CallbackStatus.PENDING }
            .map { it.key }
        
        expired.forEach { id ->
            callbackRequests[id]?.let { callback ->
                callbackRequests[id] = callback.copy(status = CallbackStatus.EXPIRED)
            }
        }
        
        if (expired.isNotEmpty()) {
            updateCallbackState()
        }
    }

    private fun updateQueueState() {
        _queueState.value = callQueue.toList().sortedBy { callQueue.toList().indexOf(it) }
    }

    private fun updateCallbackState() {
        _callbackState.value = callbackRequests.values.toList().sortedByDescending { it.requestedAt }
    }

    fun destroy() {
        scope.cancel()
    }
}
