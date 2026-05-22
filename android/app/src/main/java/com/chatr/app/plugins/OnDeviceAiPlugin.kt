package com.chatr.app.plugins

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.mlkit.genai.prompt.Generation
import com.google.mlkit.genai.prompt.GenerativeModel
import com.google.mlkit.genai.prompt.generateContentRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

/**
 * Capacitor bridge exposing on-device Gemini Nano (via AICore) to the WebView.
 *
 * JS surface:
 *   OnDeviceAi.checkAvailability()  -> { available, status }
 *   OnDeviceAi.generate({ system, prompt }) -> { text }
 *
 * All execution local — zero server cost. Cloud fallback handled in JS.
 */
@CapacitorPlugin(name = "OnDeviceAi")
class OnDeviceAiPlugin : Plugin() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()
    private var client: GenerativeModel? = null

    @PluginMethod
    fun checkAvailability(call: PluginCall) {
        scope.launch {
            val result = JSObject()
            try {
                ensureClient()
                result.put("available", client != null)
                result.put("status", if (client != null) "available" else "unavailable")
            } catch (e: Throwable) {
                Log.w(TAG, "Nano unavailable: ${e.message}")
                result.put("available", false)
                result.put("status", "unavailable")
                result.put("reason", e.message ?: "unknown")
            }
            call.resolve(result)
        }
    }

    @PluginMethod
    fun generate(call: PluginCall) {
        val systemPrompt = call.getString("system") ?: ""
        val prompt = call.getString("prompt") ?: run {
            call.reject("prompt is required")
            return
        }
        scope.launch {
            try {
                ensureClient()
                val ai = client ?: run {
                    call.reject("on-device AI unavailable")
                    return@launch
                }
                val truncated = truncateToWords(prompt, MAX_WORDS)
                val request = generateContentRequest {
                    text(if (systemPrompt.isNotBlank()) "$systemPrompt\n\n$truncated" else truncated)
                }
                val sb = StringBuilder()
                withContext(Dispatchers.IO) {
                    ai.generateContentStream(request).collect { sb.append(it) }
                }
                val result = JSObject()
                result.put("text", sb.toString())
                call.resolve(result)
            } catch (e: Throwable) {
                Log.e(TAG, "Nano generate failed", e)
                call.reject(e.message ?: "generation failed")
            }
        }
    }

    private suspend fun ensureClient() = mutex.withLock {
        if (client != null) return@withLock
        try {
            var c = Generation.getClient()
            val status = c.checkStatus()
            if (status != 0) {
                try { c.download().collect { } } catch (_: Throwable) { return@withLock }
                c = Generation.getClient()
            }
            client = c
        } catch (e: Throwable) {
            Log.w(TAG, "AICore unreachable: ${e.message}")
            client = null
        }
    }

    companion object {
        private const val TAG = "OnDeviceAiPlugin"
        private const val MAX_WORDS = 2800
        fun truncateToWords(text: String, maxWords: Int): String {
            val words = text.split(Regex("\\s+"))
            return if (words.size <= maxWords) text else words.take(maxWords).joinToString(" ")
        }
    }
}
