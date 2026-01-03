package com.chatr.app.webrtc

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.webrtc.*

class PeerConnectionManager(
    private val context: Context,
    // Signaling transport is currently managed by higher-level call managers.
    // Kept as a dependency for future ICE/SDP message wiring.
    @Suppress("UNUSED_PARAMETER")
    private val signalingClient: Any
) {
    private var peerConnection: PeerConnection? = null
    private var peerConnectionFactory: PeerConnectionFactory? = null
    
    private val _connectionState = MutableStateFlow<PeerConnection.PeerConnectionState>(
        PeerConnection.PeerConnectionState.NEW
    )
    val connectionState: StateFlow<PeerConnection.PeerConnectionState> = _connectionState
    
    private val _networkQuality = MutableStateFlow<NetworkQuality>(NetworkQuality.EXCELLENT)
    val networkQuality: StateFlow<NetworkQuality> = _networkQuality
    
    private var localVideoTrack: VideoTrack? = null
    private var localAudioTrack: AudioTrack? = null
    
    init {
        initializePeerConnectionFactory()
    }
    
    private fun initializePeerConnectionFactory() {
        val options = PeerConnectionFactory.InitializationOptions.builder(context)
            .setEnableInternalTracer(true)
            .createInitializationOptions()
        PeerConnectionFactory.initialize(options)
        
        val encoderFactory = DefaultVideoEncoderFactory(
            EglBase.create().eglBaseContext,
            true,
            true
        )
        val decoderFactory = DefaultVideoDecoderFactory(EglBase.create().eglBaseContext)
        
        peerConnectionFactory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .setOptions(PeerConnectionFactory.Options().apply {
                disableEncryption = false
                disableNetworkMonitor = false
            })
            .createPeerConnectionFactory()
    }
    
    fun createPeerConnection(
        stunServers: List<String>,
        turnServer: TurnConfig?,
        onIceCandidate: (IceCandidate) -> Unit,
        onAddStream: (MediaStream) -> Unit,
        onRemoveStream: (MediaStream) -> Unit
    ): Boolean {
        val iceServers = mutableListOf<PeerConnection.IceServer>()
        
        // Add STUN servers
        stunServers.forEach { stun ->
            iceServers.add(
                PeerConnection.IceServer.builder(stun)
                    .createIceServer()
            )
        }
        
        // Add TURN server if configured
        turnServer?.let { turn ->
            iceServers.add(
                PeerConnection.IceServer.builder(turn.url)
                    .setUsername(turn.username)
                    .setPassword(turn.password)
                    .createIceServer()
            )
        }
        
        val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
            tcpCandidatePolicy = PeerConnection.TcpCandidatePolicy.ENABLED
            bundlePolicy = PeerConnection.BundlePolicy.MAXBUNDLE
            rtcpMuxPolicy = PeerConnection.RtcpMuxPolicy.REQUIRE
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
            keyType = PeerConnection.KeyType.ECDSA
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
        }
        
        val observer = object : PeerConnection.Observer {
            override fun onIceCandidate(candidate: IceCandidate) {
                onIceCandidate(candidate)
            }
            
            override fun onAddStream(stream: MediaStream) {
                onAddStream(stream)
            }
            
            override fun onRemoveStream(stream: MediaStream) {
                onRemoveStream(stream)
            }
            
            override fun onConnectionChange(newState: PeerConnection.PeerConnectionState) {
                _connectionState.value = newState
                
                // Monitor network quality based on connection state
                when (newState) {
                    PeerConnection.PeerConnectionState.CONNECTED -> {
                        _networkQuality.value = NetworkQuality.EXCELLENT
                    }
                    PeerConnection.PeerConnectionState.CONNECTING,
                    PeerConnection.PeerConnectionState.DISCONNECTED -> {
                        _networkQuality.value = NetworkQuality.POOR
                    }
                    PeerConnection.PeerConnectionState.FAILED -> {
                        _networkQuality.value = NetworkQuality.DISCONNECTED
                    }
                    else -> {}
                }
            }
            
            override fun onSignalingChange(newState: PeerConnection.SignalingState) {}
            override fun onIceConnectionChange(newState: PeerConnection.IceConnectionState) {}
            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(newState: PeerConnection.IceGatheringState) {}
            override fun onDataChannel(dataChannel: DataChannel) {}
            override fun onRenegotiationNeeded() {}
            override fun onAddTrack(receiver: RtpReceiver, streams: Array<out MediaStream>) {}
        }
        
        peerConnection = peerConnectionFactory?.createPeerConnection(rtcConfig, observer)
        return peerConnection != null
    }
    
    fun createOffer(
        videoEnabled: Boolean,
        onSuccess: (SessionDescription) -> Unit,
        onError: (String) -> Unit
    ) {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", videoEnabled.toString()))
        }
        
        peerConnection?.createOffer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription) {
                peerConnection?.setLocalDescription(object : SdpObserver {
                    override fun onSetSuccess() {
                        onSuccess(sdp)
                    }
                    override fun onSetFailure(error: String) {
                        onError("Set local description failed: $error")
                    }
                    override fun onCreateSuccess(p0: SessionDescription?) {}
                    override fun onCreateFailure(p0: String?) {}
                }, sdp)
            }
            
            override fun onCreateFailure(error: String) {
                onError("Create offer failed: $error")
            }
            
            override fun onSetSuccess() {}
            override fun onSetFailure(error: String) {}
        }, constraints)
    }
    
    fun createAnswer(
        onSuccess: (SessionDescription) -> Unit,
        onError: (String) -> Unit
    ) {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
        }
        
        peerConnection?.createAnswer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription) {
                peerConnection?.setLocalDescription(object : SdpObserver {
                    override fun onSetSuccess() {
                        onSuccess(sdp)
                    }
                    override fun onSetFailure(error: String) {
                        onError("Set local description failed: $error")
                    }
                    override fun onCreateSuccess(p0: SessionDescription?) {}
                    override fun onCreateFailure(p0: String?) {}
                }, sdp)
            }
            
            override fun onCreateFailure(error: String) {
                onError("Create answer failed: $error")
            }
            
            override fun onSetSuccess() {}
            override fun onSetFailure(error: String) {}
        }, constraints)
    }
    
    fun setRemoteDescription(
        sdp: SessionDescription,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onSetSuccess() {
                onSuccess()
            }
            
            override fun onSetFailure(error: String) {
                onError("Set remote description failed: $error")
            }
            
            override fun onCreateSuccess(p0: SessionDescription?) {}
            override fun onCreateFailure(p0: String?) {}
        }, sdp)
    }
    
    fun addIceCandidate(candidate: IceCandidate) {
        peerConnection?.addIceCandidate(candidate)
    }
    
    fun addLocalStream(stream: MediaStream) {
        peerConnection?.addStream(stream)
    }
    
    fun close() {
        localVideoTrack?.dispose()
        localAudioTrack?.dispose()
        peerConnection?.close()
        peerConnection?.dispose()
        peerConnection = null
    }
    
    fun dispose() {
        close()
        peerConnectionFactory?.dispose()
        peerConnectionFactory = null
    }
}

data class TurnConfig(
    val url: String,
    val username: String,
    val password: String
)

enum class NetworkQuality {
    EXCELLENT,
    GOOD,
    FAIR,
    POOR,
    DISCONNECTED
}
