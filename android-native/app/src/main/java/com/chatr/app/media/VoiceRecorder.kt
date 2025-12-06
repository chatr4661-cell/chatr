package com.chatr.app.media

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Handles voice message recording for chat
 * Provides amplitude for visualizations and duration tracking
 */
@Singleton
class VoiceRecorder @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var mediaRecorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var startTime: Long = 0
    
    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()
    
    private val _amplitude = MutableStateFlow(0)
    val amplitude: StateFlow<Int> = _amplitude.asStateFlow()
    
    private val _duration = MutableStateFlow(0)
    val duration: StateFlow<Int> = _duration.asStateFlow()
    
    companion object {
        private const val MAX_DURATION_MS = 5 * 60 * 1000 // 5 minutes
        private const val SAMPLE_RATE = 44100
        private const val BIT_RATE = 128000
    }
    
    /**
     * Start recording voice message
     * @return true if recording started successfully
     */
    fun startRecording(): Boolean {
        if (_isRecording.value) {
            return false
        }
        
        return try {
            // Create output file
            val cacheDir = File(context.cacheDir, "voice_messages").apply {
                if (!exists()) mkdirs()
            }
            outputFile = File(cacheDir, "voice_${UUID.randomUUID()}.m4a")
            
            // Configure MediaRecorder
            mediaRecorder = createMediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(SAMPLE_RATE)
                setAudioEncodingBitRate(BIT_RATE)
                setMaxDuration(MAX_DURATION_MS)
                setOutputFile(outputFile?.absolutePath)
                
                setOnInfoListener { _, what, _ ->
                    if (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) {
                        stopRecording()
                    }
                }
                
                prepare()
                start()
            }
            
            startTime = System.currentTimeMillis()
            _isRecording.value = true
            _duration.value = 0
            
            true
        } catch (e: Exception) {
            e.printStackTrace()
            cleanup()
            false
        }
    }
    
    /**
     * Stop recording and return the recorded file
     * @return Recorded audio file, or null if recording failed
     */
    fun stopRecording(): File? {
        if (!_isRecording.value) {
            return null
        }
        
        return try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            _isRecording.value = false
            
            // Calculate final duration
            val durationMs = System.currentTimeMillis() - startTime
            _duration.value = (durationMs / 1000).toInt()
            
            // Return file if it exists and has content
            outputFile?.takeIf { it.exists() && it.length() > 0 }
        } catch (e: Exception) {
            e.printStackTrace()
            cleanup()
            null
        }
    }
    
    /**
     * Cancel recording and delete the file
     */
    fun cancelRecording() {
        if (!_isRecording.value) {
            return
        }
        
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
        } catch (e: Exception) {
            // Ignore errors during cancellation
        }
        
        cleanup()
    }
    
    /**
     * Get current amplitude for visualization
     * Call this periodically (e.g., every 100ms) while recording
     * @return Amplitude value (0-32767)
     */
    fun getAmplitude(): Int {
        return try {
            if (_isRecording.value) {
                val amp = mediaRecorder?.maxAmplitude ?: 0
                _amplitude.value = amp
                amp
            } else {
                0
            }
        } catch (e: Exception) {
            0
        }
    }
    
    /**
     * Get current recording duration in seconds
     */
    fun getDuration(): Int {
        return if (_isRecording.value) {
            val durationMs = System.currentTimeMillis() - startTime
            val seconds = (durationMs / 1000).toInt()
            _duration.value = seconds
            seconds
        } else {
            _duration.value
        }
    }
    
    /**
     * Format duration as MM:SS
     */
    fun formatDuration(seconds: Int): String {
        val mins = seconds / 60
        val secs = seconds % 60
        return String.format("%02d:%02d", mins, secs)
    }
    
    /**
     * Clean up resources
     */
    private fun cleanup() {
        mediaRecorder?.release()
        mediaRecorder = null
        outputFile?.delete()
        outputFile = null
        _isRecording.value = false
        _amplitude.value = 0
        _duration.value = 0
    }
    
    /**
     * Create MediaRecorder based on API level
     */
    @Suppress("DEPRECATION")
    private fun createMediaRecorder(): MediaRecorder {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            MediaRecorder()
        }
    }
    
    /**
     * Check if microphone permission is granted
     */
    fun hasPermission(): Boolean {
        return context.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED
    }
    
    /**
     * Get the cached voice messages directory
     */
    fun getVoiceMessagesDir(): File {
        return File(context.cacheDir, "voice_messages").apply {
            if (!exists()) mkdirs()
        }
    }
    
    /**
     * Clean up old voice message cache (files older than 24 hours)
     */
    fun cleanupOldRecordings() {
        val cutoffTime = System.currentTimeMillis() - (24 * 60 * 60 * 1000)
        getVoiceMessagesDir().listFiles()?.forEach { file ->
            if (file.lastModified() < cutoffTime) {
                file.delete()
            }
        }
    }
}

/**
 * Voice message data class
 */
data class VoiceMessage(
    val file: File,
    val durationSeconds: Int,
    val waveformData: List<Int>? = null
)
