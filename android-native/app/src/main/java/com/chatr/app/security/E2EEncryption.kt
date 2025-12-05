package com.chatr.app.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.*
import java.security.spec.ECGenParameterSpec
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject
import javax.inject.Singleton

/**
 * End-to-End Encryption using Signal Protocol concepts
 * - ECDH for key exchange
 * - AES-256-GCM for message encryption
 * - Double Ratchet for forward secrecy
 */
@Singleton
class E2EEncryption @Inject constructor() {
    
    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS_PREFIX = "chatr_e2e_"
        private const val EC_ALGORITHM = "EC"
        private const val KEY_AGREEMENT_ALGORITHM = "ECDH"
        private const val CIPHER_ALGORITHM = "AES/GCM/NoPadding"
        private const val GCM_IV_SIZE = 12
        private const val GCM_TAG_SIZE = 128
        private const val AES_KEY_SIZE = 256
    }
    
    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    
    // ==================== KEY GENERATION ====================
    
    /**
     * Generate identity key pair for the user (stored in Android Keystore)
     */
    fun generateIdentityKeyPair(userId: String): PublicKey {
        val alias = "${KEY_ALIAS_PREFIX}identity_$userId"
        
        // Check if key already exists
        if (keyStore.containsAlias(alias)) {
            val entry = keyStore.getEntry(alias, null) as KeyStore.PrivateKeyEntry
            return entry.certificate.publicKey
        }
        
        val keyPairGenerator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC,
            ANDROID_KEYSTORE
        )
        
        val spec = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_AGREE_KEY
        )
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .setUserAuthenticationRequired(false)
            .build()
        
        keyPairGenerator.initialize(spec)
        val keyPair = keyPairGenerator.generateKeyPair()
        
        return keyPair.public
    }
    
    /**
     * Generate ephemeral key pair for session (not stored in Keystore)
     */
    fun generateEphemeralKeyPair(): KeyPair {
        val keyPairGenerator = KeyPairGenerator.getInstance(EC_ALGORITHM)
        keyPairGenerator.initialize(ECGenParameterSpec("secp256r1"))
        return keyPairGenerator.generateKeyPair()
    }
    
    /**
     * Generate pre-keys for async key exchange (X3DH)
     */
    fun generatePreKeys(count: Int = 100): List<PreKey> {
        return (0 until count).map { index ->
            val keyPair = generateEphemeralKeyPair()
            PreKey(
                id = index,
                publicKey = encodePublicKey(keyPair.public),
                privateKey = keyPair.private
            )
        }
    }
    
    /**
     * Generate signed pre-key
     */
    fun generateSignedPreKey(userId: String, identityPrivateKey: PrivateKey): SignedPreKey {
        val keyPair = generateEphemeralKeyPair()
        val publicKeyBytes = keyPair.public.encoded
        
        // Sign the public key with identity key
        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(identityPrivateKey)
        signature.update(publicKeyBytes)
        val signatureBytes = signature.sign()
        
        return SignedPreKey(
            id = System.currentTimeMillis().toInt(),
            publicKey = encodePublicKey(keyPair.public),
            privateKey = keyPair.private,
            signature = Base64.encodeToString(signatureBytes, Base64.NO_WRAP)
        )
    }
    
    // ==================== KEY EXCHANGE (X3DH) ====================
    
    /**
     * Perform X3DH key agreement to establish shared secret
     * Called by initiator (Alice)
     */
    fun performX3DHInitiator(
        identityKeyPairAlice: KeyPair,
        ephemeralKeyPairAlice: KeyPair,
        identityKeyBob: PublicKey,
        signedPreKeyBob: PublicKey,
        oneTimePreKeyBob: PublicKey?
    ): ByteArray {
        val keyAgreement = KeyAgreement.getInstance(KEY_AGREEMENT_ALGORITHM)
        
        // DH1 = DH(IKa, SPKb)
        keyAgreement.init(identityKeyPairAlice.private)
        keyAgreement.doPhase(signedPreKeyBob, true)
        val dh1 = keyAgreement.generateSecret()
        
        // DH2 = DH(EKa, IKb)
        keyAgreement.init(ephemeralKeyPairAlice.private)
        keyAgreement.doPhase(identityKeyBob, true)
        val dh2 = keyAgreement.generateSecret()
        
        // DH3 = DH(EKa, SPKb)
        keyAgreement.init(ephemeralKeyPairAlice.private)
        keyAgreement.doPhase(signedPreKeyBob, true)
        val dh3 = keyAgreement.generateSecret()
        
        // DH4 = DH(EKa, OPKb) - optional
        val dh4 = if (oneTimePreKeyBob != null) {
            keyAgreement.init(ephemeralKeyPairAlice.private)
            keyAgreement.doPhase(oneTimePreKeyBob, true)
            keyAgreement.generateSecret()
        } else {
            ByteArray(0)
        }
        
        // Combine: SK = KDF(DH1 || DH2 || DH3 || DH4)
        return kdf(dh1 + dh2 + dh3 + dh4)
    }
    
    /**
     * Perform X3DH key agreement
     * Called by responder (Bob)
     */
    fun performX3DHResponder(
        identityKeyPairBob: KeyPair,
        signedPreKeyBob: KeyPair,
        oneTimePreKeyBob: KeyPair?,
        identityKeyAlice: PublicKey,
        ephemeralKeyAlice: PublicKey
    ): ByteArray {
        val keyAgreement = KeyAgreement.getInstance(KEY_AGREEMENT_ALGORITHM)
        
        // DH1 = DH(SPKb, IKa)
        keyAgreement.init(signedPreKeyBob.private)
        keyAgreement.doPhase(identityKeyAlice, true)
        val dh1 = keyAgreement.generateSecret()
        
        // DH2 = DH(IKb, EKa)
        keyAgreement.init(identityKeyPairBob.private)
        keyAgreement.doPhase(ephemeralKeyAlice, true)
        val dh2 = keyAgreement.generateSecret()
        
        // DH3 = DH(SPKb, EKa)
        keyAgreement.init(signedPreKeyBob.private)
        keyAgreement.doPhase(ephemeralKeyAlice, true)
        val dh3 = keyAgreement.generateSecret()
        
        // DH4 = DH(OPKb, EKa) - optional
        val dh4 = if (oneTimePreKeyBob != null) {
            keyAgreement.init(oneTimePreKeyBob.private)
            keyAgreement.doPhase(ephemeralKeyAlice, true)
            keyAgreement.generateSecret()
        } else {
            ByteArray(0)
        }
        
        // Combine: SK = KDF(DH1 || DH2 || DH3 || DH4)
        return kdf(dh1 + dh2 + dh3 + dh4)
    }
    
    // ==================== DOUBLE RATCHET ====================
    
    /**
     * Double Ratchet state for a session
     */
    data class RatchetState(
        var rootKey: ByteArray,
        var sendingChainKey: ByteArray?,
        var receivingChainKey: ByteArray?,
        var sendingRatchetKey: KeyPair?,
        var receivingRatchetKey: PublicKey?,
        var sendMessageNumber: Int = 0,
        var receiveMessageNumber: Int = 0,
        var previousSendingChainLength: Int = 0
    )
    
    /**
     * Initialize ratchet state after X3DH
     */
    fun initializeRatchet(sharedSecret: ByteArray, isInitiator: Boolean): RatchetState {
        val (rootKey, chainKey) = kdfRK(sharedSecret, ByteArray(32))
        
        return if (isInitiator) {
            val keyPair = generateEphemeralKeyPair()
            RatchetState(
                rootKey = rootKey,
                sendingChainKey = chainKey,
                receivingChainKey = null,
                sendingRatchetKey = keyPair,
                receivingRatchetKey = null
            )
        } else {
            RatchetState(
                rootKey = rootKey,
                sendingChainKey = null,
                receivingChainKey = chainKey,
                sendingRatchetKey = null,
                receivingRatchetKey = null
            )
        }
    }
    
    /**
     * Perform DH ratchet step
     */
    fun ratchetStep(state: RatchetState, publicKey: PublicKey) {
        val keyAgreement = KeyAgreement.getInstance(KEY_AGREEMENT_ALGORITHM)
        
        // DH output
        keyAgreement.init(state.sendingRatchetKey?.private)
        keyAgreement.doPhase(publicKey, true)
        val dhOutput = keyAgreement.generateSecret()
        
        // Update receiving chain
        val (newRootKey1, receivingChainKey) = kdfRK(state.rootKey, dhOutput)
        state.rootKey = newRootKey1
        state.receivingChainKey = receivingChainKey
        state.receivingRatchetKey = publicKey
        
        // Generate new ratchet key pair
        state.sendingRatchetKey = generateEphemeralKeyPair()
        
        // DH again with new key
        keyAgreement.init(state.sendingRatchetKey?.private)
        keyAgreement.doPhase(publicKey, true)
        val dhOutput2 = keyAgreement.generateSecret()
        
        // Update sending chain
        val (newRootKey2, sendingChainKey) = kdfRK(state.rootKey, dhOutput2)
        state.rootKey = newRootKey2
        state.sendingChainKey = sendingChainKey
        state.previousSendingChainLength = state.sendMessageNumber
        state.sendMessageNumber = 0
        state.receiveMessageNumber = 0
    }
    
    // ==================== MESSAGE ENCRYPTION ====================
    
    /**
     * Encrypt a message using the session's chain key
     */
    fun encryptMessage(state: RatchetState, plaintext: ByteArray): EncryptedMessage {
        val chainKey = state.sendingChainKey ?: throw IllegalStateException("No sending chain key")
        
        // Derive message key
        val (messageKey, newChainKey) = kdfCK(chainKey)
        state.sendingChainKey = newChainKey
        
        // Generate IV
        val iv = ByteArray(GCM_IV_SIZE)
        SecureRandom().nextBytes(iv)
        
        // Encrypt
        val secretKey = SecretKeySpec(messageKey, "AES")
        val cipher = Cipher.getInstance(CIPHER_ALGORITHM)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, GCMParameterSpec(GCM_TAG_SIZE, iv))
        
        val ciphertext = cipher.doFinal(plaintext)
        
        val messageNumber = state.sendMessageNumber++
        
        return EncryptedMessage(
            ciphertext = Base64.encodeToString(ciphertext, Base64.NO_WRAP),
            iv = Base64.encodeToString(iv, Base64.NO_WRAP),
            messageNumber = messageNumber,
            previousChainLength = state.previousSendingChainLength,
            ratchetPublicKey = state.sendingRatchetKey?.let { encodePublicKey(it.public) }
        )
    }
    
    /**
     * Decrypt a message using the session's chain key
     */
    fun decryptMessage(state: RatchetState, encryptedMessage: EncryptedMessage): ByteArray {
        // Check if we need to perform a ratchet step
        encryptedMessage.ratchetPublicKey?.let { publicKeyString ->
            val publicKey = decodePublicKey(publicKeyString)
            if (state.receivingRatchetKey == null || 
                !publicKey.encoded.contentEquals(state.receivingRatchetKey?.encoded)) {
                ratchetStep(state, publicKey)
            }
        }
        
        val chainKey = state.receivingChainKey ?: throw IllegalStateException("No receiving chain key")
        
        // Skip to correct message number
        var currentChainKey = chainKey
        repeat(encryptedMessage.messageNumber - state.receiveMessageNumber) {
            val (_, newChainKey) = kdfCK(currentChainKey)
            currentChainKey = newChainKey
        }
        
        // Derive message key
        val (messageKey, newChainKey) = kdfCK(currentChainKey)
        state.receivingChainKey = newChainKey
        state.receiveMessageNumber = encryptedMessage.messageNumber + 1
        
        // Decrypt
        val ciphertext = Base64.decode(encryptedMessage.ciphertext, Base64.NO_WRAP)
        val iv = Base64.decode(encryptedMessage.iv, Base64.NO_WRAP)
        
        val secretKey = SecretKeySpec(messageKey, "AES")
        val cipher = Cipher.getInstance(CIPHER_ALGORITHM)
        cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(GCM_TAG_SIZE, iv))
        
        return cipher.doFinal(ciphertext)
    }
    
    // ==================== HELPER FUNCTIONS ====================
    
    /**
     * KDF for deriving shared secret
     */
    private fun kdf(input: ByteArray): ByteArray {
        val digest = MessageDigest.getInstance("SHA-256")
        digest.update("CHATR_E2E_KDF".toByteArray())
        digest.update(input)
        return digest.digest()
    }
    
    /**
     * KDF for root key derivation (returns root key and chain key)
     */
    private fun kdfRK(rootKey: ByteArray, dhOutput: ByteArray): Pair<ByteArray, ByteArray> {
        val digest = MessageDigest.getInstance("SHA-512")
        digest.update(rootKey)
        digest.update(dhOutput)
        val output = digest.digest()
        return Pair(output.copyOfRange(0, 32), output.copyOfRange(32, 64))
    }
    
    /**
     * KDF for chain key derivation (returns message key and new chain key)
     */
    private fun kdfCK(chainKey: ByteArray): Pair<ByteArray, ByteArray> {
        val digestMK = MessageDigest.getInstance("SHA-256")
        digestMK.update(chainKey)
        digestMK.update(byteArrayOf(0x01))
        val messageKey = digestMK.digest()
        
        val digestCK = MessageDigest.getInstance("SHA-256")
        digestCK.update(chainKey)
        digestCK.update(byteArrayOf(0x02))
        val newChainKey = digestCK.digest()
        
        return Pair(messageKey, newChainKey)
    }
    
    fun encodePublicKey(publicKey: PublicKey): String {
        return Base64.encodeToString(publicKey.encoded, Base64.NO_WRAP)
    }
    
    fun decodePublicKey(encoded: String): PublicKey {
        val keyBytes = Base64.decode(encoded, Base64.NO_WRAP)
        val keySpec = X509EncodedKeySpec(keyBytes)
        val keyFactory = KeyFactory.getInstance(EC_ALGORITHM)
        return keyFactory.generatePublic(keySpec)
    }
    
    // ==================== DATA CLASSES ====================
    
    data class PreKey(
        val id: Int,
        val publicKey: String,
        val privateKey: PrivateKey
    )
    
    data class SignedPreKey(
        val id: Int,
        val publicKey: String,
        val privateKey: PrivateKey,
        val signature: String
    )
    
    data class EncryptedMessage(
        val ciphertext: String,
        val iv: String,
        val messageNumber: Int,
        val previousChainLength: Int,
        val ratchetPublicKey: String?
    )
    
    data class KeyBundle(
        val identityKey: String,
        val signedPreKey: String,
        val signedPreKeySignature: String,
        val signedPreKeyId: Int,
        val oneTimePreKey: String?,
        val oneTimePreKeyId: Int?
    )
}
