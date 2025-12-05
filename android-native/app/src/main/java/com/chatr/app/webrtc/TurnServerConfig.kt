package com.chatr.app.webrtc

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.webrtc.PeerConnection
import java.util.Date
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import android.util.Base64
import javax.inject.Inject
import javax.inject.Singleton

/**
 * TURN Server Configuration for NAT Traversal
 * Supports multiple TURN providers with automatic failover
 */
@Singleton
class TurnServerConfig @Inject constructor() {
    
    companion object {
        // Primary TURN server (Twilio - recommended for production)
        private const val TWILIO_TURN_URL = "turn:global.turn.twilio.com:3478?transport=udp"
        private const val TWILIO_TURN_TCP_URL = "turn:global.turn.twilio.com:443?transport=tcp"
        private const val TWILIO_TURNS_URL = "turns:global.turn.twilio.com:443?transport=tcp"
        
        // Backup TURN servers (Metered TURN - free tier available)
        private const val METERED_TURN_URL = "turn:a.relay.metered.ca:80"
        private const val METERED_TURN_TCP_URL = "turn:a.relay.metered.ca:80?transport=tcp"
        private const val METERED_TURNS_URL = "turns:a.relay.metered.ca:443?transport=tcp"
        
        // STUN servers (free, public)
        private val STUN_SERVERS = listOf(
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun4.l.google.com:19302",
            "stun:stun.cloudflare.com:3478",
            "stun:stun.relay.metered.ca:80"
        )
        
        // Credential TTL (24 hours)
        private const val CREDENTIAL_TTL_SECONDS = 86400L
    }
    
    // Cached credentials
    private var cachedCredentials: TurnCredentials? = null
    private var credentialsExpiry: Long = 0
    
    /**
     * Get ICE servers configuration with TURN servers
     */
    suspend fun getIceServers(
        turnProvider: TurnProvider = TurnProvider.TWILIO,
        apiKey: String? = null,
        apiSecret: String? = null
    ): List<PeerConnection.IceServer> = withContext(Dispatchers.IO) {
        val servers = mutableListOf<PeerConnection.IceServer>()
        
        // Add STUN servers
        STUN_SERVERS.forEach { url ->
            servers.add(
                PeerConnection.IceServer.builder(url)
                    .createIceServer()
            )
        }
        
        // Add TURN servers based on provider
        when (turnProvider) {
            TurnProvider.TWILIO -> {
                addTwilioTurnServers(servers, apiKey, apiSecret)
            }
            TurnProvider.METERED -> {
                addMeteredTurnServers(servers, apiKey, apiSecret)
            }
            TurnProvider.XIRSYS -> {
                addXirsysTurnServers(servers, apiKey, apiSecret)
            }
            TurnProvider.COTURN -> {
                addCoturnServers(servers, apiKey, apiSecret)
            }
        }
        
        servers
    }
    
    /**
     * Generate time-limited TURN credentials (for self-hosted COTURN)
     */
    fun generateTurnCredentials(
        sharedSecret: String,
        userId: String
    ): TurnCredentials {
        val timestamp = (System.currentTimeMillis() / 1000) + CREDENTIAL_TTL_SECONDS
        val username = "$timestamp:$userId"
        
        // Generate HMAC-SHA1 credential
        val mac = Mac.getInstance("HmacSHA1")
        val keySpec = SecretKeySpec(sharedSecret.toByteArray(), "HmacSHA1")
        mac.init(keySpec)
        val credential = Base64.encodeToString(mac.doFinal(username.toByteArray()), Base64.NO_WRAP)
        
        return TurnCredentials(
            username = username,
            credential = credential,
            expiresAt = Date(timestamp * 1000)
        )
    }
    
    // ==================== PROVIDER IMPLEMENTATIONS ====================
    
    private fun addTwilioTurnServers(
        servers: MutableList<PeerConnection.IceServer>,
        accountSid: String?,
        authToken: String?
    ) {
        if (accountSid == null || authToken == null) {
            // Use test credentials (limited, for development only)
            addGenericTurnServer(servers, TWILIO_TURN_URL, "test", "test")
            return
        }
        
        // Generate time-limited credentials for Twilio
        val credentials = generateTwilioCredentials(accountSid, authToken)
        
        // UDP TURN
        servers.add(
            PeerConnection.IceServer.builder(TWILIO_TURN_URL)
                .setUsername(credentials.username)
                .setPassword(credentials.credential)
                .createIceServer()
        )
        
        // TCP TURN (firewall traversal)
        servers.add(
            PeerConnection.IceServer.builder(TWILIO_TURN_TCP_URL)
                .setUsername(credentials.username)
                .setPassword(credentials.credential)
                .createIceServer()
        )
        
        // TLS TURN (secure, for restrictive networks)
        servers.add(
            PeerConnection.IceServer.builder(TWILIO_TURNS_URL)
                .setUsername(credentials.username)
                .setPassword(credentials.credential)
                .createIceServer()
        )
    }
    
    private fun addMeteredTurnServers(
        servers: MutableList<PeerConnection.IceServer>,
        apiKey: String?,
        apiSecret: String?
    ) {
        val username = apiKey ?: "chatr"
        val password = apiSecret ?: "chatr123"
        
        servers.add(
            PeerConnection.IceServer.builder(METERED_TURN_URL)
                .setUsername(username)
                .setPassword(password)
                .createIceServer()
        )
        
        servers.add(
            PeerConnection.IceServer.builder(METERED_TURN_TCP_URL)
                .setUsername(username)
                .setPassword(password)
                .createIceServer()
        )
        
        servers.add(
            PeerConnection.IceServer.builder(METERED_TURNS_URL)
                .setUsername(username)
                .setPassword(password)
                .createIceServer()
        )
    }
    
