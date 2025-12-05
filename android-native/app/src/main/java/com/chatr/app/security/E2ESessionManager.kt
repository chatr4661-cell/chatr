package com.chatr.app.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.security.KeyPair
import java.security.PrivateKey
import java.security.PublicKey
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages E2E encryption sessions with other users
 */
@Singleton
class E2ESessionManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val e2eEncryption: E2EEncryption
) {
    private val gson = Gson()
    private val sessions = mutableMapOf<String, E2EEncryption.RatchetState>()
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        "chatr_e2e_sessions",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    private val keyPrefs = EncryptedSharedPreferences.create(
        context,
        "chatr_e2e_keys",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    // ==================== KEY MANAGEMENT ====================
    
    /**
     * Initialize E2E for current user
     */
    suspend fun initializeE2E(userId: String): E2EEncryption.KeyBundle = withContext(Dispatchers.IO) {
        // Generate identity key
        val identityPublicKey = e2eEncryption.generateIdentityKeyPair(userId)
        
        // Generate signed pre-key
        val signedPreKey = generateAndStoreSignedPreKey(userId)
        
        // Generate one-time pre-keys
        val preKeys = generateAndStorePreKeys(userId, 100)
        
        E2EEncryption.KeyBundle(
            identityKey = e2eEncryption.encodePublicKey(identityPublicKey),
            signedPreKey = signedPreKey.publicKey,
            signedPreKeySignature = signedPreKey.signature,
            signedPreKeyId = signedPreKey.id,
            oneTimePreKey = preKeys.firstOrNull()?.publicKey,
            oneTimePreKeyId = preKeys.firstOrNull()?.id
        )
    }
    
    /**
     * Generate and store signed pre-key
     */
    private fun generateAndStoreSignedPreKey(userId: String): E2EEncryption.SignedPreKey {
        val identityKeyPair = getIdentityKeyPair(userId)
        val signedPreKey = e2eEncryption.generateSignedPreKey(userId, identityKeyPair.private)
        
        // Store private key securely
        keyPrefs.edit()
            .putString("spk_${signedPreKey.id}", serializePrivateKey(signedPreKey.privateKey))
            .putInt("spk_current_id", signedPreKey.id)
            .apply()
        
        return signedPreKey
    }
    
    /**
     * Generate and store one-time pre-keys
     */
    private fun generateAndStorePreKeys(userId: String, count: Int): List<E2EEncryption.PreKey> {
        val preKeys = e2eEncryption.generatePreKeys(count)
        
        // Store private keys securely
        val editor = keyPrefs.edit()
        preKeys.forEach { preKey ->
            editor.putString("opk_${preKey.id}", serializePrivateKey(preKey.privateKey))
        }
        
        // Store available pre-key IDs
        val availableIds = preKeys.map { it.id }.toSet()
        editor.putStringSet("available_opk_ids", availableIds.map { it.toString() }.toSet())
        editor.apply()
        
        return preKeys
    }
    
    /**
     * Get identity key pair from Android Keystore
     */
    private fun getIdentityKeyPair(userId: String): KeyPair {
        val alias = "chatr_e2e_identity_$userId"
        val keyStore = java.security.KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val entry = keyStore.getEntry(alias, null) as java.security.KeyStore.PrivateKeyEntry
        return KeyPair(entry.certificate.publicKey, entry.privateKey)
    }
    
    // ==================== SESSION MANAGEMENT ====================
    
    /**
     * Establish session with another user (as initiator)
     */
    suspend fun establishSession(
        currentUserId: String,
        otherUserId: String,
        otherUserKeyBundle: E2EEncryption.KeyBundle
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val identityKeyPair = getIdentityKeyPair(currentUserId)
            val ephemeralKeyPair = e2eEncryption.generateEphemeralKeyPair()
            
            val otherIdentityKey = e2eEncryption.decodePublicKey(otherUserKeyBundle.identityKey)
            val otherSignedPreKey = e2eEncryption.decodePublicKey(otherUserKeyBundle.signedPreKey)
            val otherOneTimePreKey = otherUserKeyBundle.oneTimePreKey?.let { 
                e2eEncryption.decodePublicKey(it) 
            }
            
            // Perform X3DH
            val sharedSecret = e2eEncryption.performX3DHInitiator(
                identityKeyPairAlice = identityKeyPair,
                ephemeralKeyPairAlice = ephemeralKeyPair,
                identityKeyBob = otherIdentityKey,
                signedPreKeyBob = otherSignedPreKey,
                oneTimePreKeyBob = otherOneTimePreKey
            )
            
            // Initialize Double Ratchet
            val ratchetState = e2eEncryption.initializeRatchet(sharedSecret, isInitiator = true)
            
            // Store session
            sessions[otherUserId] = ratchetState
            saveSession(otherUserId, ratchetState)
            
            // Store ephemeral public key to send to other user
            keyPrefs.edit()
                .putString("ephemeral_$otherUserId", e2eEncryption.encodePublicKey(ephemeralKeyPair.public))
                .apply()
            
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
    
    /**
     * Accept session from another user (as responder)
     */
    suspend fun acceptSession(
        currentUserId: String,
        otherUserId: String,
        otherIdentityKey: String,
        otherEphemeralKey: String,
        usedSignedPreKeyId: Int,
        usedOneTimePreKeyId: Int?
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val identityKeyPair = getIdentityKeyPair(currentUserId)
            val signedPreKeyPrivate = getSignedPreKey(usedSignedPreKeyId)
            val oneTimePreKeyPrivate = usedOneTimePreKeyId?.let { getOneTimePreKey(it) }
            
            val otherIdentity = e2eEncryption.decodePublicKey(otherIdentityKey)
            val otherEphemeral = e2eEncryption.decodePublicKey(otherEphemeralKey)
            
            // Perform X3DH as responder
            val sharedSecret = e2eEncryption.performX3DHResponder(
                identityKeyPairBob = identityKeyPair,
                signedPreKeyBob = signedPreKeyPrivate,
                oneTimePreKeyBob = oneTimePreKeyPrivate,
                identityKeyAlice = otherIdentity,
                ephemeralKeyAlice = otherEphemeral
            )
            
            // Initialize Double Ratchet
            val ratchetState = e2eEncryption.initializeRatchet(sharedSecret, isInitiator = false)
            
            // Store session
            sessions[otherUserId] = ratchetState
            saveSession(otherUserId, ratchetState)
            
            // Mark one-time pre-key as used
            usedOneTimePreKeyId?.let { markPreKeyUsed(it) }
            
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
    
    // ==================== MESSAGE ENCRYPTION/DECRYPTION ====================
    
    /**
     * Encrypt a message for a user
     */
    suspend fun encryptMessage(otherUserId: String, plaintext: String): E2EEncryption.EncryptedMessage? {
        return withContext(Dispatchers.IO) {
            try {
                val state = getSession(otherUserId) ?: return@withContext null
                val encrypted = e2eEncryption.encryptMessage(state, plaintext.toByteArray(Charsets.UTF_8))
                saveSession(otherUserId, state)
                encrypted
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }
    }
    
    /**
     * Decrypt a message from a user
     */
    suspend fun decryptMessage(otherUserId: String, encryptedMessage: E2EEncryption.EncryptedMessage): String? {
        return withContext(Dispatchers.IO) {
            try {
                val state = getSession(otherUserId) ?: return@withContext null
                val decrypted = e2eEncryption.decryptMessage(state, encryptedMessage)
                saveSession(otherUserId, state)
                String(decrypted, Charsets.UTF_8)
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }
    }
    
    /**
     * Check if session exists with user
     */
    fun hasSession(otherUserId: String): Boolean {
        return sessions.containsKey(otherUserId) || 
               encryptedPrefs.contains("session_$otherUserId")
    }
    
    // ==================== PERSISTENCE ====================
    
    private fun getSession(otherUserId: String): E2EEncryption.RatchetState? {
        // Check memory cache
        sessions[otherUserId]?.let { return it }
        
        // Load from encrypted storage
        val json = encryptedPrefs.getString("session_$otherUserId", null) ?: return null
        return try {
            gson.fromJson(json, SerializedRatchetState::class.java).toRatchetState()
        } catch (e: Exception) {
            null
        }
    }
    
    private fun saveSession(otherUserId: String, state: E2EEncryption.RatchetState) {
        sessions[otherUserId] = state
        
        val serialized = SerializedRatchetState.fromRatchetState(state)
        encryptedPrefs.edit()
            .putString("session_$otherUserId", gson.toJson(serialized))
            .apply()
    }
    
    private fun getSignedPreKey(id: Int): KeyPair {
        val privateKeyStr = keyPrefs.getString("spk_$id", null)
            ?: throw IllegalStateException("Signed pre-key not found: $id")
        val privateKey = deserializePrivateKey(privateKeyStr)
        val publicKey = derivePublicKey(privateKey)
        return KeyPair(publicKey, privateKey)
    }
    
    private fun getOneTimePreKey(id: Int): KeyPair? {
        val privateKeyStr = keyPrefs.getString("opk_$id", null) ?: return null
        val privateKey = deserializePrivateKey(privateKeyStr)
        val publicKey = derivePublicKey(privateKey)
        return KeyPair(publicKey, privateKey)
    }
    
    private fun markPreKeyUsed(id: Int) {
        keyPrefs.edit().remove("opk_$id").apply()
        
        val availableIds = keyPrefs.getStringSet("available_opk_ids", emptySet())?.toMutableSet()
        availableIds?.remove(id.toString())
        keyPrefs.edit().putStringSet("available_opk_ids", availableIds).apply()
    }
    
    private fun serializePrivateKey(privateKey: PrivateKey): String {
        return android.util.Base64.encodeToString(privateKey.encoded, android.util.Base64.NO_WRAP)
    }
    
    private fun deserializePrivateKey(encoded: String): PrivateKey {
        val keyBytes = android.util.Base64.decode(encoded, android.util.Base64.NO_WRAP)
        val keySpec = java.security.spec.PKCS8EncodedKeySpec(keyBytes)
        val keyFactory = java.security.KeyFactory.getInstance("EC")
        return keyFactory.generatePrivate(keySpec)
    }
    
    private fun derivePublicKey(privateKey: PrivateKey): PublicKey {
        // For EC keys, derive public from private
        val keyFactory = java.security.KeyFactory.getInstance("EC")
        val ecPrivateKey = privateKey as java.security.interfaces.ECPrivateKey
        val params = ecPrivateKey.params
        val point = params.generator.multiply(ecPrivateKey.s)
        val pubSpec = java.security.spec.ECPublicKeySpec(
            java.security.spec.ECPoint(point.affineX, point.affineY),
            params
        )
        return keyFactory.generatePublic(pubSpec)
    }
    
    // ==================== SERIALIZATION HELPERS ====================
    
    private data class SerializedRatchetState(
        val rootKey: String,
        val sendingChainKey: String?,
        val receivingChainKey: String?,
        val sendingRatchetPublicKey: String?,
        val receivingRatchetPublicKey: String?,
        val sendMessageNumber: Int,
        val receiveMessageNumber: Int,
        val previousSendingChainLength: Int
    ) {
        fun toRatchetState(): E2EEncryption.RatchetState {
            return E2EEncryption.RatchetState(
                rootKey = android.util.Base64.decode(rootKey, android.util.Base64.NO_WRAP),
                sendingChainKey = sendingChainKey?.let { 
                    android.util.Base64.decode(it, android.util.Base64.NO_WRAP) 
                },
                receivingChainKey = receivingChainKey?.let { 
                    android.util.Base64.decode(it, android.util.Base64.NO_WRAP) 
                },
                sendingRatchetKey = null, // Regenerate on next message
                receivingRatchetKey = receivingRatchetPublicKey?.let {
                    E2EEncryption().decodePublicKey(it)
                },
                sendMessageNumber = sendMessageNumber,
                receiveMessageNumber = receiveMessageNumber,
                previousSendingChainLength = previousSendingChainLength
            )
        }
        
        companion object {
            fun fromRatchetState(state: E2EEncryption.RatchetState): SerializedRatchetState {
                val e2e = E2EEncryption()
                return SerializedRatchetState(
                    rootKey = android.util.Base64.encodeToString(state.rootKey, android.util.Base64.NO_WRAP),
                    sendingChainKey = state.sendingChainKey?.let {
                        android.util.Base64.encodeToString(it, android.util.Base64.NO_WRAP)
                    },
                    receivingChainKey = state.receivingChainKey?.let {
                        android.util.Base64.encodeToString(it, android.util.Base64.NO_WRAP)
                    },
                    sendingRatchetPublicKey = state.sendingRatchetKey?.let {
                        e2e.encodePublicKey(it.public)
                    },
                    receivingRatchetPublicKey = state.receivingRatchetKey?.let {
                        e2e.encodePublicKey(it)
                    },
                    sendMessageNumber = state.sendMessageNumber,
                    receiveMessageNumber = state.receiveMessageNumber,
                    previousSendingChainLength = state.previousSendingChainLength
                )
            }
        }
    }
}
