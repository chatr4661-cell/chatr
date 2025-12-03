package com.chatr.app.webrtc

import android.content.Context
import android.util.Log
import com.chatr.app.data.repository.CallsRepository
import com.chatr.app.websocket.SignalingEvent
import com.chatr.app.websocket.WebRTCSignalingClient
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import org.webrtc.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * WebRTC Manager - Handles peer connection, media streams, and call management
 */
@Singleton
class WebRTCManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val signalingClient: WebRTCSignalingClient,
    private val callsRepository: CallsRepository
) {
    
    private val TAG = "WebRTCManager"
    private val scope = CoroutineScope(Dispatchers.Main)
    
    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var localVideoTrack: VideoTrack? = null
    private var localAudioTrack: AudioTrack? = null
    private var videoCapturer: VideoCapturer? = null
    private var surfaceTextureHelper: SurfaceTextureHelper? = null
    
    private var localVideoSource: VideoSource? = null
    private var localAudioSource: AudioSource? = null
    
    private val _callState = MutableStateFlow<CallState>(CallState.Idle)
    val callState: StateFlow<CallState> = _callState
    
    private val _remoteVideoTrack = MutableStateFlow<VideoTrack?>(null)
    val remoteVideoTrack: StateFlow<VideoTrack?> = _remoteVideoTrack
    
    private val _localVideoTrack = MutableStateFlow<VideoTrack?>(null)
    val localVideoTrackFlow: StateFlow<VideoTrack?> = _localVideoTrack
    
    private var currentCallId: String? = null
    private var isVideoCall: Boolean = false
    
    // Default ICE servers with TURN support
    private val defaultIceServers = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun2.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("turn:openrelay.metered.ca:80")
            .setUsername("openrelayproject")
            .setPassword("openrelayproject")
            .createIceServer(),
        PeerConnection.IceServer.builder("turn:openrelay.metered.ca:443")
            .setUsername("openrelayproject")
            .setPassword("openrelayproject")
            .createIceServer()
    )
    
    init {
        initializePeerConnectionFactory()
        observeSignalingEvents()
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
            .createPeerConnectionFactory()
    }
    
    private fun observeSignalingEvents() {
        scope.launch {
            signalingClient.signalingEvents.collect { event ->
                when (event) {
                    is SignalingEvent.Connected -> {
                        Log.d(TAG, "Signaling connected")
                    }
                    is SignalingEvent.Offer -> {
                        handleRemoteOffer(event.callId, event.sdp, event.isVideo)
                    }
                    is SignalingEvent.Answer -> {
                        handleRemoteAnswer(event.sdp)
                    }
                    is SignalingEvent.IceCandidate -> {
                        handleRemoteIceCandidate(event.candidate)
                    }
                    is SignalingEvent.CallEnded -> {
                        endCall()
                    }
                    is SignalingEvent.Error -> {
                        _callState.value = CallState.Error(event.message)
                    }
                    is SignalingEvent.Disconnected -> {
                        Log.d(TAG, "Signaling disconnected")
                    }
                }
            }
        }
    }
    
    /**
     * Initialize a call (caller side)
     */
    suspend fun initiateCall(receiverId: String, isVideo: Boolean, token: String): Result<String> {
        return try {
            isVideoCall = isVideo
            _callState.value = CallState.Connecting
            
            // First, initiate call via API
            val result = callsRepository.initiateCall(receiverId, if (isVideo) "video" else "audio")
            
            result.fold(
                onSuccess = { callData ->
                    currentCallId = callData.id
                    
                    // Connect to signaling
                    signalingClient.connect(callData.id, token)
                    
                    // Create peer connection and offer
                    createPeerConnection()
                    setupLocalMedia(isVideo)
                    createOffer()
                    
                    _callState.value = CallState.Ringing
                    Result.success(callData.id)
                },
                onFailure = { error ->
                    _callState.value = CallState.Error(error.message ?: "Failed to initiate call")
                    Result.failure(error)
                }
            )
        } catch (e: Exception) {
            _callState.value = CallState.Error(e.message ?: "Failed to initiate call")
            Result.failure(e)
        }
    }
    
    /**
     * Accept an incoming call (receiver side)
     */
    suspend fun acceptCall(callId: String, isVideo: Boolean, token: String) {
        try {
            currentCallId = callId
            isVideoCall = isVideo
            _callState.value = CallState.Connecting
            
            // Accept call via API
            callsRepository.acceptCall(callId)
            
            // Connect to signaling
            signalingClient.connect(callId, token)
            
            // Create peer connection
            createPeerConnection()
            setupLocalMedia(isVideo)
            
        } catch (e: Exception) {
            _callState.value = CallState.Error(e.message ?: "Failed to accept call")
        }
    }
    
    /**
     * Reject an incoming call
     */
    suspend fun rejectCall(callId: String) {
        callsRepository.rejectCall(callId)
        _callState.value = CallState.Idle
    }
    
    /**
     * End the current call
     */
    fun endCall() {
        currentCallId?.let { callId ->
            signalingClient.sendEndCall(callId)
            scope.launch {
                callsRepository.endCall(callId)
            }
        }
        
        cleanup()
        _callState.value = CallState.Idle
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
     * Set local video renderer
     */
    fun setLocalRenderer(renderer: SurfaceViewRenderer) {
        localVideoTrack?.addSink(renderer)
    }
    
    /**
     * Set remote video renderer
     */
    fun setRemoteRenderer(renderer: SurfaceViewRenderer) {
        _remoteVideoTrack.value?.addSink(renderer)
    }
    
    private fun createPeerConnection() {
        val rtcConfig = PeerConnection.RTCConfiguration(defaultIceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        }
        
        peerConnection = peerConnectionFactory?.createPeerConnection(
            rtcConfig,
            object : PeerConnection.Observer {
                override fun onIceCandidate(candidate: IceCandidate?) {
                    candidate?.let {
                        currentCallId?.let { callId ->
                            signalingClient.sendIceCandidate(callId, it.sdp)
                        }
                    }
                }
                
                override fun onTrack(transceiver: RtpTransceiver?) {
                    transceiver?.receiver?.track()?.let { track ->
                        if (track is VideoTrack) {
                            _remoteVideoTrack.value = track
                        }
                    }
                }
                
                override fun onConnectionChange(state: PeerConnection.PeerConnectionState?) {
                    Log.d(TAG, "Connection state: $state")
                    when (state) {
                        PeerConnection.PeerConnectionState.CONNECTED -> {
                            _callState.value = CallState.Connected
                        }
                        PeerConnection.PeerConnectionState.DISCONNECTED,
                        PeerConnection.PeerConnectionState.FAILED -> {
                            _callState.value = CallState.Error("Connection lost")
                        }
                        else -> {}
                    }
                }
                
                override fun onSignalingChange(state: PeerConnection.SignalingState?) {}
                override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {}
                override fun onIceConnectionReceivingChange(receiving: Boolean) {}
                override fun onIceGatheringChange(state: PeerConnection.IceGatheringState?) {}
                override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}
                override fun onAddStream(stream: MediaStream?) {}
                override fun onRemoveStream(stream: MediaStream?) {}
                override fun onDataChannel(channel: DataChannel?) {}
                override fun onRenegotiationNeeded() {}
            }
        )
    }
    
    private fun setupLocalMedia(isVideo: Boolean) {
        // Audio
        val audioConstraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("googEchoCancellation", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googNoiseSuppression", "true"))
        }
        
        localAudioSource = peerConnectionFactory?.createAudioSource(audioConstraints)
        localAudioTrack = peerConnectionFactory?.createAudioTrack("audio0", localAudioSource)
        localAudioTrack?.setEnabled(true)
        
        peerConnection?.addTrack(localAudioTrack, listOf("stream0"))
        
        // Video (if video call)
        if (isVideo) {
            videoCapturer = createCameraCapturer()
            videoCapturer?.let { capturer ->
                surfaceTextureHelper = SurfaceTextureHelper.create("CaptureThread", EglBase.create().eglBaseContext)
                localVideoSource = peerConnectionFactory?.createVideoSource(capturer.isScreencast)
                capturer.initialize(surfaceTextureHelper, context, localVideoSource?.capturerObserver)
                capturer.startCapture(1280, 720, 30)
                
                localVideoTrack = peerConnectionFactory?.createVideoTrack("video0", localVideoSource)
                localVideoTrack?.setEnabled(true)
                _localVideoTrack.value = localVideoTrack
                
                peerConnection?.addTrack(localVideoTrack, listOf("stream0"))
            }
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
    
    private fun createOffer() {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", isVideoCall.toString()))
        }
        
        peerConnection?.createOffer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription?) {
                sdp?.let {
                    peerConnection?.setLocalDescription(object : SdpObserver {
                        override fun onSetSuccess() {
                            currentCallId?.let { callId ->
                                signalingClient.sendOffer(callId, it.description, isVideoCall)
                            }
                        }
                        override fun onSetFailure(error: String?) {}
                        override fun onCreateSuccess(sdp: SessionDescription?) {}
                        override fun onCreateFailure(error: String?) {}
                    }, it)
                }
            }
            override fun onSetSuccess() {}
            override fun onCreateFailure(error: String?) {
                _callState.value = CallState.Error(error ?: "Failed to create offer")
            }
            override fun onSetFailure(error: String?) {}
        }, constraints)
    }
    
    private fun handleRemoteOffer(callId: String, sdp: String, isVideo: Boolean) {
        isVideoCall = isVideo
        currentCallId = callId
        
        val sessionDescription = SessionDescription(SessionDescription.Type.OFFER, sdp)
        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onSetSuccess() {
                createAnswer()
            }
            override fun onSetFailure(error: String?) {}
            override fun onCreateSuccess(sdp: SessionDescription?) {}
            override fun onCreateFailure(error: String?) {}
        }, sessionDescription)
    }
    
    private fun createAnswer() {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", isVideoCall.toString()))
        }
        
        peerConnection?.createAnswer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription?) {
                sdp?.let {
                    peerConnection?.setLocalDescription(object : SdpObserver {
                        override fun onSetSuccess() {
                            currentCallId?.let { callId ->
                                signalingClient.sendAnswer(callId, it.description)
                            }
                        }
                        override fun onSetFailure(error: String?) {}
                        override fun onCreateSuccess(sdp: SessionDescription?) {}
                        override fun onCreateFailure(error: String?) {}
                    }, it)
                }
            }
            override fun onSetSuccess() {}
            override fun onCreateFailure(error: String?) {}
            override fun onSetFailure(error: String?) {}
        }, constraints)
    }
    
    private fun handleRemoteAnswer(sdp: String) {
        val sessionDescription = SessionDescription(SessionDescription.Type.ANSWER, sdp)
        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onSetSuccess() {
                _callState.value = CallState.Connected
            }
            override fun onSetFailure(error: String?) {}
            override fun onCreateSuccess(sdp: SessionDescription?) {}
            override fun onCreateFailure(error: String?) {}
        }, sessionDescription)
    }
    
    private fun handleRemoteIceCandidate(candidateSdp: String) {
        val candidate = IceCandidate("", 0, candidateSdp)
        peerConnection?.addIceCandidate(candidate)
    }
    
    private fun cleanup() {
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
        
        peerConnection?.close()
        peerConnection = null
        
        _remoteVideoTrack.value = null
        
        signalingClient.disconnect()
        currentCallId = null
    }
}

sealed class CallState {
    object Idle : CallState()
    object Connecting : CallState()
    object Ringing : CallState()
    object Connected : CallState()
    data class Error(val message: String) : CallState()
}
