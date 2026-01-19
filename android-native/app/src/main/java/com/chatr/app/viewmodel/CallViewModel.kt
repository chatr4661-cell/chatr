package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.*
import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.data.repository.CallsRepository
import com.chatr.app.websocket.WebRTCSignalingClient
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CallHistoryState(
    val isLoading: Boolean = false,
    val calls: List<CallData> = emptyList(),
    val error: String? = null
)

data class ActiveCallState(
    val isLoading: Boolean = false,
    val callData: CallData? = null,
    val callStatus: CallStatus = CallStatus.INITIATING,
    val isAudioEnabled: Boolean = true,
    val isVideoEnabled: Boolean = true,
    val isSpeakerOn: Boolean = false,
    val remoteSdp: String? = null,
    val remoteIceCandidates: List<String> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class CallViewModel @Inject constructor(
    private val callsRepository: CallsRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _callHistoryState = MutableStateFlow(CallHistoryState())
    val callHistoryState: StateFlow<CallHistoryState> = _callHistoryState.asStateFlow()
    
    private val _activeCallState = MutableStateFlow(ActiveCallState())
    val activeCallState: StateFlow<ActiveCallState> = _activeCallState.asStateFlow()
    
    // Legacy compatibility
    private val _currentCall = MutableStateFlow<CallData?>(null)
    val currentCall: StateFlow<CallData?> = _currentCall
    
    private val _isMuted = MutableStateFlow(false)
    val isMuted: StateFlow<Boolean> = _isMuted
    
    private val _isSpeakerOn = MutableStateFlow(false)
    val isSpeakerOn: StateFlow<Boolean> = _isSpeakerOn
    
    private val _isVideoEnabled = MutableStateFlow(true)
    val isVideoEnabled: StateFlow<Boolean> = _isVideoEnabled
    
    private var signalingClient: WebRTCSignalingClient? = null
    
    fun loadCallHistory(limit: Int = 50) {
        viewModelScope.launch {
            _callHistoryState.value = _callHistoryState.value.copy(isLoading = true, error = null)
            
            callsRepository.getCallHistory(limit).collect { result ->
                result.onSuccess { calls ->
                    _callHistoryState.value = _callHistoryState.value.copy(
                        isLoading = false,
                        calls = calls.sortedByDescending { it.startTime ?: 0L }
                    )
                }.onFailure { exception ->
                    _callHistoryState.value = _callHistoryState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "Failed to load call history"
                    )
                }
            }
        }
    }
    
    fun initiateCall(receiverId: String, type: CallType) {
        viewModelScope.launch {
            _activeCallState.value = _activeCallState.value.copy(
                isLoading = true,
                callStatus = CallStatus.INITIATING,
                error = null
            )
            
            callsRepository.initiateCall(receiverId, type)
                .onSuccess { callData ->
                    _activeCallState.value = _activeCallState.value.copy(
                        isLoading = false,
                        callData = callData,
                        callStatus = CallStatus.RINGING,
                        isVideoEnabled = type == CallType.VIDEO
                    )
                    _currentCall.value = callData
                    _isVideoEnabled.value = type == CallType.VIDEO
                    
                    connectSignaling(callData.id)
                }
                .onFailure { exception ->
                    _activeCallState.value = _activeCallState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "Failed to initiate call"
                    )
                }
        }
    }
    
    fun acceptCall(callId: String) {
        viewModelScope.launch {
            _activeCallState.value = _activeCallState.value.copy(isLoading = true)
            
            callsRepository.acceptCall(callId)
                .onSuccess { callData ->
                    _activeCallState.value = _activeCallState.value.copy(
                        isLoading = false,
                        callData = callData,
                        callStatus = CallStatus.ACTIVE
                    )
                    _currentCall.value = callData
                    
                    connectSignaling(callId)
                }
                .onFailure { exception ->
                    _activeCallState.value = _activeCallState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun rejectCall(callId: String) {
        viewModelScope.launch {
            callsRepository.rejectCall(callId)
                .onSuccess { callData ->
                    _activeCallState.value = ActiveCallState()
                    _currentCall.value = null
                }
                .onFailure { exception ->
                    _activeCallState.value = _activeCallState.value.copy(
                        error = exception.message
                    )
                }
        }
    }
    
    fun endCall() {
        viewModelScope.launch {
            val callId = _activeCallState.value.callData?.id ?: _currentCall.value?.id ?: return@launch
            
            callsRepository.endCall(callId)
                .onSuccess {
                    signalingClient?.sendEndCall(callId)
                    signalingClient?.disconnect()
                    signalingClient = null
                    _activeCallState.value = ActiveCallState()
                    _currentCall.value = null
                }
        }
    }
    
    private fun connectSignaling(callId: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        val token = authRepository.getAccessToken() ?: return
        
        // Get partner ID from active call state
        val callData = _activeCallState.value.callData
        val partnerId = if (callData?.callerId == userId) {
            callData.receiverId
        } else {
            callData?.callerId ?: ""
        }
        
        signalingClient = WebRTCSignalingClient(
            callId = callId,
            userId = userId,
            onSignalingEvent = { event ->
                handleSignalingEvent(event)
            }
        )
        
        // CRITICAL: Set partner ID and token BEFORE connecting
        signalingClient?.setPartnerId(partnerId)
        signalingClient?.setToken(token)
        signalingClient?.connect()
    }
    
    private fun handleSignalingEvent(event: WebRTCSignalingClient.SignalingEvent) {
        when (event) {
            is WebRTCSignalingClient.SignalingEvent.Offer -> {
                _activeCallState.value = _activeCallState.value.copy(
                    remoteSdp = event.sdp,
                    callStatus = CallStatus.RINGING
                )
            }
            is WebRTCSignalingClient.SignalingEvent.Answer -> {
                _activeCallState.value = _activeCallState.value.copy(
                    remoteSdp = event.sdp,
                    callStatus = CallStatus.ACTIVE
                )
            }
            is WebRTCSignalingClient.SignalingEvent.IceCandidate -> {
                val candidates = _activeCallState.value.remoteIceCandidates + event.candidate
                _activeCallState.value = _activeCallState.value.copy(
                    remoteIceCandidates = candidates
                )
            }
            is WebRTCSignalingClient.SignalingEvent.CallEnded -> {
                signalingClient?.disconnect()
                signalingClient = null
                _activeCallState.value = _activeCallState.value.copy(
                    callStatus = CallStatus.ENDED
                )
                _currentCall.value = null
            }
            is WebRTCSignalingClient.SignalingEvent.Error -> {
                _activeCallState.value = _activeCallState.value.copy(
                    error = event.message
                )
            }
        }
    }
    
    // Local call controls
    fun toggleMute() {
        _isMuted.value = !_isMuted.value
        _activeCallState.value = _activeCallState.value.copy(
            isAudioEnabled = !_isMuted.value
        )
    }
    
    fun toggleSpeaker() {
        _isSpeakerOn.value = !_isSpeakerOn.value
        _activeCallState.value = _activeCallState.value.copy(
            isSpeakerOn = _isSpeakerOn.value
        )
    }
    
    fun toggleVideo() {
        _isVideoEnabled.value = !_isVideoEnabled.value
        _activeCallState.value = _activeCallState.value.copy(
            isVideoEnabled = _isVideoEnabled.value
        )
    }
    
    // WebRTC SDP exchange
    fun sendOffer(sdp: String) {
        val callId = _activeCallState.value.callData?.id ?: return
        signalingClient?.sendOffer(callId, sdp, _activeCallState.value.callData?.type == CallType.VIDEO)
    }
    
    fun sendAnswer(sdp: String) {
        val callId = _activeCallState.value.callData?.id ?: return
        signalingClient?.sendAnswer(callId, sdp)
    }
    
    fun sendIceCandidate(candidate: String) {
        val callId = _activeCallState.value.callData?.id ?: return
        signalingClient?.sendIceCandidate(callId, candidate)
    }
    
    fun clearError() {
        _activeCallState.value = _activeCallState.value.copy(error = null)
        _callHistoryState.value = _callHistoryState.value.copy(error = null)
    }
    
    override fun onCleared() {
        super.onCleared()
        signalingClient?.disconnect()
    }
}
