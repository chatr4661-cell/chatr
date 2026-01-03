package com.chatr.app.webrtc.bridge

import android.content.Context
import android.util.Log
import com.chatr.app.webrtc.audio.AudioRoute
import com.chatr.app.webrtc.audio.AudioRouteManager
import com.chatr.app.webrtc.core.ConnectionQuality
import com.chatr.app.webrtc.core.WebRtcClient
import com.chatr.app.webrtc.state.CallState
import com.chatr.app.webrtc.state.CallStateListener
import com.chatr.app.webrtc.state.CallStateMachine
import com.chatr.app.websocket.WebRTCSignalingClient
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import org.webrtc.IceCandidate
import org.webrtc.PeerConnection
import org.webrtc.SessionDescription
import org.webrtc.SurfaceViewRenderer
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Telecom ↔ WebRTC Bridge
 * 
 * CRITICAL: This is what makes CHATR calls work like GSM calls
 * 
 * Binds:
 * - ChatrConnection (Telecom Framework)
 * - WebRtcClient (Media Transport)
 * - AudioRouteManager (Audio Routing)
 * - CallStateMachine (State Management)
 * - WebRTCSignalingClient (Signaling)
 * 
 * Ensures:
 * - onAnswer() → starts WebRTC
 * - onHold() → mutes RTP
 * - onDisconnect() → closes PeerConnection
 * - Audio focus mirrors GSM behavior
 */
