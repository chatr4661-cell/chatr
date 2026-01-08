package com.chatr.app.services

import android.content.Context
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.ConcurrentHashMap

/**
 * CHATR+ Call Park Service
 * 
 * Manages call parking functionality:
 * - Park calls in virtual "slots"
 * - Retrieve parked calls from any device
 * - Automatic timeout/expiration
 */
class CallParkService(private val context: Context) {

    companion object {
        private const val TAG = "CallParkService"
        private const val DEFAULT_PARK_TIMEOUT_MS = 180000L // 3 minutes
        
        @Volatile
        private var instance: CallParkService? = null
        
        fun getInstance(context: Context): CallParkService {
            return instance ?: synchronized(this) {
                instance ?: CallParkService(context.applicationContext).also { instance = it }
            }
        }
    }

    data class ParkedCall(
        val callId: String,
        val slot: Int,
        val callerNumber: String,
        val callerName: String,
        val parkedAt: Long,
        val parkedBy: String,
        val expiresAt: Long
    )

    private val parkedCalls = ConcurrentHashMap<Int, ParkedCall>()
    
    private val _parkedCallsState = MutableStateFlow<List<ParkedCall>>(emptyList())
    val parkedCallsState: StateFlow<List<ParkedCall>> = _parkedCallsState.asStateFlow()

    init {
        Log.i(TAG, "📞 CallParkService initialized")
    }

    /**
     * Park a call in the next available slot
     */
    fun parkCall(
        callId: String,
        callerNumber: String,
        callerName: String,
        parkedBy: String
    ): Int? {
        return try {
            // Find next available slot (1-99)
            val slot = (1..99).firstOrNull { !parkedCalls.containsKey(it) }
            
            if (slot == null) {
                Log.e(TAG, "❌ No parking slots available")
                return null
            }
            
            parkCallInSlot(callId, slot, callerNumber, callerName, parkedBy)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to park call", e)
            null
        }
    }

    /**
     * Park a call in a specific slot
     */
    fun parkCallInSlot(
        callId: String,
        slot: Int,
        callerNumber: String,
        callerName: String,
        parkedBy: String
    ): Int? {
        return try {
            if (parkedCalls.containsKey(slot)) {
                Log.e(TAG, "❌ Slot $slot already occupied")
                return null
            }
            
            val now = System.currentTimeMillis()
            val parkedCall = ParkedCall(
                callId = callId,
                slot = slot,
                callerNumber = callerNumber,
                callerName = callerName,
                parkedAt = now,
                parkedBy = parkedBy,
                expiresAt = now + DEFAULT_PARK_TIMEOUT_MS
            )
            
            parkedCalls[slot] = parkedCall
            
            // Put the actual call on hold
            ChatrConnectionService.getConnection(callId)?.onHold()
            
            updateState()
            
            Log.i(TAG, "📞 Call parked in slot $slot: $callId")
            
            // Notify WebView
            notifyWebView("call_parked", slot, callId)
            
            slot
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to park call in slot $slot", e)
            null
        }
    }

    /**
     * Retrieve a parked call from a slot
     */
    fun retrieveCall(slot: Int, retrievedBy: String): ParkedCall? {
        return try {
            val parkedCall = parkedCalls.remove(slot)
            
            if (parkedCall == null) {
                Log.w(TAG, "⚠️ No call in slot $slot")
                return null
            }
            
            // Check if expired
            if (System.currentTimeMillis() > parkedCall.expiresAt) {
                Log.w(TAG, "⚠️ Parked call in slot $slot has expired")
                // End the expired call
                ChatrConnectionService.getConnection(parkedCall.callId)?.endCall()
                updateState()
                return null
            }
            
            // Unhold the call
            ChatrConnectionService.getConnection(parkedCall.callId)?.onUnhold()
            
            updateState()
            
            Log.i(TAG, "📞 Call retrieved from slot $slot by $retrievedBy")
            
            // Notify WebView
            notifyWebView("call_retrieved", slot, parkedCall.callId)
            
            parkedCall
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to retrieve call from slot $slot", e)
            null
        }
    }

    /**
     * Get all currently parked calls
     */
    fun getParkedCalls(): List<ParkedCall> {
        cleanupExpiredCalls()
        return parkedCalls.values.toList().sortedBy { it.slot }
    }

    /**
     * Check if a slot is occupied
     */
    fun isSlotOccupied(slot: Int): Boolean {
        return parkedCalls.containsKey(slot)
    }

    /**
     * Get available slots
     */
    fun getAvailableSlots(): List<Int> {
        return (1..99).filter { !parkedCalls.containsKey(it) }
    }

    /**
     * Remove expired calls
     */
    private fun cleanupExpiredCalls() {
        val now = System.currentTimeMillis()
        val expiredSlots = parkedCalls.entries
            .filter { it.value.expiresAt < now }
            .map { it.key }
        
        expiredSlots.forEach { slot ->
            val parkedCall = parkedCalls.remove(slot)
            parkedCall?.let {
                Log.i(TAG, "⏰ Parked call expired in slot $slot")
                // End the expired call
                ChatrConnectionService.getConnection(it.callId)?.endCall()
            }
        }
        
        if (expiredSlots.isNotEmpty()) {
            updateState()
        }
    }

    private fun updateState() {
        _parkedCallsState.value = parkedCalls.values.toList().sortedBy { it.slot }
    }

    private fun notifyWebView(action: String, slot: Int, callId: String) {
        Log.d(TAG, "📤 WebView: $action, slot: $slot, callId: $callId")
    }
}
