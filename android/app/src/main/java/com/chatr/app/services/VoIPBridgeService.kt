package com.chatr.app.services

import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject

/**
 * CHATR+ VoIP Bridge Service
 * 
 * JavaScript interface for WebView communication.
 * Bridges all VoIP features between native Android and web app.
 */
class VoIPBridgeService(
    private val context: Context,
    private val webView: WebView?
) {
    companion object {
        private const val TAG = "VoIPBridgeService"
        const val BRIDGE_NAME = "ChatrVoIP"
    }

    private val callTransferService = CallTransferService.getInstance(context)
    private val callForwardingManager = CallForwardingManager.getInstance(context)
    private val callBlockingManager = CallBlockingManager.getInstance(context)
    private val callParkService = CallParkService.getInstance(context)
    private val callQueueService = CallQueueService.getInstance(context)
    private val speedDialService = SpeedDialService.getInstance(context)

    init {
        Log.i(TAG, "📞 VoIPBridgeService initialized")
    }

    // ==================== CALL TRANSFER ====================

    @JavascriptInterface
    fun blindTransfer(callId: String, targetNumber: String): Boolean {
        Log.i(TAG, "📞 JS: blindTransfer($callId, $targetNumber)")
        return callTransferService.blindTransfer(callId, targetNumber)
    }

    @JavascriptInterface
    fun startAttendedTransfer(callId: String, targetNumber: String): Boolean {
        Log.i(TAG, "📞 JS: startAttendedTransfer($callId, $targetNumber)")
        return callTransferService.startAttendedTransfer(callId, targetNumber)
    }

    @JavascriptInterface
    fun completeAttendedTransfer(consultCallId: String): Boolean {
        Log.i(TAG, "📞 JS: completeAttendedTransfer($consultCallId)")
        return callTransferService.completeAttendedTransfer(consultCallId)
    }

    @JavascriptInterface
    fun cancelAttendedTransfer(): Boolean {
        Log.i(TAG, "📞 JS: cancelAttendedTransfer()")
        return callTransferService.cancelAttendedTransfer()
    }

    // ==================== CALL FORWARDING ====================

    @JavascriptInterface
    fun setAlwaysForward(enabled: Boolean, number: String) {
        Log.i(TAG, "📞 JS: setAlwaysForward($enabled, $number)")
        callForwardingManager.setAlwaysForward(enabled, number)
    }

    @JavascriptInterface
    fun setBusyForward(enabled: Boolean, number: String) {
        Log.i(TAG, "📞 JS: setBusyForward($enabled, $number)")
        callForwardingManager.setBusyForward(enabled, number)
    }

    @JavascriptInterface
    fun setNoAnswerForward(enabled: Boolean, number: String, rings: Int) {
        Log.i(TAG, "📞 JS: setNoAnswerForward($enabled, $number, $rings)")
        callForwardingManager.setNoAnswerForward(enabled, number, rings)
    }

    @JavascriptInterface
    fun setUnreachableForward(enabled: Boolean, number: String) {
        Log.i(TAG, "📞 JS: setUnreachableForward($enabled, $number)")
        callForwardingManager.setUnreachableForward(enabled, number)
    }

    @JavascriptInterface
    fun getForwardingSettings(): String {
        val settings = callForwardingManager.settings.value
        return JSONObject().apply {
            put("alwaysEnabled", settings.alwaysEnabled)
            put("alwaysNumber", settings.alwaysNumber)
            put("busyEnabled", settings.busyEnabled)
            put("busyNumber", settings.busyNumber)
            put("noAnswerEnabled", settings.noAnswerEnabled)
            put("noAnswerNumber", settings.noAnswerNumber)
            put("noAnswerRings", settings.noAnswerRings)
            put("unreachableEnabled", settings.unreachableEnabled)
            put("unreachableNumber", settings.unreachableNumber)
        }.toString()
    }

    // ==================== CALL BLOCKING ====================

    @JavascriptInterface
    fun blockNumber(number: String, reason: String?) {
        Log.i(TAG, "📞 JS: blockNumber($number, $reason)")
        callBlockingManager.blockNumber(number, reason)
    }

    @JavascriptInterface
    fun unblockNumber(number: String) {
        Log.i(TAG, "📞 JS: unblockNumber($number)")
        callBlockingManager.unblockNumber(number)
    }

    @JavascriptInterface
    fun isBlocked(number: String): Boolean {
        return callBlockingManager.isBlocked(number)
    }

    @JavascriptInterface
    fun getBlockedNumbers(): String {
        return callBlockingManager.getBlockedNumbers().joinToString(",")
    }

    @JavascriptInterface
    fun setBlockAnonymousCalls(enabled: Boolean) {
        Log.i(TAG, "📞 JS: setBlockAnonymousCalls($enabled)")
        callBlockingManager.setBlockAnonymousCalls(enabled)
    }

    @JavascriptInterface
    fun setBlockUnknownCallers(enabled: Boolean) {
        Log.i(TAG, "📞 JS: setBlockUnknownCallers($enabled)")
        callBlockingManager.setBlockUnknownCallers(enabled)
    }

    // ==================== CALL PARK ====================

    @JavascriptInterface
    fun parkCall(callId: String, callerNumber: String, callerName: String, parkedBy: String): Int {
        Log.i(TAG, "📞 JS: parkCall($callId)")
        return callParkService.parkCall(callId, callerNumber, callerName, parkedBy) ?: -1
    }

    @JavascriptInterface
    fun retrieveParkedCall(slot: Int, retrievedBy: String): String {
        Log.i(TAG, "📞 JS: retrieveParkedCall($slot)")
        val parkedCall = callParkService.retrieveCall(slot, retrievedBy)
        return parkedCall?.let {
            JSONObject().apply {
                put("callId", it.callId)
                put("slot", it.slot)
                put("callerNumber", it.callerNumber)
                put("callerName", it.callerName)
            }.toString()
        } ?: ""
    }

    @JavascriptInterface
    fun getParkedCalls(): String {
        val calls = callParkService.getParkedCalls()
        return calls.joinToString(";") { 
            "${it.slot}:${it.callId}:${it.callerName}:${it.callerNumber}"
        }
    }

    // ==================== CALL QUEUE ====================

    @JavascriptInterface
    fun enqueueCall(callId: String, callerNumber: String, callerName: String, priority: Int): Int {
        Log.i(TAG, "📞 JS: enqueueCall($callId, priority=$priority)")
        return callQueueService.enqueueCall(callId, callerNumber, callerName, priority)
    }

    @JavascriptInterface
    fun dequeueCall(): String {
        Log.i(TAG, "📞 JS: dequeueCall()")
        val call = callQueueService.dequeueCall()
        return call?.let {
            JSONObject().apply {
                put("callId", it.callId)
                put("callerNumber", it.callerNumber)
                put("callerName", it.callerName)
                put("queuedAt", it.queuedAt)
            }.toString()
        } ?: ""
    }

    @JavascriptInterface
    fun requestCallback(callId: String, callerNumber: String, callerName: String): String {
        Log.i(TAG, "📞 JS: requestCallback($callId)")
        val callback = callQueueService.requestCallback(callId, callerNumber, callerName)
        return JSONObject().apply {
            put("id", callback.id)
            put("callerNumber", callback.callerNumber)
            put("callerName", callback.callerName)
            put("requestedAt", callback.requestedAt)
        }.toString()
    }

    @JavascriptInterface
    fun getQueueLength(): Int {
        return callQueueService.getQueueLength()
    }

    @JavascriptInterface
    fun getQueuePosition(callId: String): Int {
        return callQueueService.getQueuePosition(callId)
    }

    // ==================== SPEED DIAL ====================

    @JavascriptInterface
    fun assignSpeedDial(digit: Int, contactId: String?, name: String, number: String, avatarUrl: String?): Boolean {
        Log.i(TAG, "📞 JS: assignSpeedDial($digit, $name, $number)")
        return speedDialService.assignSpeedDial(digit, contactId, name, number, avatarUrl)
    }

    @JavascriptInterface
    fun removeSpeedDial(digit: Int): Boolean {
        Log.i(TAG, "📞 JS: removeSpeedDial($digit)")
        return speedDialService.removeSpeedDial(digit)
    }

    @JavascriptInterface
    fun dialSpeedDial(digit: Int): String {
        Log.i(TAG, "📞 JS: dialSpeedDial($digit)")
        return speedDialService.dialSpeedDial(digit) ?: ""
    }

    @JavascriptInterface
    fun getSpeedDials(): String {
        val entries = speedDialService.getAllSpeedDials()
        return entries.values.joinToString(";") {
            "${it.digit}:${it.name}:${it.number}:${it.avatarUrl ?: ""}"
        }
    }

    // ==================== WEBVIEW COMMUNICATION ====================

    /**
     * Send event to WebView
     */
    fun sendToWebView(eventName: String, data: JSONObject) {
        val script = "window.dispatchEvent(new CustomEvent('$eventName', { detail: $data }));"
        
        webView?.post {
            webView.evaluateJavascript(script) { result ->
                Log.d(TAG, "📤 Sent to WebView: $eventName")
            }
        }
    }

    /**
     * Notify WebView of call forwarded
     */
    fun notifyCallForwarded(callId: String, forwardedTo: String, reason: String) {
        sendToWebView("callForwarded", JSONObject().apply {
            put("callId", callId)
            put("forwardedTo", forwardedTo)
            put("reason", reason)
        })
    }

    /**
     * Notify WebView of call blocked
     */
    fun notifyCallBlocked(callerNumber: String, reason: String) {
        sendToWebView("callBlocked", JSONObject().apply {
            put("callerNumber", callerNumber)
            put("reason", reason)
        })
    }
}