    private fun addXirsysTurnServers(
        servers: MutableList<PeerConnection.IceServer>,
        apiKey: String?,
        apiSecret: String?
    ) {
        if (apiKey == null || apiSecret == null) return
        
        // Xirsys provides URLs via API, use static for now
        val xirsysUrl = "turn:ws-turn1.xirsys.com:80?transport=udp"
        val xirsysTcpUrl = "turn:ws-turn1.xirsys.com:3478?transport=tcp"
        val xirsysTlsUrl = "turns:ws-turn1.xirsys.com:443?transport=tcp"
        
        listOf(xirsysUrl, xirsysTcpUrl, xirsysTlsUrl).forEach { url ->
            servers.add(
                PeerConnection.IceServer.builder(url)
                    .setUsername(apiKey)
                    .setPassword(apiSecret)
                    .createIceServer()
            )
        }
    }
    
    private fun addCoturnServers(
        servers: MutableList<PeerConnection.IceServer>,
        sharedSecret: String?,
        userId: String?
    ) {
        if (sharedSecret == null || userId == null) return
        
        val credentials = generateTurnCredentials(sharedSecret, userId)
        
        // Self-hosted COTURN URLs (replace with your server)
        val coturnUrls = listOf(
            "turn:turn.chatr.chat:3478?transport=udp",
            "turn:turn.chatr.chat:3478?transport=tcp",
            "turns:turn.chatr.chat:5349?transport=tcp"
        )
        
        coturnUrls.forEach { url ->
            servers.add(
                PeerConnection.IceServer.builder(url)
                    .setUsername(credentials.username)
                    .setPassword(credentials.credential)
                    .createIceServer()
            )
        }
    }
    
    private fun addGenericTurnServer(
        servers: MutableList<PeerConnection.IceServer>,
        url: String,
        username: String,
        password: String
    ) {
        servers.add(
            PeerConnection.IceServer.builder(url)
                .setUsername(username)
                .setPassword(password)
                .createIceServer()
        )
    }
    
    private fun generateTwilioCredentials(accountSid: String, authToken: String): TurnCredentials {
        // Check cache
        if (cachedCredentials != null && System.currentTimeMillis() < credentialsExpiry) {
            return cachedCredentials!!
        }
        
        val timestamp = (System.currentTimeMillis() / 1000) + CREDENTIAL_TTL_SECONDS
        val username = "$timestamp:$accountSid"
        
        val mac = Mac.getInstance("HmacSHA1")
        val keySpec = SecretKeySpec(authToken.toByteArray(), "HmacSHA1")
        mac.init(keySpec)
        val credential = Base64.encodeToString(mac.doFinal(username.toByteArray()), Base64.NO_WRAP)
        
        cachedCredentials = TurnCredentials(username, credential, Date(timestamp * 1000))
        credentialsExpiry = timestamp * 1000
        
        return cachedCredentials!!
    }
    
    /**
     * Build complete RTC configuration
     */
    suspend fun buildRtcConfiguration(
        turnProvider: TurnProvider = TurnProvider.METERED,
        apiKey: String? = null,
        apiSecret: String? = null
    ): PeerConnection.RTCConfiguration {
        val iceServers = getIceServers(turnProvider, apiKey, apiSecret)
        
        return PeerConnection.RTCConfiguration(iceServers).apply {
            // Use all ICE transport types
            iceTransportsType = PeerConnection.IceTransportsType.ALL
            
            // Bundle policy - prefer bundling
            bundlePolicy = PeerConnection.BundlePolicy.MAXBUNDLE
            
            // RTCP mux policy
            rtcpMuxPolicy = PeerConnection.RtcpMuxPolicy.REQUIRE
            
            // Continual gathering
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
            
            // Candidate pool size
            iceCandidatePoolSize = 2
            
            // SDP semantics
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            
            // Key type
            keyType = PeerConnection.KeyType.ECDSA
            
            // Enable DTLS
            enableDtlsSrtp = true
        }
    }
    
    // ==================== DATA CLASSES ====================
    
    data class TurnCredentials(
        val username: String,
        val credential: String,
        val expiresAt: Date
    )
    
    enum class TurnProvider {
        TWILIO,     // Best for production (paid)
        METERED,    // Free tier available
        XIRSYS,     // Enterprise option
        COTURN      // Self-hosted
    }
}

/**
 * Example COTURN server configuration (/etc/turnserver.conf)
 * 
 * # Basic settings
 * listening-port=3478
 * tls-listening-port=5349
 * fingerprint
 * lt-cred-mech
 * use-auth-secret
 * static-auth-secret=YOUR_SHARED_SECRET
 * realm=chatr.chat
 * 
 * # Networking
 * listening-ip=0.0.0.0
 * external-ip=YOUR_PUBLIC_IP
 * relay-ip=YOUR_PUBLIC_IP
 * min-port=49152
 * max-port=65535
 * 
 * # TLS
 * cert=/etc/letsencrypt/live/turn.chatr.chat/fullchain.pem
 * pkey=/etc/letsencrypt/live/turn.chatr.chat/privkey.pem
 * 
 * # Logging
 * verbose
 * log-file=/var/log/turnserver.log
 * 
 * # Security
 * no-multicast-peers
 * denied-peer-ip=10.0.0.0-10.255.255.255
 * denied-peer-ip=192.168.0.0-192.168.255.255
 * denied-peer-ip=172.16.0.0-172.31.255.255
 */
