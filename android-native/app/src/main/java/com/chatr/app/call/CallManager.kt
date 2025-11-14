package com.chatr.app.call

import android.content.Context
import android.os.Build
import androidx.annotation.RequiresApi
import com.chatr.app.webrtc.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import org.webrtc.IceCandidate
import org.webrtc.MediaStream
import org.webrtc.SessionDescription

class CallManager(
    private val context: Context,
    private val userId: String
) {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    private val signalingClient = CallSignaling(
        "wss://your-backend.com/signaling" // Replace with actual URL
    )
    
    private val mediaManager = MediaManager(context)
    private var peerConnectionManager: PeerConnectionManager? = null
    
    private val _activeCall = MutableStateFlow<ActiveCall?>(null)
    val activeCall: StateFlow<ActiveCall?> = _activeCall
    
    private val _callState = MutableStateFlow<CallState>(CallState.IDLE)
    val callState: StateFlow<CallState> = _callState
    
    private val _remoteStream = MutableStateFlow<MediaStream?>(null)
    val remoteStream: StateFlow<MediaStream?> = _remoteStream
    
    init {
        signalingClient.connect(userId)
        setupSignalingListeners()
    }
    
    private fun setupSignalingListeners() {
        scope.launch {
            signalingClient.callOfferFlow.collect { offer ->
                handleIncomingOffer(offer)
            }
        }
        
        scope.launch {
            signalingClient.callAnswerFlow.collect { answer ->
                handleCallAnswer(answer)
            }
        }
        
        scope.launch {
            signalingClient.iceCandidateFlow.collect { candidate ->
                handleIceCandidate(candidate)
            }
        }
        
        scope.launch {
            signalingClient.callEndFlow.collect { callId ->
                if (_activeCall.value?.callId == callId) {
                    endCall()
                }
            }
        }
    }
    
    fun initiateCall(
        callId: String,
        recipientId: String,
        recipientName: String,
        isVideo: Boolean
    ) {
        _activeCall.value = ActiveCall(
            callId = callId,
            partnerId = recipientId,
            partnerName = recipientName,
            isVideo = isVideo,
            isOutgoing = true
        )
        _callState.value = CallState.INITIATING
        
        // Initialize peer connection
        peerConnectionManager = PeerConnectionManager(context, signalingClient)
        
        val stunServers = listOf(
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302"
        )
        
        val turnConfig = TurnConfig(
            url = "turn:openrelay.metered.ca:80",
            username = "openrelayproject",
            password = "openrelayproject"
        )
        
        peerConnectionManager?.createPeerConnection(
            stunServers = stunServers,
            turnServer = turnConfig,
            onIceCandidate = { candidate ->
                signalingClient.sendIceCandidate(callId, recipientId, candidate)
            },
            onAddStream = { stream ->
                _remoteStream.value = stream
            },
            onRemoveStream = { _ ->
                _remoteStream.value = null
            }
        )
        
        // Create local media stream
        val localStream = mediaManager.createLocalMediaStream(isVideo)
        localStream?.let {
            peerConnectionManager?.addLocalStream(it)
        }
        
        // Create offer
        peerConnectionManager?.createOffer(
            videoEnabled = isVideo,
            onSuccess = { sdp ->
                signalingClient.sendCallOffer(callId, recipientId, sdp, isVideo)
                _callState.value = CallState.RINGING
            },
            onError = { error ->
                _callState.value = CallState.FAILED
            }
        )
    }
    
    private fun handleIncomingOffer(offer: CallOffer) {
        _activeCall.value = ActiveCall(
            callId = offer.callId,
            partnerId = offer.from,
            partnerName = "Unknown", // Should be fetched from contacts
            isVideo = offer.isVideo,
            isOutgoing = false
        )
        _callState.value = CallState.INCOMING
        
        // Store offer for later when user accepts
        val sdp = SessionDescription(
            SessionDescription.Type.fromCanonicalForm(offer.type),
            offer.sdp
        )
        
        // Show incoming call UI (handled by system or app UI)
    }
    
    fun acceptCall() {
        val call = _activeCall.value ?: return
        _callState.value = CallState.CONNECTING
        
        // Initialize peer connection
        peerConnectionManager = PeerConnectionManager(context, signalingClient)
        
        val stunServers = listOf(
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302"
        )
        
        val turnConfig = TurnConfig(
            url = "turn:openrelay.metered.ca:80",
            username = "openrelayproject",
            password = "openrelayproject"
        )
        
        peerConnectionManager?.createPeerConnection(
            stunServers = stunServers,
            turnServer = turnConfig,
            onIceCandidate = { candidate ->
                signalingClient.sendIceCandidate(call.callId, call.partnerId, candidate)
            },
            onAddStream = { stream ->
                _remoteStream.value = stream
                _callState.value = CallState.CONNECTED
            },
            onRemoveStream = { _ ->
                _remoteStream.value = null
            }
        )
        
        // Create local media stream
        val localStream = mediaManager.createLocalMediaStream(call.isVideo)
        localStream?.let {
            peerConnectionManager?.addLocalStream(it)
        }
        
        // Create answer (need to set remote description first from stored offer)
        // This would be implemented with the stored offer from handleIncomingOffer
    }
    
    fun rejectCall() {
        val call = _activeCall.value ?: return
        signalingClient.sendCallEnd(call.callId, call.partnerId)
        cleanup()
    }
    
    fun endCall() {
        val call = _activeCall.value ?: return
        signalingClient.sendCallEnd(call.callId, call.partnerId)
        cleanup()
    }
    
    private fun handleCallAnswer(answer: CallAnswer) {
        val sdp = SessionDescription(
            SessionDescription.Type.fromCanonicalForm(answer.type),
            answer.sdp
        )
        
        peerConnectionManager?.setRemoteDescription(
            sdp = sdp,
            onSuccess = {
                _callState.value = CallState.CONNECTED
            },
            onError = { error ->
                _callState.value = CallState.FAILED
            }
        )
    }
    
    private fun handleIceCandidate(candidateEvent: IceCandidateEvent) {
        val candidate = IceCandidate(
            candidateEvent.sdpMid,
            candidateEvent.sdpMLineIndex,
            candidateEvent.candidate
        )
        peerConnectionManager?.addIceCandidate(candidate)
    }
    
    fun toggleMicrophone() = mediaManager.toggleMicrophone()
    fun toggleVideo() = mediaManager.toggleVideo()
    fun switchCamera() = mediaManager.switchCamera()
    fun setAudioRoute(route: AudioRoute) = mediaManager.setAudioRoute(route)
    
    private fun cleanup() {
        _callState.value = CallState.IDLE
        _activeCall.value = null
        _remoteStream.value = null
        
        peerConnectionManager?.close()
        peerConnectionManager = null
        
        mediaManager.release()
    }
    
    fun dispose() {
        cleanup()
        signalingClient.disconnect()
        scope.cancel()
    }
}

data class ActiveCall(
    val callId: String,
    val partnerId: String,
    val partnerName: String,
    val isVideo: Boolean,
    val isOutgoing: Boolean
)

enum class CallState {
    IDLE,
    INITIATING,
    RINGING,
    INCOMING,
    CONNECTING,
    CONNECTED,
    FAILED,
    ENDED
}
