package com.chatr.app.webrtc.core

import android.content.Context
import android.util.Log
import com.chatr.app.webrtc.state.CallState
import com.chatr.app.webrtc.state.CallStateMachine
import com.chatr.app.webrtc.state.FailureReason
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.webrtc.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * WebRTC Client - Core WebRTC implementation for native calling
 * 
 * Handles:
 * - Peer connection lifecycle
 * - ICE candidate gathering and exchange
 * - SDP offer/answer negotiation
 * - Media track management
 * - Connection quality monitoring
 * - ICE restart for network recovery
 */
@Singleton
class WebRtcClient @Inject constructor(
    @ApplicationContext private val context: Context,
    private val factoryProvider: PeerConnectionFactoryProvider,
    private val callStateMachine: CallStateMachine
) {
    companion object {
        private const val TAG = "WebRtcClient"
        private const val ICE_RESTART_DELAY_MS = 5000L
        private const val MAX_RECONNECT_ATTEMPTS = 5
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var peerConnection: PeerConnection? = null
    private var localAudioTrack: AudioTrack? = null
    private var localVideoTrack: VideoTrack? = null
    private var remoteVideoTrack: VideoTrack? = null
    private var videoCapturer: VideoCapturer? = null
    private var surfaceTextureHelper: SurfaceTextureHelper? = null
    private var localVideoSource: VideoSource? = null
    private var localAudioSource: AudioSource? = null

    private var reconnectAttempts = 0
    private var isVideoEnabled = false

    // Callbacks
    private var onLocalIceCandidate: ((IceCandidate) -> Unit)? = null
    private var onRemoteStream: ((MediaStream) -> Unit)? = null
    private var onConnectionStateChanged: ((PeerConnection.PeerConnectionState) -> Unit)? = null

    private val _remoteVideoTrack = MutableStateFlow<VideoTrack?>(null)
    val remoteVideoTrack: StateFlow<VideoTrack?> = _remoteVideoTrack.asStateFlow()

    private val _localVideoTrack = MutableStateFlow<VideoTrack?>(null)
    val localVideoTrackFlow: StateFlow<VideoTrack?> = _localVideoTrack.asStateFlow()

    private val _connectionQuality = MutableStateFlow(ConnectionQuality.UNKNOWN)
    val connectionQuality: StateFlow<ConnectionQuality> = _connectionQuality.asStateFlow()

    private val _stats = MutableStateFlow<CallStats?>(null)
    val stats: StateFlow<CallStats?> = _stats.asStateFlow()

    // Default ICE servers with TURN fallback
    private val defaultIceServers = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun2.l.google.com:19302").createIceServer(),
        // Fallback TURN servers
        PeerConnection.IceServer.builder("turn:openrelay.metered.ca:80")
            .setUsername("openrelayproject")
            .setPassword("openrelayproject")
            .createIceServer(),
        PeerConnection.IceServer.builder("turn:openrelay.metered.ca:443")
            .setUsername("openrelayproject")
            .setPassword("openrelayproject")
            .createIceServer(),
        PeerConnection.IceServer.builder("turn:openrelay.metered.ca:443?transport=tcp")
            .setUsername("openrelayproject")
            .setPassword("openrelayproject")
            .createIceServer()
    )

    /**
     * Initialize peer connection
     */
    fun initialize(
        isVideo: Boolean,
        iceServers: List<PeerConnection.IceServer>? = null,
        onIceCandidate: (IceCandidate) -> Unit,
        onStreamAdded: ((MediaStream) -> Unit)? = null,
        onConnectionState: ((PeerConnection.PeerConnectionState) -> Unit)? = null
    ): Boolean {
        Log.d(TAG, "Initializing WebRTC client (video: $isVideo)")

        isVideoEnabled = isVideo
        onLocalIceCandidate = onIceCandidate
        onRemoteStream = onStreamAdded
        onConnectionStateChanged = onConnectionState

        return createPeerConnection(iceServers ?: defaultIceServers)
    }

    private fun createPeerConnection(iceServers: List<PeerConnection.IceServer>): Boolean {
        val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
            bundlePolicy = PeerConnection.BundlePolicy.MAXBUNDLE
            rtcpMuxPolicy = PeerConnection.RtcpMuxPolicy.REQUIRE
            tcpCandidatePolicy = PeerConnection.TcpCandidatePolicy.ENABLED
            keyType = PeerConnection.KeyType.ECDSA
            // Extended timeout for mobile networks
            iceConnectionReceivingTimeout = 45000
            iceBackupCandidatePairPingInterval = 15000
        }

        peerConnection = factoryProvider.factory.createPeerConnection(
            rtcConfig,
            createPeerConnectionObserver()
        )

        return peerConnection != null
    }

    private fun createPeerConnectionObserver(): PeerConnection.Observer {
        return object : PeerConnection.Observer {
            override fun onSignalingChange(state: PeerConnection.SignalingState?) {
                Log.d(TAG, "Signaling state: $state")
            }

            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {
                Log.d(TAG, "ICE connection state: $state")
                when (state) {
                    PeerConnection.IceConnectionState.CONNECTED,
                    PeerConnection.IceConnectionState.COMPLETED -> {
                        reconnectAttempts = 0
                        _connectionQuality.value = ConnectionQuality.GOOD
                    }
                    PeerConnection.IceConnectionState.DISCONNECTED -> {
                        _connectionQuality.value = ConnectionQuality.POOR
                        handleDisconnection()
                    }
                    PeerConnection.IceConnectionState.FAILED -> {
                        _connectionQuality.value = ConnectionQuality.DISCONNECTED
                        handleIceFailure()
                    }
                    else -> {}
                }
            }

            override fun onConnectionChange(newState: PeerConnection.PeerConnectionState?) {
                Log.d(TAG, "Connection state: $newState")
                onConnectionStateChanged?.invoke(newState ?: PeerConnection.PeerConnectionState.NEW)

                when (newState) {
                    PeerConnection.PeerConnectionState.CONNECTED -> {
                        callStateMachine.transition(CallState.Connected)
                        startStatsCollection()
                    }
                    PeerConnection.PeerConnectionState.DISCONNECTED -> {
                        callStateMachine.transition(CallState.Reconnecting)
                    }
                    PeerConnection.PeerConnectionState.FAILED -> {
                        callStateMachine.transition(CallState.Failed(FailureReason.PEER_CONNECTION_FAILED))
                    }
                    else -> {}
                }
            }

            override fun onIceConnectionReceivingChange(receiving: Boolean) {
                Log.d(TAG, "ICE connection receiving: $receiving")
            }

            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState?) {
                Log.d(TAG, "ICE gathering state: $state")
            }

            override fun onIceCandidate(candidate: IceCandidate?) {
                candidate?.let {
                    Log.d(TAG, "ICE candidate: ${it.sdpMid} ${it.sdpMLineIndex}")
                    onLocalIceCandidate?.invoke(it)
                }
            }

            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {
                Log.d(TAG, "ICE candidates removed: ${candidates?.size}")
            }

            override fun onAddStream(stream: MediaStream?) {
                Log.d(TAG, "Stream added: ${stream?.id}")
                stream?.let { onRemoteStream?.invoke(it) }
            }

            override fun onRemoveStream(stream: MediaStream?) {
                Log.d(TAG, "Stream removed: ${stream?.id}")
            }

            override fun onDataChannel(channel: DataChannel?) {
                Log.d(TAG, "Data channel: ${channel?.label()}")
            }

            override fun onRenegotiationNeeded() {
                Log.d(TAG, "Renegotiation needed")
            }

            override fun onAddTrack(receiver: RtpReceiver?, streams: Array<out MediaStream>?) {
                Log.d(TAG, "Track added: ${receiver?.track()?.kind()}")
                receiver?.track()?.let { track ->
                    if (track is VideoTrack) {
                        remoteVideoTrack = track
                        _remoteVideoTrack.value = track
                    }
                }
            }

            override fun onTrack(transceiver: RtpTransceiver?) {
                Log.d(TAG, "Transceiver track: ${transceiver?.receiver?.track()?.kind()}")
                transceiver?.receiver?.track()?.let { track ->
                    if (track is VideoTrack) {
                        remoteVideoTrack = track
                        _remoteVideoTrack.value = track
                    }
                }
            }
        }
    }

    /**
     * Setup local media (audio + optional video)
     */
    fun setupLocalMedia(isVideo: Boolean) {
        Log.d(TAG, "Setting up local media (video: $isVideo)")

        // Audio track (always)
        val audioConstraints = factoryProvider.createAudioConstraints()
        localAudioSource = factoryProvider.factory.createAudioSource(audioConstraints)
        localAudioTrack = factoryProvider.factory.createAudioTrack("audio0", localAudioSource)
        localAudioTrack?.setEnabled(true)

        peerConnection?.addTrack(localAudioTrack, listOf("stream0"))

        // Video track (if video call)
        if (isVideo) {
            setupVideoTrack()
        }
    }

    private fun setupVideoTrack() {
        videoCapturer = createCameraCapturer()
        videoCapturer?.let { capturer ->
            surfaceTextureHelper = SurfaceTextureHelper.create(
                "CaptureThread",
                factoryProvider.eglBaseContext
            )
            localVideoSource = factoryProvider.factory.createVideoSource(capturer.isScreencast)
            capturer.initialize(surfaceTextureHelper, context, localVideoSource?.capturerObserver)
            capturer.startCapture(1280, 720, 30)

            localVideoTrack = factoryProvider.factory.createVideoTrack("video0", localVideoSource)
            localVideoTrack?.setEnabled(true)
            _localVideoTrack.value = localVideoTrack

            peerConnection?.addTrack(localVideoTrack, listOf("stream0"))
        }
    }

    private fun createCameraCapturer(): VideoCapturer? {
        val enumerator = Camera2Enumerator(context)
        val deviceNames = enumerator.deviceNames

        // Try front camera first
        for (deviceName in deviceNames) {
            if (enumerator.isFrontFacing(deviceName)) {
                return enumerator.createCapturer(deviceName, null)
            }
        }

        // Fall back to back camera
        for (deviceName in deviceNames) {
            if (!enumerator.isFrontFacing(deviceName)) {
                return enumerator.createCapturer(deviceName, null)
            }
        }

        return null
    }

    /**
     * Create SDP offer
     */
    fun createOffer(callback: (SessionDescription?) -> Unit) {
        val constraints = factoryProvider.createSdpConstraints(
            receiveAudio = true,
            receiveVideo = isVideoEnabled
        )

        peerConnection?.createOffer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription?) {
                sdp?.let {
                    peerConnection?.setLocalDescription(object : SdpObserver {
                        override fun onSetSuccess() {
                            Log.d(TAG, "Local description set successfully")
                            callback(sdp)
                        }
                        override fun onSetFailure(error: String?) {
                            Log.e(TAG, "Failed to set local description: $error")
                            callback(null)
                        }
                        override fun onCreateSuccess(p0: SessionDescription?) {}
                        override fun onCreateFailure(p0: String?) {}
                    }, it)
                }
            }

            override fun onCreateFailure(error: String?) {
                Log.e(TAG, "Failed to create offer: $error")
                callback(null)
            }

            override fun onSetSuccess() {}
            override fun onSetFailure(error: String?) {}
        }, constraints)
    }

    /**
     * Create SDP answer
     */
    fun createAnswer(callback: (SessionDescription?) -> Unit) {
        val constraints = factoryProvider.createSdpConstraints(
            receiveAudio = true,
            receiveVideo = isVideoEnabled
        )

        peerConnection?.createAnswer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription?) {
                sdp?.let {
                    peerConnection?.setLocalDescription(object : SdpObserver {
                        override fun onSetSuccess() {
                            Log.d(TAG, "Local description (answer) set successfully")
                            callback(sdp)
                        }
                        override fun onSetFailure(error: String?) {
                            Log.e(TAG, "Failed to set local description: $error")
                            callback(null)
                        }
                        override fun onCreateSuccess(p0: SessionDescription?) {}
                        override fun onCreateFailure(p0: String?) {}
                    }, it)
                }
            }

            override fun onCreateFailure(error: String?) {
                Log.e(TAG, "Failed to create answer: $error")
                callback(null)
            }

            override fun onSetSuccess() {}
            override fun onSetFailure(error: String?) {}
        }, constraints)
    }

    /**
     * Set remote SDP
     */
    fun setRemoteDescription(sdp: SessionDescription, callback: (Boolean) -> Unit) {
        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onSetSuccess() {
                Log.d(TAG, "Remote description set successfully")
                callback(true)
            }

            override fun onSetFailure(error: String?) {
                Log.e(TAG, "Failed to set remote description: $error")
                callback(false)
            }

            override fun onCreateSuccess(p0: SessionDescription?) {}
            override fun onCreateFailure(p0: String?) {}
        }, sdp)
    }

    /**
     * Add ICE candidate
     */
    fun addIceCandidate(candidate: IceCandidate) {
        peerConnection?.addIceCandidate(candidate)
    }

    /**
     * Toggle mute
     */
    fun toggleMute(): Boolean {
        localAudioTrack?.let {
            val newState = !it.enabled()
            it.setEnabled(newState)
            return !newState // Return true if muted
        }
        return false
    }

    /**
     * Toggle camera
     */
    fun toggleCamera(): Boolean {
        localVideoTrack?.let {
            val newState = !it.enabled()
            it.setEnabled(newState)
            return !newState // Return true if camera off
        }
        return false
    }

    /**
     * Switch camera (front/back)
     */
    fun switchCamera() {
        (videoCapturer as? CameraVideoCapturer)?.switchCamera(null)
    }

    /**
     * Attach local video renderer
     */
    fun attachLocalRenderer(renderer: SurfaceViewRenderer) {
        localVideoTrack?.addSink(renderer)
    }

    /**
     * Attach remote video renderer
     */
    fun attachRemoteRenderer(renderer: SurfaceViewRenderer) {
        remoteVideoTrack?.addSink(renderer)
    }

    /**
     * Handle ICE restart for network recovery
     */
    fun restartIce() {
        Log.d(TAG, "Restarting ICE")
        peerConnection?.restartIce()
    }

    private fun handleDisconnection() {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            scope.launch {
                delay(ICE_RESTART_DELAY_MS)
                reconnectAttempts++
                Log.d(TAG, "Attempting ICE restart ($reconnectAttempts/$MAX_RECONNECT_ATTEMPTS)")
                restartIce()
            }
        }
    }

    private fun handleIceFailure() {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            handleDisconnection()
        } else {
            Log.e(TAG, "ICE failed after $MAX_RECONNECT_ATTEMPTS attempts")
            callStateMachine.transition(CallState.Failed(FailureReason.ICE_FAILURE))
        }
    }

    private fun startStatsCollection() {
        scope.launch {
            while (peerConnection != null) {
                collectStats()
                delay(2000)
            }
        }
    }

    private fun collectStats() {
        peerConnection?.getStats { report ->
            var bytesReceived = 0L
            var bytesSent = 0L
            var packetsLost = 0
            var jitter = 0.0
            var rtt = 0.0

            report.statsMap.values.forEach { stats ->
                when (stats.type) {
                    "inbound-rtp" -> {
                        bytesReceived += (stats.members["bytesReceived"] as? Long) ?: 0
                        packetsLost += (stats.members["packetsLost"] as? Int) ?: 0
                        jitter = (stats.members["jitter"] as? Double) ?: 0.0
                    }
                    "outbound-rtp" -> {
                        bytesSent += (stats.members["bytesSent"] as? Long) ?: 0
                    }
                    "candidate-pair" -> {
                        if ((stats.members["nominated"] as? Boolean) == true) {
                            rtt = (stats.members["currentRoundTripTime"] as? Double)?.times(1000) ?: 0.0
                        }
                    }
                }
            }

            _stats.value = CallStats(
                bytesReceived = bytesReceived,
                bytesSent = bytesSent,
                packetsLost = packetsLost,
                jitter = jitter,
                rtt = rtt
            )

            // Update connection quality based on stats
            updateConnectionQuality(packetsLost, rtt)
        }
    }

    private fun updateConnectionQuality(packetsLost: Int, rtt: Double) {
        _connectionQuality.value = when {
            packetsLost > 50 || rtt > 500 -> ConnectionQuality.POOR
            packetsLost > 20 || rtt > 200 -> ConnectionQuality.FAIR
            packetsLost > 5 || rtt > 100 -> ConnectionQuality.GOOD
            else -> ConnectionQuality.EXCELLENT
        }
    }

    /**
     * Dispose all resources
     */
    fun dispose() {
        Log.d(TAG, "Disposing WebRTC client")

        videoCapturer?.stopCapture()
        videoCapturer?.dispose()
        videoCapturer = null

        surfaceTextureHelper?.dispose()
        surfaceTextureHelper = null

        localVideoTrack?.dispose()
        localVideoTrack = null
        _localVideoTrack.value = null

        localAudioTrack?.dispose()
        localAudioTrack = null

        localVideoSource?.dispose()
        localVideoSource = null

        localAudioSource?.dispose()
        localAudioSource = null

        remoteVideoTrack = null
        _remoteVideoTrack.value = null

        peerConnection?.close()
        peerConnection?.dispose()
        peerConnection = null

        reconnectAttempts = 0
    }
}

/**
 * Connection quality levels
 */
enum class ConnectionQuality {
    UNKNOWN,
    EXCELLENT,
    GOOD,
    FAIR,
    POOR,
    DISCONNECTED
}

/**
 * Call statistics
 */
data class CallStats(
    val bytesReceived: Long,
    val bytesSent: Long,
    val packetsLost: Int,
    val jitter: Double,
    val rtt: Double
)
