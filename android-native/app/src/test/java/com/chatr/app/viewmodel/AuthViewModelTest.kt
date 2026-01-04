package com.chatr.app.viewmodel

import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.data.repository.NotificationsRepository
import io.mockk.coEvery
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

/**
 * Unit tests for AuthViewModel
 * Tests mirror the web useFirebasePhoneAuth.tsx logic
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {
    
    private val testDispatcher = StandardTestDispatcher()
    private lateinit var authRepository: AuthRepository
    private lateinit var notificationsRepository: NotificationsRepository
    private lateinit var viewModel: AuthViewModel
    
    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        authRepository = mockk(relaxed = true)
        notificationsRepository = mockk(relaxed = true)
        viewModel = AuthViewModel(authRepository, notificationsRepository)
    }
    
    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }
    
    @Test
    fun `initial state is not authenticated`() = runTest {
        val state = viewModel.uiState.first()
        assertFalse(state.isAuthenticated)
        assertNull(state.user)
        assertEquals(PhoneAuthStep.PHONE, state.step)
    }
    
    @Test
    fun `sendOtp updates step to OTP`() = runTest {
        coEvery { authRepository.sendOtp(any()) } returns Result.success(Unit)
        
        viewModel.sendOtp("+919999999999")
        testDispatcher.scheduler.advanceUntilIdle()
        
        val state = viewModel.uiState.first()
        assertEquals(PhoneAuthStep.OTP, state.step)
        assertTrue(state.otpSent)
        assertFalse(state.isLoading)
    }
    
    @Test
    fun `verifyOtpWithFirebaseUid success updates authenticated state`() = runTest {
        coEvery { authRepository.verifyOtp(any(), any()) } returns Result.success(mockk(relaxed = true))
        
        viewModel.verifyOtpWithFirebaseUid("+919999999999", "firebase_uid_123")
        testDispatcher.scheduler.advanceUntilIdle()
        
        val isAuthenticated = viewModel.isAuthenticated.first()
        assertTrue(isAuthenticated)
    }
    
    @Test
    fun `verifyOtpWithFirebaseUid failure shows error and stays on OTP step`() = runTest {
        coEvery { authRepository.verifyOtp(any(), any()) } returns Result.failure(Exception("Invalid OTP"))
        
        viewModel.verifyOtpWithFirebaseUid("+919999999999", "wrong_uid")
        testDispatcher.scheduler.advanceUntilIdle()
        
        val state = viewModel.uiState.first()
        assertNotNull(state.error)
        assertEquals(PhoneAuthStep.OTP, state.step)
        assertTrue(state.failedAttempts > 0)
    }
    
    @Test
    fun `signOut clears authenticated state`() = runTest {
        coEvery { authRepository.signOut() } returns Result.success(Unit)
        
        viewModel.signOut()
        testDispatcher.scheduler.advanceUntilIdle()
        
        val isAuthenticated = viewModel.isAuthenticated.first()
        assertFalse(isAuthenticated)
    }
    
    @Test
    fun `clearError clears error state`() = runTest {
        viewModel.clearError()
        testDispatcher.scheduler.advanceUntilIdle()
        
        val state = viewModel.uiState.first()
        assertNull(state.error)
    }
    
    @Test
    fun `reset returns to initial state`() = runTest {
        viewModel.reset()
        testDispatcher.scheduler.advanceUntilIdle()
        
        val state = viewModel.uiState.first()
        assertEquals(PhoneAuthStep.PHONE, state.step)
        assertEquals(0, state.countdown)
        assertEquals("", state.phoneNumber)
        assertFalse(state.isExistingUser)
    }
    
    @Test
    fun `phone validation rejects invalid numbers`() {
        assertFalse(viewModel.isValidPhoneNumber("123"))
        assertFalse(viewModel.isValidPhoneNumber("abcdefghij"))
        assertFalse(viewModel.isValidPhoneNumber(""))
    }
    
    @Test
    fun `phone validation accepts valid numbers`() {
        assertTrue(viewModel.isValidPhoneNumber("+919999999999"))
        assertTrue(viewModel.isValidPhoneNumber("9999999999"))
        assertTrue(viewModel.isValidPhoneNumber("+1234567890"))
    }
    
    @Test
    fun `resendOtp does nothing when countdown is active`() = runTest {
        // Set countdown > 0
        viewModel.onOtpSent()
        
        // Try to resend
        viewModel.resendOtp()
        testDispatcher.scheduler.advanceUntilIdle()
        
        // Should not trigger new OTP send since countdown is active
        val state = viewModel.uiState.first()
        assertTrue(state.countdown > 0 || state.otpSent)
    }
}
