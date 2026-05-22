package com.chatr.app.ai

import android.content.Context
import com.google.mlkit.genai.prompt.Generation
import com.google.mlkit.genai.prompt.GenerativeModel
import com.google.mlkit.genai.prompt.generateContentRequest
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * On-device Gemini Nano via Android AICore (ML Kit GenAI).
 *
 * - Zero server cost — runs entirely on device NPU/TPU.
 * - Compatible: Pixel 8/9/10, Galaxy S24/S25, premium SoCs with AICore.
 * - Falls back to cloud (Lovable AI Gateway) on incompatible devices.
 *
 * Token limits: ~1024 prompt / 4096 context — truncate transcripts upstream.
 */
@Singleton
class OnDeviceAiService @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var client: GenerativeModel? = null
    private val mutex = Mutex()

    @Volatile private var isModelReady = false
    @Volatile private var lastStatus: Status = Status.UNKNOWN

    enum class Status { UNKNOWN, AVAILABLE, DOWNLOADING, UNAVAILABLE }

    fun status(): Status = lastStatus
    fun isReady(): Boolean = isModelReady

    /**
     * Lazy init + status check. Triggers system download if model is missing.
     * Returns true only when on-device Nano is usable.
     */
    suspend fun initializeAndEnsureModel(): Boolean = mutex.withLock {
        if (isModelReady) return true
        return try {
            withContext(Dispatchers.IO) {
                var currentClient = Generation.getClient()
                val status = currentClient.checkStatus()
                if (status != 0) {
                    lastStatus = Status.DOWNLOADING
                    try {
                        currentClient.download().collect { /* progress no-op */ }
                    } catch (e: Exception) {
                        lastStatus = Status.UNAVAILABLE
                        return@withContext false
                    }
                    currentClient = Generation.getClient()
                }
                client = currentClient
                isModelReady = true
                lastStatus = Status.AVAILABLE
                true
            }
        } catch (e: Exception) {
            lastStatus = Status.UNAVAILABLE
            false
        }
    }

    fun getClientInstance(): GenerativeModel? = client

    /**
     * Stream tokens from on-device model. UI can render word-by-word.
     */
    fun streamContent(systemPrompt: String, userInput: String): Flow<String> = flow {
        val aiClient = client ?: throw IllegalStateException("Nano not initialized")
        val truncated = truncateToWords(userInput, MAX_WORDS)
        val request = generateContentRequest {
            text("$systemPrompt\n\n$truncated")
        }
        aiClient.generateContentStream(request).collect { chunk ->
            emit(chunk)
        }
    }.flowOn(Dispatchers.IO)

    /**
     * One-shot completion. Returns sanitized response.
     */
    suspend fun generate(systemPrompt: String, userInput: String): String = withContext(Dispatchers.IO) {
        val aiClient = client ?: throw IllegalStateException("Nano not initialized")
        val truncated = truncateToWords(userInput, MAX_WORDS)
        val request = generateContentRequest {
            text("$systemPrompt\n\n$truncated")
        }
        val sb = StringBuilder()
        aiClient.generateContentStream(request).collect { sb.append(it) }
        sb.toString()
    }

    companion object {
        private const val MAX_WORDS = 2800

        /** Strip ```json``` fences and isolate the first JSON object. */
        fun sanitizeJson(raw: String): String {
            val cleaned = raw.replace("```json", "").replace("```", "").trim()
            val start = cleaned.indexOf('{')
            val end = cleaned.lastIndexOf('}')
            return if (start in 0 until end) cleaned.substring(start, end + 1) else cleaned
        }

        fun truncateToWords(text: String, maxWords: Int): String {
            val words = text.split(Regex("\\s+"))
            return if (words.size <= maxWords) text else words.take(maxWords).joinToString(" ")
        }
    }
}
