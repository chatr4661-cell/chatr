package com.chatr.app.services

import android.content.Context
import android.telecom.Call
import android.telecom.CallAudioState
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * CHATR+ Call Transfer Service
 * 
 * Handles blind and attended (warm) call transfers.
 * Integrates with TelecomManager for GSM-like behavior.
 */
class CallTransferService(private val context: Context) {

    companion object {
        private const val TAG = "CallTransferService"
        
        @Volatile
        private var instance: CallTransferService? = null
        
        fun getInstance(context: Context): CallTransferService {
            return instance ?: synchronized(this) {
                instance ?: CallTransferService(context.applicationContext).also { instance = it }
            }
        }
    }

    data class TransferState(
        val isTransferring: Boolean = false,
        val transferType: TransferType = TransferType.NONE,
        val originalCallId: String? = null,
        val consultCallId: String? = null,
        val targetNumber: String? = null,
        val status: TransferStatus = TransferStatus.IDLE
    )

    enum class TransferType {
        NONE, BLIND, ATTENDED
    }

    enum class TransferStatus {
        IDLE, INITIATING, CONSULTING, COMPLETING, COMPLETED, FAILED
    }

    private val _transferState = MutableStateFlow(TransferState())
    val transferState: StateFlow<TransferState> = _transferState.asStateFlow()

    /**
     * Blind Transfer - Immediately transfers call without consultation
     */
    fun blindTransfer(callId: String, targetNumber: String): Boolean {
        Log.i(TAG, "📞 Blind transfer: $callId -> $targetNumber")
        
        return try {
            _transferState.value = TransferState(
                isTransferring = true,
                transferType = TransferType.BLIND,
                originalCallId = callId,
                targetNumber = targetNumber,
                status = TransferStatus.INITIATING
            )

            // Get the active connection
            val connection = ChatrConnectionService.getConnection(callId)
            if (connection == null) {
                Log.e(TAG, "❌ No connection found for callId: $callId")
                _transferState.value = _transferState.value.copy(status = TransferStatus.FAILED)
                return false
            }

            // Put current call on hold
            connection.onHold()

            // Notify WebView to redirect the call
            notifyWebViewTransfer("blind_transfer", callId, targetNumber)

            _transferState.value = _transferState.value.copy(status = TransferStatus.COMPLETED)
            true
        } catch (e: Exception) {
            Log.e(TAG, "❌ Blind transfer failed", e)
            _transferState.value = _transferState.value.copy(status = TransferStatus.FAILED)
            false
        }
    }

    /**
     * Attended Transfer - Allows consultation before completing transfer
     */
    fun startAttendedTransfer(callId: String, targetNumber: String): Boolean {
        Log.i(TAG, "📞 Starting attended transfer: $callId -> $targetNumber")
        
        return try {
            _transferState.value = TransferState(
                isTransferring = true,
                transferType = TransferType.ATTENDED,
                originalCallId = callId,
                targetNumber = targetNumber,
                status = TransferStatus.CONSULTING
            )

            // Get the active connection
            val connection = ChatrConnectionService.getConnection(callId)
            if (connection == null) {
                Log.e(TAG, "❌ No connection found for callId: $callId")
                _transferState.value = _transferState.value.copy(status = TransferStatus.FAILED)
                return false
            }

            // Put current call on hold
            connection.onHold()

            // Initiate consultation call
            notifyWebViewTransfer("start_consult", callId, targetNumber)

            true
        } catch (e: Exception) {
            Log.e(TAG, "❌ Attended transfer start failed", e)
            _transferState.value = _transferState.value.copy(status = TransferStatus.FAILED)
            false
        }
    }

    /**
     * Complete the attended transfer after consultation
     */
    fun completeAttendedTransfer(consultCallId: String): Boolean {
        Log.i(TAG, "✅ Completing attended transfer")
        
        return try {
            val state = _transferState.value
            if (state.transferType != TransferType.ATTENDED || state.status != TransferStatus.CONSULTING) {
                Log.e(TAG, "❌ Invalid state for completing transfer")
                return false
            }

            _transferState.value = state.copy(
                consultCallId = consultCallId,
                status = TransferStatus.COMPLETING
            )

            // Merge the calls and disconnect
            notifyWebViewTransfer("complete_transfer", state.originalCallId ?: "", consultCallId)

            _transferState.value = _transferState.value.copy(status = TransferStatus.COMPLETED)
            true
        } catch (e: Exception) {
            Log.e(TAG, "❌ Complete attended transfer failed", e)
            _transferState.value = _transferState.value.copy(status = TransferStatus.FAILED)
            false
        }
    }

    /**
     * Cancel the attended transfer and resume original call
     */
    fun cancelAttendedTransfer(): Boolean {
        Log.i(TAG, "❌ Canceling attended transfer")
        
        return try {
            val state = _transferState.value
            val originalCallId = state.originalCallId ?: return false

            // Resume original call
            val connection = ChatrConnectionService.getConnection(originalCallId)
            connection?.onUnhold()

            // End consultation call if active
            state.consultCallId?.let { consultId ->
                ChatrConnectionService.getConnection(consultId)?.endCall()
            }

            notifyWebViewTransfer("cancel_transfer", originalCallId, "")

            _transferState.value = TransferState()
            true
        } catch (e: Exception) {
            Log.e(TAG, "❌ Cancel attended transfer failed", e)
            false
        }
    }

    /**
     * Reset transfer state
     */
    fun reset() {
        _transferState.value = TransferState()
    }

    private fun notifyWebViewTransfer(action: String, callId: String, target: String) {
        Log.d(TAG, "📤 WebView transfer event: $action, callId: $callId, target: $target")
        // This will be picked up by MainActivity's JavaScript interface
    }
}
