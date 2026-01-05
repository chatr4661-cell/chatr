package com.chatr.app.presentation.calling

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.services.pstn.PSTNCallingService
import com.chatr.app.services.pstn.PstnRate
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for PSTN calling
 */
@HiltViewModel
class PSTNCallViewModel @Inject constructor(
    private val pstnService: PSTNCallingService
) : ViewModel() {
    
    private val _callState = MutableStateFlow(PSTNCallState.CONNECTING)
    val callState: StateFlow<PSTNCallState> = _callState.asStateFlow()
    
    private val _callDuration = MutableStateFlow(0)
    val callDuration: StateFlow<Int> = _callDuration.asStateFlow()
    
    private val _rate = MutableStateFlow<PstnRate?>(null)
    val rate: StateFlow<PstnRate?> = _rate.asStateFlow()
    
    private val _isMuted = MutableStateFlow(false)
    val isMuted: StateFlow<Boolean> = _isMuted.asStateFlow()
    
    private val _isSpeaker = MutableStateFlow(false)
    val isSpeaker: StateFlow<Boolean> = _isSpeaker.asStateFlow()
    
    private var callId: String? = null
    private var timerJob: Job? = null
    
    fun initiateCall(phoneNumber: String) {
        viewModelScope.launch {
            _rate.value = pstnService.getCallRate(phoneNumber)
            
            // Simulate connection
            delay(1500)
            _callState.value = PSTNCallState.RINGING
            
            delay(2000)
            _callState.value = PSTNCallState.CONNECTED
            startTimer()
            
            // Would actually call pstnService.initiateCall() in production
        }
    }
    
    private fun startTimer() {
        timerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _callDuration.value++
            }
        }
    }
    
    fun toggleMute() {
        _isMuted.value = !_isMuted.value
    }
    
    fun toggleSpeaker() {
        _isSpeaker.value = !_isSpeaker.value
    }
    
    fun showKeypad() {
        // Would show DTMF keypad
    }
    
    fun endCall() {
        timerJob?.cancel()
        _callState.value = PSTNCallState.ENDED
        
        viewModelScope.launch {
            callId?.let { pstnService.endCall(it) }
        }
    }
    
    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}
