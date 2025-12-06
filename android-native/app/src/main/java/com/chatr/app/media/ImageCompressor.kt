package com.chatr.app.media

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

/**
 * Image compression and manipulation utilities
 * Handles resizing, quality reduction, and thumbnail generation
 */
object ImageCompressor {
    
    /**
     * Compress image bytes to target dimensions and quality
     * @param imageBytes Original image bytes
     * @param maxDimension Maximum width or height
     * @param quality JPEG quality (0-100)
     * @return Compressed image bytes
     */
    fun compressImage(
        imageBytes: ByteArray,
        maxDimension: Int = 1920,
        quality: Int = 80
    ): ByteArray {
        // Decode with inJustDecodeBounds to get dimensions
        val options = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, options)
        
        // Calculate sample size
        options.inSampleSize = calculateInSampleSize(options, maxDimension, maxDimension)
        options.inJustDecodeBounds = false
        
        // Decode bitmap
        var bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, options)
            ?: return imageBytes
        
        // Handle EXIF rotation
        bitmap = rotateImageIfRequired(bitmap, imageBytes)
        
        // Scale to exact max dimension if still too large
        bitmap = scaleToMaxDimension(bitmap, maxDimension)
        
        // Compress to JPEG
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
        
        // Clean up
        if (!bitmap.isRecycled) {
            bitmap.recycle()
        }
        
        return outputStream.toByteArray()
    }
    
    /**
     * Create a square thumbnail
     * @param imageBytes Original image bytes
     * @param size Thumbnail size (width and height)
     * @return Thumbnail bytes
     */
    fun createThumbnail(imageBytes: ByteArray, size: Int = 200): ByteArray {
        // Decode with sampling
        val options = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, options)
        
        options.inSampleSize = calculateInSampleSize(options, size, size)
        options.inJustDecodeBounds = false
        
        var bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, options)
            ?: return imageBytes
        
        // Handle rotation
        bitmap = rotateImageIfRequired(bitmap, imageBytes)
        
        // Create center-cropped square thumbnail
        bitmap = createSquareCrop(bitmap, size)
        
        // Compress
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 75, outputStream)
        
        if (!bitmap.isRecycled) {
            bitmap.recycle()
        }
        
        return outputStream.toByteArray()
    }
    
    /**
     * Calculate optimal sample size for BitmapFactory
     */
    private fun calculateInSampleSize(
        options: BitmapFactory.Options,
        reqWidth: Int,
        reqHeight: Int
    ): Int {
        val (height, width) = options.outHeight to options.outWidth
        var inSampleSize = 1
        
        if (height > reqHeight || width > reqWidth) {
            val halfHeight = height / 2
            val halfWidth = width / 2
            
            while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                inSampleSize *= 2
            }
        }
        
        return inSampleSize
    }
    
    /**
     * Scale bitmap to max dimension while preserving aspect ratio
     */
    private fun scaleToMaxDimension(bitmap: Bitmap, maxDimension: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        
        if (width <= maxDimension && height <= maxDimension) {
            return bitmap
        }
        
        val scale = if (width > height) {
            maxDimension.toFloat() / width
        } else {
            maxDimension.toFloat() / height
        }
        
        val newWidth = (width * scale).toInt()
        val newHeight = (height * scale).toInt()
        
        val scaled = Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
        
        if (scaled != bitmap && !bitmap.isRecycled) {
            bitmap.recycle()
        }
        
        return scaled
    }
    
    /**
     * Create a center-cropped square bitmap
     */
    private fun createSquareCrop(bitmap: Bitmap, targetSize: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        val size = minOf(width, height)
        
        // Calculate crop position (center)
        val x = (width - size) / 2
        val y = (height - size) / 2
        
        // Create square crop
        val cropped = Bitmap.createBitmap(bitmap, x, y, size, size)
        
        // Scale to target size
        val scaled = if (size != targetSize) {
            Bitmap.createScaledBitmap(cropped, targetSize, targetSize, true)
        } else {
            cropped
        }
        
        // Cleanup
        if (cropped != scaled && !cropped.isRecycled) {
            cropped.recycle()
        }
        if (cropped != bitmap && !bitmap.isRecycled) {
            bitmap.recycle()
        }
        
        return scaled
    }
    
    /**
     * Rotate image based on EXIF orientation data
     */
    private fun rotateImageIfRequired(bitmap: Bitmap, imageBytes: ByteArray): Bitmap {
        try {
            val inputStream = ByteArrayInputStream(imageBytes)
            val exif = ExifInterface(inputStream)
            inputStream.close()
            
            val orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_UNDEFINED
            )
            
            val rotationDegrees = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> return bitmap
            }
            
            val matrix = Matrix().apply {
                postRotate(rotationDegrees)
            }
            
            val rotated = Bitmap.createBitmap(
                bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true
            )
            
            if (rotated != bitmap && !bitmap.isRecycled) {
                bitmap.recycle()
            }
            
            return rotated
        } catch (e: Exception) {
            return bitmap
        }
    }
    
    /**
     * Get bitmap dimensions without loading full image
     */
    fun getImageDimensions(imageBytes: ByteArray): Pair<Int, Int> {
        val options = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, options)
        return Pair(options.outWidth, options.outHeight)
    }
    
    /**
     * Check if image needs compression based on size
     */
    fun needsCompression(imageBytes: ByteArray, maxSizeBytes: Int = 1024 * 1024): Boolean {
        return imageBytes.size > maxSizeBytes
    }
}