@Singleton
class TelecomWebRtcBridge @Inject constructor(
    @ApplicationContext private val context: Context,
    private val webRtcClient: WebRtcClient,
    private val audioRouteManager: AudioRouteManager,
    private val callStateMachine: CallStateMachine,
    private val signalingClient: WebRTCSignalingClient
) : CallStateListener {

    companion object {
        private const val TAG = "TelecomWebRtcBridge"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Current call info
    private var currentCallId: String? = null
    private var currentToken: String? = null
    private var isVideoCall: Boolean = false
    private var isIncoming: Boolean = false

    // Pending ICE candidates (received before remote description set)
    private val pendingIceCandidates = mutableListOf<IceCandidate>()
    private var isRemoteDescriptionSet = false

    private val _isMuted = MutableStateFlow(false)
    val isMuted: StateFlow<Boolean> = _isMuted.asStateFlow()

    private val _isSpeaker = MutableStateFlow(false)
    val isSpeaker: StateFlow<Boolean> = _isSpeaker.asStateFlow()

    private val _isVideoEnabled = MutableStateFlow(true)
    val isVideoEnabled: StateFlow<Boolean> = _isVideoEnabled.asStateFlow()

    private val _isOnHold = MutableStateFlow(false)
    val isOnHold: StateFlow<Boolean> = _isOnHold.asStateFlow()

    init {
        callStateMachine.addListener(this)
        observeSignaling()
        observeAudioRoute()
    }

    /**
     * Initialize bridge for a new call
     */
    fun initializeCall(
        callId: String,
        token: String,
        isVideo: Boolean,
        isIncomingCall: Boolean
    ) {
        Log.d(TAG, "Initializing call: $callId (video: $isVideo, incoming: $isIncomingCall)")

        currentCallId = callId
        currentToken = token
        isVideoCall = isVideo
        isIncoming = isIncomingCall
        isRemoteDescriptionSet = false
        pendingIceCandidates.clear()

        // Reset states
        _isMuted.value = false
        _isSpeaker.value = false
        _isVideoEnabled.value = isVideo
        _isOnHold.value = false

        // Initialize audio routing
        audioRouteManager.initialize()

        // Connect to signaling
        scope.launch {
            signalingClient.connect(callId, token)
        }
    }

    /**
     * Called when call is answered (from Telecom Connection.onAnswer())
     */
    fun onCallAnswered() {
        Log.d(TAG, "Call answered, starting WebRTC")

        callStateMachine.transition(CallState.Connecting)

        // Initialize WebRTC
        val initialized = webRtcClient.initialize(
            isVideo = isVideoCall,
            onIceCandidate = { candidate ->
                sendIceCandidate(candidate)
            },
            onStreamAdded = { stream ->
                Log.d(TAG, "Remote stream added: ${stream.id}")
            },
            onConnectionState = { state ->
                handleConnectionStateChange(state)
            }
        )

        if (!initialized) {
            Log.e(TAG, "Failed to initialize WebRTC")
            callStateMachine.transition(CallState.Failed())
            return
        }

        // Setup local media
        webRtcClient.setupLocalMedia(isVideoCall)

        // If incoming, we wait for offer
        // If outgoing, create offer
        if (!isIncoming) {
            createAndSendOffer()
        }
    }

    /**
     * Called when call is rejected
     */
    fun onCallRejected() {
        Log.d(TAG, "Call rejected")
        cleanup()
    }

    /**
     * Called when call is disconnected
     */
    fun onCallDisconnected() {
        Log.d(TAG, "Call disconnected")
        currentCallId?.let { callId ->
            scope.launch {
                signalingClient.sendEndCall(callId)
            }
        }
        cleanup()
    }

    /**
     * Called when call is put on hold
     */
    fun onCallHold(isHeld: Boolean) {
        Log.d(TAG, "Call hold: $isHeld")
        _isOnHold.value = isHeld
        
        // Mute RTP when on hold
        if (isHeld) {
            webRtcClient.toggleMute()
            callStateMachine.transition(CallState.OnHold)
        } else {
            webRtcClient.toggleMute()
            callStateMachine.transition(CallState.Connected)
        }
    }

    /**
     * Handle incoming SDP offer
     */
    fun handleRemoteOffer(sdp: String) {
        Log.d(TAG, "Received remote offer")

        val sessionDescription = SessionDescription(SessionDescription.Type.OFFER, sdp)
        webRtcClient.setRemoteDescription(sessionDescription) { success ->
            if (success) {
                isRemoteDescriptionSet = true
                processPendingIceCandidates()
                createAndSendAnswer()
            } else {
                Log.e(TAG, "Failed to set remote offer")
                callStateMachine.transition(CallState.Failed())
            }
        }
    }

    /**
     * Handle incoming SDP answer
     */
    fun handleRemoteAnswer(sdp: String) {
        Log.d(TAG, "Received remote answer")

        val sessionDescription = SessionDescription(SessionDescription.Type.ANSWER, sdp)
        webRtcClient.setRemoteDescription(sessionDescription) { success ->
            if (success) {
                isRemoteDescriptionSet = true
                processPendingIceCandidates()
            } else {
                Log.e(TAG, "Failed to set remote answer")
            }
        }
    }

    /**
     * Handle incoming ICE candidate
     */
    fun handleRemoteIceCandidate(sdpMid: String?, sdpMLineIndex: Int, candidate: String) {
        val iceCandidate = IceCandidate(sdpMid ?: "", sdpMLineIndex, candidate)

        if (isRemoteDescriptionSet) {
            webRtcClient.addIceCandidate(iceCandidate)
        } else {
            // Queue for later
            pendingIceCandidates.add(iceCandidate)
            Log.d(TAG, "Queued ICE candidate (remote description not set)")
        }
    }

    /**
     * Toggle mute
     */
    fun toggleMute(): Boolean {
        val isMuted = webRtcClient.toggleMute()
        _isMuted.value = isMuted
        audioRouteManager.setMuted(isMuted)
        return isMuted
    }

    /**
     * Toggle speaker
     */
    fun toggleSpeaker(): Boolean {
        val isSpeaker = audioRouteManager.toggleSpeaker()
        _isSpeaker.value = isSpeaker
        return isSpeaker
    }

    /**
     * Toggle camera
     */
    fun toggleCamera(): Boolean {
        val isOff = webRtcClient.toggleCamera()
        _isVideoEnabled.value = !isOff
        return isOff
    }

    /**
     * Switch camera (front/back)
     */
    fun switchCamera() {
        webRtcClient.switchCamera()
    }

    /**
     * Set audio route
     */
    fun setAudioRoute(route: AudioRoute) {
        audioRouteManager.setAudioRoute(route)
        _isSpeaker.value = route == AudioRoute.SPEAKER
    }

    /**
     * Attach local video renderer
     */
    fun attachLocalRenderer(renderer: SurfaceViewRenderer) {
        webRtcClient.attachLocalRenderer(renderer)
    }

    /**
     * Attach remote video renderer
     */
    fun attachRemoteRenderer(renderer: SurfaceViewRenderer) {
        webRtcClient.attachRemoteRenderer(renderer)
    }

    /**
     * Get current call state
     */
    fun getCurrentState(): CallState = callStateMachine.currentState.value

    /**
     * Get connection quality
     */
    fun getConnectionQuality(): ConnectionQuality = webRtcClient.connectionQuality.value

    private fun createAndSendOffer() {
        webRtcClient.createOffer { sdp ->
            sdp?.let {
                currentCallId?.let { callId ->
                    scope.launch {
                        signalingClient.sendOffer(callId, it.description, isVideoCall)
                    }
                }
            }
        }
    }

    private fun createAndSendAnswer() {
        webRtcClient.createAnswer { sdp ->
            sdp?.let {
                currentCallId?.let { callId ->
                    scope.launch {
                        signalingClient.sendAnswer(callId, it.description)
                    }
                }
            }
        }
    }

    private fun sendIceCandidate(candidate: IceCandidate) {
        currentCallId?.let { callId ->
            scope.launch {
                signalingClient.sendIceCandidate(callId, candidate.sdp)
            }
        }
    }

    private fun processPendingIceCandidates() {
        Log.d(TAG, "Processing ${pendingIceCandidates.size} pending ICE candidates")
        pendingIceCandidates.forEach { candidate ->
            webRtcClient.addIceCandidate(candidate)
        }
        pendingIceCandidates.clear()
    }

    private fun handleConnectionStateChange(state: PeerConnection.PeerConnectionState) {
        when (state) {
            PeerConnection.PeerConnectionState.CONNECTED -> {
                Log.d(TAG, "Peer connection connected")
            }
            PeerConnection.PeerConnectionState.DISCONNECTED -> {
                Log.d(TAG, "Peer connection disconnected")
                // Attempt ICE restart
                webRtcClient.restartIce()
            }
            PeerConnection.PeerConnectionState.FAILED -> {
                Log.e(TAG, "Peer connection failed")
            }
            else -> {}
        }
    }

    private fun observeSignaling() {
        signalingClient.signalingEvents
            .onEach { event ->
                when (event) {
                    is WebRTCSignalingClient.SignalingEvent.Offer -> {
                        handleRemoteOffer(event.sdp)
                    }
                    is WebRTCSignalingClient.SignalingEvent.Answer -> {
                        handleRemoteAnswer(event.sdp)
                    }
                    is WebRTCSignalingClient.SignalingEvent.IceCandidate -> {
                        handleRemoteIceCandidate("", 0, event.candidate)
                    }
                    is WebRTCSignalingClient.SignalingEvent.CallEnded -> {
                        onCallDisconnected()
                    }
                    else -> {}
                }
            }
            .launchIn(scope)
    }

    private fun observeAudioRoute() {
        audioRouteManager.currentRoute
            .onEach { route ->
                _isSpeaker.value = route == AudioRoute.SPEAKER
            }
            .launchIn(scope)
    }

    override fun onStateChanged(from: CallState, to: CallState) {
        Log.d(TAG, "Call state changed: $from -> $to")
        
        when (to) {
            is CallState.Disconnected, is CallState.Failed -> {
                cleanup()
            }
            else -> {}
        }
    }

    private fun cleanup() {
        Log.d(TAG, "Cleaning up bridge")

        webRtcClient.dispose()
        audioRouteManager.release()
        
        scope.launch {
            signalingClient.disconnect()
        }

        currentCallId = null
        currentToken = null
        isRemoteDescriptionSet = false
        pendingIceCandidates.clear()

        callStateMachine.reset()
    }
}
