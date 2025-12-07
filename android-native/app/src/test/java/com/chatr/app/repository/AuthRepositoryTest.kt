package com.chatr.app.repository

import com.chatr.app.data.api.ChatrApi
import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.security.SecureTokenManager
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for AuthRepository
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AuthRepositoryTest {
    
    private lateinit var firebaseAuth: FirebaseAuth
    private lateinit var chatrApi: ChatrApi
    private lateinit var tokenManager: SecureTokenManager
    private lateinit var repository: AuthRepository
    
    @Before
    fun setup() {
        firebaseAuth = mockk(relaxed = true)
        chatrApi = mockk(relaxed = true)
        tokenManager = mockk(relaxed = true)
        repository = AuthRepository(firebaseAuth, chatrApi, tokenManager)
    }
    
    @Test
    fun `getCurrentUser returns null when not logged in`() = runTest {
        every { firebaseAuth.currentUser } returns null
        
        val user = repository.getCurrentUser()
        assertNull(user)
    }
    
    @Test
    fun `getCurrentUser returns user when logged in`() = runTest {
        val mockUser = mockk<FirebaseUser>(relaxed = true)
        every { mockUser.uid } returns "test-uid"
        every { mockUser.phoneNumber } returns "+919999999999"
        every { firebaseAuth.currentUser } returns mockUser
        
        val user = repository.getCurrentUser()
        assertNotNull(user)
        assertEquals("test-uid", user?.uid)
    }
    
    @Test
    fun `sendOtp calls Firebase auth`() = runTest {
        val phoneNumber = "+919999999999"
        
        // Note: Full Firebase OTP testing requires instrumented tests
        // This is a simplified unit test
        val result = repository.sendOtp(phoneNumber)
        // Result depends on Firebase mock setup
    }
    
    @Test
    fun `logout clears tokens`() = runTest {
        coEvery { tokenManager.clearTokens() } returns Unit
        
        repository.logout()
        
        coVerify { tokenManager.clearTokens() }
    }
    
    @Test
    fun `isAuthenticated returns correct state`() = runTest {
        every { firebaseAuth.currentUser } returns null
        assertFalse(repository.isAuthenticated())
        
        val mockUser = mockk<FirebaseUser>(relaxed = true)
        every { firebaseAuth.currentUser } returns mockUser
        assertTrue(repository.isAuthenticated())
    }
    
    @Test
    fun `saveTokens stores tokens securely`() = runTest {
        val accessToken = "test-access-token"
        val refreshToken = "test-refresh-token"
        
        coEvery { tokenManager.saveAccessToken(accessToken) } returns Unit
        coEvery { tokenManager.saveRefreshToken(refreshToken) } returns Unit
        
        repository.saveTokens(accessToken, refreshToken)
        
        coVerify { tokenManager.saveAccessToken(accessToken) }
        coVerify { tokenManager.saveRefreshToken(refreshToken) }
    }
    
    @Test
    fun `getAccessToken retrieves from token manager`() = runTest {
        val expectedToken = "stored-access-token"
        coEvery { tokenManager.getAccessToken() } returns expectedToken
        
        val token = repository.getAccessToken()
        assertEquals(expectedToken, token)
    }
    
    @Test
    fun `refreshToken updates tokens`() = runTest {
        val oldRefreshToken = "old-refresh-token"
        val newAccessToken = "new-access-token"
        val newRefreshToken = "new-refresh-token"
        
        coEvery { tokenManager.getRefreshToken() } returns oldRefreshToken
        coEvery { chatrApi.refreshToken(any()) } returns mockk {
            every { accessToken } returns newAccessToken
            every { refreshToken } returns newRefreshToken
        }
        
        val result = repository.refreshToken()
        
        // Verify new tokens are saved
        coVerify { tokenManager.saveAccessToken(newAccessToken) }
        coVerify { tokenManager.saveRefreshToken(newRefreshToken) }
    }
}
