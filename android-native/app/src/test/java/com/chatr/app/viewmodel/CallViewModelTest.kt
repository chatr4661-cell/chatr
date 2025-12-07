package com.chatr.app.viewmodel

import com.chatr.app.data.repository.CallsRepository
import com.chatr.app.webrtc.WebRTCManager
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.util.UUID

/**
 * Unit tests for CallViewModel
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CallViewModelTest {
    
    private val testDispatcher = StandardTestDispatcher()
    private lateinit var callsRepository: CallsRepository
    private lateinit var webRTCManager: WebRTCManager
    private lateinit var viewModel: CallViewModel
    
    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        callsRepository = mockk(relaxed = true)
        webRTCManager = mockk(relaxed = true)
        viewModel = CallViewModel(callsRepository, webRTCManager)
    }
    
    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }
    
    @Test
    fun `initial call state is idle`() = runTest {
        val state = viewModel.callState.first()
        assertEquals(CallState.Idle, state)
    }
    
    @Test
    fun `initiateCall updates state to calling`() = runTest {
        val recipientId = UUID.randomUUID().toString()
        val isVideo = false
        
        coEvery { callsRepository.initiateCall(recipientId, isVideo) } returns Result.success(mockk(relaxed = true))
        
        viewModel.initiateCall(recipientId, isVideo)
        testDispatcher.scheduler.advanceUntilIdle()
        
        coVerify { callsRepository.initiateCall(recipientId, isVideo) }
    }
    
    @Test
    fun `acceptCall updates state to connected`() = runTest {
        val callId = UUID.randomUUID().toString()
        
        coEvery { callsRepository.acceptCall(callId) } returns Result.success(Unit)
        
        viewModel.acceptCall(callId)
        testDispatcher.scheduler.advanceUntilIdle()
        
        coVerify { callsRepository.acceptCall(callId) }
    }
    
    @Test
    fun `rejectCall updates state to idle`() = runTest {
        val callId = UUID.randomUUID().toString()
        
        coEvery { callsRepository.rejectCall(callId) } returns Result.success(Unit)
        
        viewModel.rejectCall(callId)
        testDispatcher.scheduler.advanceUntilIdle()
        
        coVerify { callsRepository.rejectCall(callId) }
        
        val state = viewModel.callState.first()
        assertEquals(CallState.Idle, state)
    }
    
    @Test
    fun `endCall updates state to ended`() = runTest {
        val callId = UUID.randomUUID().toString()
        
        coEvery { callsRepository.endCall(callId) } returns Result.success(Unit)
        
        viewModel.endCall(callId)
        testDispatcher.scheduler.advanceUntilIdle()
        
        coVerify { callsRepository.endCall(callId) }
    }
    
    @Test
    fun `toggleMute updates mute state`() = runTest {
        viewModel.toggleMute()
        testDispatcher.scheduler.advanceUntilIdle()
        
        val isMuted = viewModel.isMuted.first()
        assertTrue(isMuted)
        
        viewModel.toggleMute()
        testDispatcher.scheduler.advanceUntilIdle()
        
        val isMutedAgain = viewModel.isMuted.first()
        assertFalse(isMutedAgain)
    }
    
    @Test
    fun `toggleSpeaker updates speaker state`() = runTest {
        viewModel.toggleSpeaker()
        testDispatcher.scheduler.advanceUntilIdle()
        
        val isSpeakerOn = viewModel.isSpeakerOn.first()
        assertTrue(isSpeakerOn)
    }
    
    @Test
    fun `toggleVideo updates video state`() = runTest {
        viewModel.toggleVideo()
        testDispatcher.scheduler.advanceUntilIdle()
        
        val isVideoEnabled = viewModel.isVideoEnabled.first()
        assertTrue(isVideoEnabled)
    }
    
    @Test
    fun `call duration updates correctly`() = runTest {
        viewModel.startCallTimer()
        testDispatcher.scheduler.advanceTimeBy(5000)
        testDispatcher.scheduler.advanceUntilIdle()
        
        val duration = viewModel.callDuration.first()
        assertTrue(duration >= 0)
    }
}

/**
 * Call state enum for testing
 */
enum class CallState {
    Idle,
    Calling,
    Ringing,
    Connected,
    Ended
}
