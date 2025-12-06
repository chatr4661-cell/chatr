package com.chatr.app.media

import android.content.Context
import android.net.Uri
import android.webkit.MimeTypeMap
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Handles file uploads and downloads for media messages
 * Supports images, videos, audio, and documents
 */
@Singleton
class FileUploadManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val storage: Storage
) {
    companion object {
        private const val BUCKET_AVATARS = "avatars"
        private const val BUCKET_CHAT_MEDIA = "chat-media"
        private const val BUCKET_STORIES = "stories"
        private const val BUCKET_DOCUMENTS = "documents"
        
        private const val MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
        private const val MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
        private const val MAX_DOCUMENT_SIZE = 25 * 1024 * 1024 // 25MB
    }
    
    /**
     * Upload image to chat media bucket
     */
    suspend fun uploadImage(
        uri: Uri,
        conversationId: String,
        compress: Boolean = true
    ): Result<UploadResult> = withContext(Dispatchers.IO) {
        try {
            val inputStream = context.contentResolver.openInputStream(uri)
                ?: return@withContext Result.failure(Exception("Cannot read file"))
            
            var bytes = inputStream.readBytes()
            inputStream.close()
            
            // Check size
            if (bytes.size > MAX_IMAGE_SIZE) {
                return@withContext Result.failure(Exception("Image too large (max 10MB)"))
            }
            
            // Compress if needed
            if (compress) {
                bytes = ImageCompressor.compressImage(bytes, 1920, 80)
            }
            
            // Generate unique filename
            val extension = getFileExtension(uri) ?: "jpg"
            val fileName = "${conversationId}/${UUID.randomUUID()}.$extension"
            
            // Upload to Supabase Storage
            storage.from(BUCKET_CHAT_MEDIA).upload(
                path = fileName,
                data = bytes,
                upsert = false
            )
            
            // Get public URL
            val publicUrl = storage.from(BUCKET_CHAT_MEDIA).publicUrl(fileName)
            
            // Create thumbnail
            val thumbnail = ImageCompressor.createThumbnail(bytes, 200)
            val thumbnailName = "${conversationId}/thumb_${UUID.randomUUID()}.jpg"
            storage.from(BUCKET_CHAT_MEDIA).upload(
                path = thumbnailName,
                data = thumbnail,
                upsert = false
            )
            val thumbnailUrl = storage.from(BUCKET_CHAT_MEDIA).publicUrl(thumbnailName)
            
            Result.success(UploadResult(
                url = publicUrl,
                thumbnailUrl = thumbnailUrl,
                mimeType = "image/$extension",
                size = bytes.size.toLong(),
                fileName = fileName
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Upload video to chat media bucket
     */
    suspend fun uploadVideo(
        uri: Uri,
        conversationId: String
    ): Result<UploadResult> = withContext(Dispatchers.IO) {
        try {
            val inputStream = context.contentResolver.openInputStream(uri)
                ?: return@withContext Result.failure(Exception("Cannot read file"))
            
            val bytes = inputStream.readBytes()
            inputStream.close()
            
            // Check size
            if (bytes.size > MAX_VIDEO_SIZE) {
                return@withContext Result.failure(Exception("Video too large (max 50MB)"))
            }
            
            // Generate unique filename
            val extension = getFileExtension(uri) ?: "mp4"
            val fileName = "${conversationId}/${UUID.randomUUID()}.$extension"
            
            // Upload to Supabase Storage
            storage.from(BUCKET_CHAT_MEDIA).upload(
                path = fileName,
                data = bytes,
                upsert = false
            )
            
            // Get public URL
            val publicUrl = storage.from(BUCKET_CHAT_MEDIA).publicUrl(fileName)
            
            Result.success(UploadResult(
                url = publicUrl,
                thumbnailUrl = null, // Video thumbnail generation would need FFmpeg
                mimeType = "video/$extension",
                size = bytes.size.toLong(),
                fileName = fileName
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Upload audio/voice message
     */
    suspend fun uploadAudio(
        file: File,
        conversationId: String
    ): Result<UploadResult> = withContext(Dispatchers.IO) {
        try {
            val bytes = file.readBytes()
            
            // Generate unique filename
            val fileName = "${conversationId}/${UUID.randomUUID()}.m4a"
            
            // Upload to Supabase Storage
            storage.from(BUCKET_CHAT_MEDIA).upload(
                path = fileName,
                data = bytes,
                upsert = false
            )
            
            // Get public URL
            val publicUrl = storage.from(BUCKET_CHAT_MEDIA).publicUrl(fileName)
            
            Result.success(UploadResult(
                url = publicUrl,
                thumbnailUrl = null,
                mimeType = "audio/m4a",
                size = bytes.size.toLong(),
                fileName = fileName,
                duration = getAudioDuration(file)
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Upload document (PDF, DOC, etc.)
     */
    suspend fun uploadDocument(
        uri: Uri,
        conversationId: String
    ): Result<UploadResult> = withContext(Dispatchers.IO) {
        try {
            val inputStream = context.contentResolver.openInputStream(uri)
                ?: return@withContext Result.failure(Exception("Cannot read file"))
            
            val bytes = inputStream.readBytes()
            inputStream.close()
            
            // Check size
            if (bytes.size > MAX_DOCUMENT_SIZE) {
                return@withContext Result.failure(Exception("Document too large (max 25MB)"))
            }
            
            // Get original filename
            val originalName = getFileName(uri) ?: "document"
            val extension = getFileExtension(uri) ?: "pdf"
            val fileName = "${conversationId}/${UUID.randomUUID()}_${originalName}"
            
            // Upload to Supabase Storage
            storage.from(BUCKET_DOCUMENTS).upload(
                path = fileName,
                data = bytes,
                upsert = false
            )
            
            // Get public URL
            val publicUrl = storage.from(BUCKET_DOCUMENTS).publicUrl(fileName)
            
            Result.success(UploadResult(
                url = publicUrl,
                thumbnailUrl = null,
                mimeType = getMimeType(extension),
                size = bytes.size.toLong(),
                fileName = originalName
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Upload avatar image
     */
    suspend fun uploadAvatar(
        uri: Uri,
        userId: String
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val inputStream = context.contentResolver.openInputStream(uri)
                ?: return@withContext Result.failure(Exception("Cannot read file"))
            
            var bytes = inputStream.readBytes()
            inputStream.close()
            
            // Compress and resize for avatar
            bytes = ImageCompressor.compressImage(bytes, 512, 85)
            
            // Generate filename
            val fileName = "${userId}/avatar_${System.currentTimeMillis()}.jpg"
            
            // Upload to Supabase Storage
            storage.from(BUCKET_AVATARS).upload(
                path = fileName,
                data = bytes,
                upsert = true
            )
            
            // Get public URL
            val publicUrl = storage.from(BUCKET_AVATARS).publicUrl(fileName)
            
            Result.success(publicUrl)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Upload story media
     */
    suspend fun uploadStory(
        uri: Uri,
        userId: String,
        isVideo: Boolean
    ): Result<UploadResult> = withContext(Dispatchers.IO) {
        try {
            val inputStream = context.contentResolver.openInputStream(uri)
                ?: return@withContext Result.failure(Exception("Cannot read file"))
            
            var bytes = inputStream.readBytes()
            inputStream.close()
            
            // Compress image if not video
            if (!isVideo) {
                bytes = ImageCompressor.compressImage(bytes, 1080, 85)
            }
            
            val extension = if (isVideo) "mp4" else "jpg"
            val fileName = "${userId}/${UUID.randomUUID()}.$extension"
            
            // Upload to Supabase Storage
            storage.from(BUCKET_STORIES).upload(
                path = fileName,
                data = bytes,
                upsert = false
            )
            
            val publicUrl = storage.from(BUCKET_STORIES).publicUrl(fileName)
            
            Result.success(UploadResult(
                url = publicUrl,
                thumbnailUrl = null,
                mimeType = if (isVideo) "video/mp4" else "image/jpeg",
                size = bytes.size.toLong(),
                fileName = fileName
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Download file to local storage
     */
    suspend fun downloadFile(
        url: String,
        destinationDir: File? = null
    ): Result<File> = withContext(Dispatchers.IO) {
        try {
            val dir = destinationDir ?: context.cacheDir
            val fileName = url.substringAfterLast("/")
            val file = File(dir, fileName)
            
            // Download using OkHttp would be better, but for simplicity:
            val connection = java.net.URL(url).openConnection()
            connection.connect()
            
            val inputStream = connection.getInputStream()
            val outputStream = FileOutputStream(file)
            
            inputStream.copyTo(outputStream)
            
            inputStream.close()
            outputStream.close()
            
            Result.success(file)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // Helper functions
    private fun getFileExtension(uri: Uri): String? {
        return context.contentResolver.getType(uri)?.let { mimeType ->
            MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType)
        }
    }
    
    private fun getFileName(uri: Uri): String? {
        var name: String? = null
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (cursor.moveToFirst() && nameIndex >= 0) {
                name = cursor.getString(nameIndex)
            }
        }
        return name
    }
    
    private fun getMimeType(extension: String): String {
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
            ?: "application/octet-stream"
    }
    
    private fun getAudioDuration(file: File): Int? {
        return try {
            val retriever = android.media.MediaMetadataRetriever()
            retriever.setDataSource(file.absolutePath)
            val duration = retriever.extractMetadata(
                android.media.MediaMetadataRetriever.METADATA_KEY_DURATION
            )?.toIntOrNull()
            retriever.release()
            duration?.div(1000) // Convert to seconds
        } catch (e: Exception) {
            null
        }
    }
}

/**
 * Result of a file upload operation
 */
data class UploadResult(
    val url: String,
    val thumbnailUrl: String?,
    val mimeType: String,
    val size: Long,
    val fileName: String,
    val duration: Int? = null // For audio/video in seconds
)
