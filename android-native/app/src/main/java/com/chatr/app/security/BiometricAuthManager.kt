package com.chatr.app.security

import android.content.Context
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.*
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages biometric authentication for app lock
 * Supports fingerprint, face, and iris recognition
 */
@Singleton
class BiometricAuthManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "BiometricAuth"
        private const val KEYSTORE_ALIAS = "chatr_biometric_key"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val PREFS_NAME = "chatr_biometric_prefs"
        private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
        private const val KEY_LAST_AUTH_TIME = "last_auth_time"
        private const val KEY_AUTH_TIMEOUT = "auth_timeout"
        private const val KEY_ENCRYPTED_PIN = "encrypted_pin"
        
        // Default timeout: 5 minutes
        private const val DEFAULT_AUTH_TIMEOUT_MS = 5 * 60 * 1000L
    }
    
    private val biometricManager = BiometricManager.from(context)
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val prefs = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    // ==================== CAPABILITY CHECK ====================
    
    /**
     * Check if biometric authentication is available
     */
    fun canAuthenticate(): BiometricStatus {
        return when (biometricManager.canAuthenticate(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)) {
            BiometricManager.BIOMETRIC_SUCCESS -> BiometricStatus.AVAILABLE
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> BiometricStatus.NO_HARDWARE
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> BiometricStatus.HARDWARE_UNAVAILABLE
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> BiometricStatus.NOT_ENROLLED
            BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> BiometricStatus.SECURITY_UPDATE_REQUIRED
            else -> BiometricStatus.UNKNOWN_ERROR
        }
    }
    
    /**
     * Check if strong biometric (fingerprint/face) is available
     */
    fun canAuthenticateStrong(): Boolean {
        return biometricManager.canAuthenticate(BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS
    }
    
    /**
     * Check if device credential (PIN/pattern/password) is available
     */
    fun canAuthenticateWithCredential(): Boolean {
        return biometricManager.canAuthenticate(DEVICE_CREDENTIAL) == BiometricManager.BIOMETRIC_SUCCESS
    }
    
    // ==================== AUTHENTICATION ====================
    
    /**
     * Authenticate user with biometrics (Flow-based)
     */
    fun authenticate(
        activity: FragmentActivity,
        title: String = "Unlock Chatr",
        subtitle: String = "Use your biometric to unlock",
        negativeButtonText: String = "Use PIN",
        allowDeviceCredential: Boolean = true
    ): Flow<AuthResult> = callbackFlow {
        val executor = ContextCompat.getMainExecutor(activity)
        
        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                Log.d(TAG, "Authentication succeeded")
                updateLastAuthTime()
                trySend(AuthResult.Success(result.cryptoObject))
                close()
            }
            
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                Log.e(TAG, "Authentication error: $errorCode - $errString")
                
                val error = when (errorCode) {
                    BiometricPrompt.ERROR_CANCELED,
                    BiometricPrompt.ERROR_USER_CANCELED,
                    BiometricPrompt.ERROR_NEGATIVE_BUTTON -> AuthError.USER_CANCELLED
                    BiometricPrompt.ERROR_LOCKOUT -> AuthError.LOCKOUT
                    BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> AuthError.LOCKOUT_PERMANENT
                    BiometricPrompt.ERROR_NO_BIOMETRICS -> AuthError.NO_BIOMETRICS
                    BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL -> AuthError.NO_DEVICE_CREDENTIAL
                    BiometricPrompt.ERROR_HW_NOT_PRESENT -> AuthError.NO_HARDWARE
                    BiometricPrompt.ERROR_HW_UNAVAILABLE -> AuthError.HARDWARE_UNAVAILABLE
                    else -> AuthError.UNKNOWN
                }
                
                trySend(AuthResult.Error(error, errString.toString()))
                close()
            }
            
            override fun onAuthenticationFailed() {
                Log.w(TAG, "Authentication failed (wrong biometric)")
                trySend(AuthResult.Failed)
            }
        }
        
        val prompt = BiometricPrompt(activity, executor, callback)
        
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .apply {
                if (allowDeviceCredential && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
                } else {
                    setNegativeButtonText(negativeButtonText)
                    setAllowedAuthenticators(BIOMETRIC_STRONG)
                }
            }
            .build()
        
        prompt.authenticate(promptInfo)
        
        awaitClose {
            prompt.cancelAuthentication()
        }
    }
    
    /**
     * Authenticate with crypto object (for encryption/decryption)
     */
    fun authenticateWithCrypto(
        activity: FragmentActivity,
        cipher: Cipher,
        title: String = "Confirm your identity",
        subtitle: String = "Authenticate to continue"
    ): Flow<AuthResult> = callbackFlow {
        val executor = ContextCompat.getMainExecutor(activity)
        
        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                updateLastAuthTime()
                trySend(AuthResult.Success(result.cryptoObject))
                close()
            }
            
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                val error = mapErrorCode(errorCode)
                trySend(AuthResult.Error(error, errString.toString()))
                close()
            }
            
            override fun onAuthenticationFailed() {
                trySend(AuthResult.Failed)
            }
        }
        
        val prompt = BiometricPrompt(activity, executor, callback)
        
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText("Cancel")
            .build()
        
        prompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(cipher))
        
        awaitClose {
            prompt.cancelAuthentication()
        }
    }
    
    // ==================== APP LOCK ====================
    
    /**
     * Enable biometric app lock
     */
    fun enableBiometricLock(pin: String): Boolean {
        return try {
            // Generate biometric key
            generateBiometricKey()
            
            // Encrypt PIN with biometric key
            val encryptedPin = encryptWithBiometricKey(pin)
            
            // Store settings
            prefs.edit()
                .putBoolean(KEY_BIOMETRIC_ENABLED, true)
                .putString(KEY_ENCRYPTED_PIN, encryptedPin)
                .apply()
            
            Log.d(TAG, "Biometric lock enabled")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to enable biometric lock", e)
            false
        }
    }
    
    /**
     * Disable biometric app lock
     */
    fun disableBiometricLock() {
        try {
            // Remove biometric key
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
            keyStore.deleteEntry(KEYSTORE_ALIAS)
            
            // Clear settings
            prefs.edit()
                .remove(KEY_BIOMETRIC_ENABLED)
                .remove(KEY_ENCRYPTED_PIN)
                .remove(KEY_LAST_AUTH_TIME)
                .apply()
            
            Log.d(TAG, "Biometric lock disabled")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to disable biometric lock", e)
        }
    }
    
    /**
     * Check if biometric lock is enabled
     */
    fun isBiometricLockEnabled(): Boolean {
        return prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false)
    }
    
    /**
     * Check if authentication is required (based on timeout)
     */
    fun isAuthenticationRequired(): Boolean {
        if (!isBiometricLockEnabled()) return false
        
        val lastAuthTime = prefs.getLong(KEY_LAST_AUTH_TIME, 0)
        val timeout = prefs.getLong(KEY_AUTH_TIMEOUT, DEFAULT_AUTH_TIMEOUT_MS)
        
        return System.currentTimeMillis() - lastAuthTime > timeout
    }
    
    /**
     * Set authentication timeout
     */
    fun setAuthTimeout(timeoutMs: Long) {
        prefs.edit().putLong(KEY_AUTH_TIMEOUT, timeoutMs).apply()
    }
    
    /**
     * Get authentication timeout options
     */
    fun getTimeoutOptions(): List<TimeoutOption> = listOf(
        TimeoutOption("Immediately", 0),
        TimeoutOption("After 1 minute", 60_000),
        TimeoutOption("After 5 minutes", 300_000),
        TimeoutOption("After 15 minutes", 900_000),
        TimeoutOption("After 1 hour", 3_600_000),
        TimeoutOption("Never", Long.MAX_VALUE)
    )
    
    // ==================== PIN MANAGEMENT ====================
    
    /**
     * Verify PIN
     */
    fun verifyPin(pin: String): Boolean {
        return try {
            val encryptedPin = prefs.getString(KEY_ENCRYPTED_PIN, null) ?: return false
            val decryptedPin = decryptWithBiometricKey(encryptedPin)
            pin == decryptedPin
        } catch (e: Exception) {
            Log.e(TAG, "Failed to verify PIN", e)
            false
        }
    }
    
    /**
     * Change PIN
     */
    fun changePin(oldPin: String, newPin: String): Boolean {
        if (!verifyPin(oldPin)) return false
        
        return try {
            val encryptedPin = encryptWithBiometricKey(newPin)
            prefs.edit().putString(KEY_ENCRYPTED_PIN, encryptedPin).apply()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to change PIN", e)
            false
        }
    }
    
    // ==================== CRYPTO OPERATIONS ====================
    
    /**
     * Generate biometric-protected key
     */
    private fun generateBiometricKey() {
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )
        
        val keyGenSpec = KeyGenParameterSpec.Builder(
            KEYSTORE_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(false) // Set to true for biometric-bound key
            .build()
        
        keyGenerator.init(keyGenSpec)
        keyGenerator.generateKey()
    }
    
    /**
     * Get cipher for encryption
     */
    fun getCipherForEncryption(): Cipher {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val key = keyStore.getKey(KEYSTORE_ALIAS, null) as SecretKey
        
        return Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.ENCRYPT_MODE, key)
        }
    }
    
    /**
     * Get cipher for decryption
     */
    fun getCipherForDecryption(iv: ByteArray): Cipher {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val key = keyStore.getKey(KEYSTORE_ALIAS, null) as SecretKey
        
        return Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))
        }
    }
    
    private fun encryptWithBiometricKey(data: String): String {
        val cipher = getCipherForEncryption()
        val encryptedBytes = cipher.doFinal(data.toByteArray())
        val iv = cipher.iv
        
        // Combine IV and encrypted data
        val combined = ByteArray(iv.size + encryptedBytes.size)
        System.arraycopy(iv, 0, combined, 0, iv.size)
        System.arraycopy(encryptedBytes, 0, combined, iv.size, encryptedBytes.size)
        
        return android.util.Base64.encodeToString(combined, android.util.Base64.NO_WRAP)
    }
    
    private fun decryptWithBiometricKey(encryptedData: String): String {
        val combined = android.util.Base64.decode(encryptedData, android.util.Base64.NO_WRAP)
        
        // Extract IV (first 12 bytes for GCM)
        val iv = combined.copyOfRange(0, 12)
        val encryptedBytes = combined.copyOfRange(12, combined.size)
        
        val cipher = getCipherForDecryption(iv)
        val decryptedBytes = cipher.doFinal(encryptedBytes)
        
        return String(decryptedBytes)
    }
    
    // ==================== HELPER FUNCTIONS ====================
    
    private fun updateLastAuthTime() {
        prefs.edit().putLong(KEY_LAST_AUTH_TIME, System.currentTimeMillis()).apply()
    }
    
    private fun mapErrorCode(errorCode: Int): AuthError {
        return when (errorCode) {
            BiometricPrompt.ERROR_CANCELED,
            BiometricPrompt.ERROR_USER_CANCELED,
            BiometricPrompt.ERROR_NEGATIVE_BUTTON -> AuthError.USER_CANCELLED
            BiometricPrompt.ERROR_LOCKOUT -> AuthError.LOCKOUT
            BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> AuthError.LOCKOUT_PERMANENT
            BiometricPrompt.ERROR_NO_BIOMETRICS -> AuthError.NO_BIOMETRICS
            BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL -> AuthError.NO_DEVICE_CREDENTIAL
            BiometricPrompt.ERROR_HW_NOT_PRESENT -> AuthError.NO_HARDWARE
            BiometricPrompt.ERROR_HW_UNAVAILABLE -> AuthError.HARDWARE_UNAVAILABLE
            else -> AuthError.UNKNOWN
        }
    }
    
    // ==================== DATA CLASSES ====================
    
    enum class BiometricStatus {
        AVAILABLE,
        NO_HARDWARE,
        HARDWARE_UNAVAILABLE,
        NOT_ENROLLED,
        SECURITY_UPDATE_REQUIRED,
        UNKNOWN_ERROR
    }
    
    sealed class AuthResult {
        data class Success(val cryptoObject: BiometricPrompt.CryptoObject?) : AuthResult()
        data class Error(val error: AuthError, val message: String) : AuthResult()
        object Failed : AuthResult() // Wrong biometric, can retry
    }
    
    enum class AuthError {
        USER_CANCELLED,
        LOCKOUT,
        LOCKOUT_PERMANENT,
        NO_BIOMETRICS,
        NO_DEVICE_CREDENTIAL,
        NO_HARDWARE,
        HARDWARE_UNAVAILABLE,
        UNKNOWN
    }
    
    data class TimeoutOption(
        val label: String,
        val durationMs: Long
    )
}
