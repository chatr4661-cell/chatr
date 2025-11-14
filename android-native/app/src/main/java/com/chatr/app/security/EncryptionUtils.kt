package com.chatr.app.security

import android.util.Base64
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

object EncryptionUtils {
    
    private const val ALGORITHM = "AES"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH = 128
    private const val IV_LENGTH = 12
    
    fun generateKey(): SecretKey {
        val keyGenerator = KeyGenerator.getInstance(ALGORITHM)
        keyGenerator.init(256, SecureRandom())
        return keyGenerator.generateKey()
    }
    
    fun encryptData(data: ByteArray, key: SecretKey): EncryptedData {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val iv = ByteArray(IV_LENGTH)
        SecureRandom().nextBytes(iv)
        
        val gcmParameterSpec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
        cipher.init(Cipher.ENCRYPT_MODE, key, gcmParameterSpec)
        
        val encryptedBytes = cipher.doFinal(data)
        
        return EncryptedData(
            ciphertext = Base64.encodeToString(encryptedBytes, Base64.NO_WRAP),
            iv = Base64.encodeToString(iv, Base64.NO_WRAP)
        )
    }
    
    fun decryptData(encryptedData: EncryptedData, key: SecretKey): ByteArray {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val iv = Base64.decode(encryptedData.iv, Base64.NO_WRAP)
        val ciphertext = Base64.decode(encryptedData.ciphertext, Base64.NO_WRAP)
        
        val gcmParameterSpec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
        cipher.init(Cipher.DECRYPT_MODE, key, gcmParameterSpec)
        
        return cipher.doFinal(ciphertext)
    }
    
    fun encryptString(plaintext: String, key: SecretKey): EncryptedData {
        return encryptData(plaintext.toByteArray(Charsets.UTF_8), key)
    }
    
    fun decryptString(encryptedData: EncryptedData, key: SecretKey): String {
        val decryptedBytes = decryptData(encryptedData, key)
        return String(decryptedBytes, Charsets.UTF_8)
    }
    
    fun keyFromString(keyString: String): SecretKey {
        val decodedKey = Base64.decode(keyString, Base64.NO_WRAP)
        return SecretKeySpec(decodedKey, 0, decodedKey.size, ALGORITHM)
    }
    
    fun keyToString(key: SecretKey): String {
        return Base64.encodeToString(key.encoded, Base64.NO_WRAP)
    }
}

data class EncryptedData(
    val ciphertext: String,
    val iv: String
)
