package com.chatr.app.viewmodel

import com.chatr.app.data.repository.AuthRepository
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
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {
    
    private val testDispatcher = StandardTestDispatcher()
    private lateinit var authRepository: AuthRepository
    private lateinit var viewModel: AuthViewModel
    
    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        authRepository = mockk(relaxed = true)
        viewModel = AuthViewModel(authRepository)
    }
    
    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }
    
    @Test
    fun `initial state is not authenticated`() = runTest {
        val state = viewModel.authState.first()
        assertFalse(state.isAuthenticated)
        assertNull(state.user)
    }
    
    @Test
    fun `sendOtp updates loading state`() = runTest {
        coEvery { authRepository.sendOtp(any()) } returns Result.success(Unit)
        
        viewModel.sendOtp("+919999999999")
        testDispatcher.scheduler.advanceUntilIdle()
        
        val state = viewModel.authState.first()
        assertFalse(state.isLoading)
    }
    
    @Test
    fun `verifyOtp success updates authenticated state`() = runTest {
        coEvery { authRepository.verifyOtp(any(), any()) } returns Result.success(mockk(relaxed = true))
        
        viewModel.verifyOtp("+919999999999", "123456")
        testDispatcher.scheduler.advanceUntilIdle()
        
        val isAuthenticated = viewModel.isAuthenticated.first()
        assertTrue(isAuthenticated)
    }
    
    @Test
    fun `verifyOtp failure shows error`() = runTest {
        coEvery { authRepository.verifyOtp(any(), any()) } returns Result.failure(Exception("Invalid OTP"))
        
        viewModel.verifyOtp("+919999999999", "000000")
        testDispatcher.scheduler.advanceUntilIdle()
        
        val state = viewModel.authState.first()
        assertNotNull(state.error)
        assertEquals("Invalid OTP", state.error)
    }
    
    @Test
    fun `logout clears authenticated state`() = runTest {
        coEvery { authRepository.logout() } returns Result.success(Unit)
        
        viewModel.logout()
        testDispatcher.scheduler.advanceUntilIdle()
        
        val isAuthenticated = viewModel.isAuthenticated.first()
        assertFalse(isAuthenticated)
    }
    
    @Test
    fun `clearError clears error state`() = runTest {
        viewModel.clearError()
        testDispatcher.scheduler.advanceUntilIdle()
        
        val state = viewModel.authState.first()
        assertNull(state.error)
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
}
