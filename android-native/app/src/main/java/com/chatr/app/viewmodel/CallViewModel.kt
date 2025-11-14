package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.CallData
import com.chatr.app.data.models.CallStatus
import com.chatr.app.data.models.CallType
import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.data.repository.CallRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CallViewModel @Inject constructor(
    private val callRepository: CallRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _currentCall = MutableStateFlow<CallData?>(null)
    val currentCall: StateFlow<CallData?> = _currentCall
    
    private val _isMuted = MutableStateFlow(false)
    val isMuted: StateFlow<Boolean> = _isMuted
    
    private val _isSpeakerOn = MutableStateFlow(false)
    val isSpeakerOn: StateFlow<Boolean> = _isSpeakerOn
    
    private val _isVideoEnabled = MutableStateFlow(true)
    val isVideoEnabled: StateFlow<Boolean> = _isVideoEnabled
    
    fun initiateCall(receiverId: String, type: CallType) {
        val callerId = authRepository.currentUser?.uid ?: return
        
        val callData = CallData(
            id = "",
            callerId = callerId,
            receiverId = receiverId,
            type = type,
            status = CallStatus.INITIATING,
            startTime = System.currentTimeMillis()
        )
        
        viewModelScope.launch {
            val result = callRepository.initiateCall(callData)
            if (result.isSuccess) {
                _currentCall.value = result.getOrNull()
            }
        }
    }
    
    fun acceptCall(callId: String) {
        viewModelScope.launch {
            val result = callRepository.acceptCall(callId)
            if (result.isSuccess) {
                _currentCall.value = result.getOrNull()
            }
        }
    }
    
    fun rejectCall(callId: String) {
        viewModelScope.launch {
            callRepository.rejectCall(callId)
            _currentCall.value = null
        }
    }
    
    fun endCall() {
        val callId = _currentCall.value?.id ?: return
        
        viewModelScope.launch {
            callRepository.endCall(callId)
            _currentCall.value = null
        }
    }
    
    fun toggleMute() {
        _isMuted.value = !_isMuted.value
    }
    
    fun toggleSpeaker() {
        _isSpeakerOn.value = !_isSpeakerOn.value
    }
    
    fun toggleVideo() {
        _isVideoEnabled.value = !_isVideoEnabled.value
    }
}
