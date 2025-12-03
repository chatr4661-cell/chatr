package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.*
import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.data.repository.NotificationsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val user: User? = null,
    val error: String? = null,
    val otpSent: Boolean = false,
    val otpVerified: Boolean = false
)

sealed class AuthState {
    object Initial : AuthState()
    object Authenticated : AuthState()
    object Unauthenticated : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val notificationsRepository: NotificationsRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()
    
    private val _authState = MutableStateFlow<AuthState>(AuthState.Initial)
    val authState: StateFlow<AuthState> = _authState
    
    init {
        checkAuthStatus()
    }
    
    private fun checkAuthStatus() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            if (authRepository.isLoggedIn()) {
                authRepository.getCurrentUser()
                    .onSuccess { user ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            user = user
                        )
                        _authState.value = AuthState.Authenticated
                    }
                    .onFailure { 
                        refreshToken()
                    }
            } else {
                _uiState.value = _uiState.value.copy(isLoading = false)
                _authState.value = AuthState.Unauthenticated
            }
        }
    }
    
    fun signUpWithEmail(email: String, password: String, phoneNumber: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            authRepository.signUp(
                SignUpRequest(email = email, password = password, phoneNumber = phoneNumber)
            ).onSuccess { response ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isAuthenticated = true,
                    user = response.user
                )
                _authState.value = AuthState.Authenticated
            }.onFailure { exception ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = exception.message ?: "Sign up failed"
                )
                _authState.value = AuthState.Error(exception.message ?: "Sign up failed")
            }
        }
    }
    
    fun signInWithEmail(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            authRepository.signIn(
                SignInRequest(email = email, password = password, phone = null, otp = null)
            ).onSuccess { response ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isAuthenticated = true,
                    user = response.user
                )
                _authState.value = AuthState.Authenticated
            }.onFailure { exception ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = exception.message ?: "Sign in failed"
                )
                _authState.value = AuthState.Error(exception.message ?: "Sign in failed")
            }
        }
    }
    
    fun sendOtp(phoneNumber: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            authRepository.sendOtp(phoneNumber)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        otpSent = true
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "Failed to send OTP"
                    )
                }
        }
    }
    
    fun verifyOtp(phoneNumber: String, otp: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            authRepository.verifyOtp(phoneNumber, otp)
                .onSuccess { response ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true,
                        user = response.user,
                        otpVerified = true
                    )
                    _authState.value = AuthState.Authenticated
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "OTP verification failed"
                    )
                }
        }
    }
    
    fun signInWithPhone(phoneNumber: String, otp: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            authRepository.signIn(
                SignInRequest(email = null, password = null, phone = phoneNumber, otp = otp)
            ).onSuccess { response ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isAuthenticated = true,
                    user = response.user
                )
                _authState.value = AuthState.Authenticated
            }.onFailure { exception ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = exception.message ?: "Phone sign in failed"
                )
                _authState.value = AuthState.Error(exception.message ?: "Phone sign in failed")
            }
        }
    }
    
    private fun refreshToken() {
        viewModelScope.launch {
            authRepository.refreshToken()
                .onSuccess { response ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true,
                        user = response.user
                    )
                    _authState.value = AuthState.Authenticated
                }
                .onFailure {
                    authRepository.signOut()
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = false,
                        user = null
                    )
                    _authState.value = AuthState.Unauthenticated
                }
        }
    }
    
    fun signOut() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            authRepository.signOut()
                .onSuccess {
                    _uiState.value = AuthUiState(isLoading = false)
                    _authState.value = AuthState.Unauthenticated
                }
                .onFailure {
                    _uiState.value = AuthUiState(isLoading = false)
                    _authState.value = AuthState.Unauthenticated
                }
        }
    }
    
    fun updateProfile(username: String?, avatarUrl: String?, bio: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            val userId = _uiState.value.user?.id ?: return@launch
            
            authRepository.updateUser(userId, UpdateUserRequest(username, avatarUrl, bio))
                .onSuccess { user ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        user = user
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "Failed to update profile"
                    )
                }
        }
    }
    
    fun registerFcmToken(token: String) {
        viewModelScope.launch {
            notificationsRepository.registerDevice(token, "android")
        }
    }
    
    fun updateOnlineStatus(isOnline: Boolean) {
        viewModelScope.launch {
            authRepository.updateOnlineStatus(isOnline)
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
        if (_authState.value is AuthState.Error) {
            _authState.value = AuthState.Unauthenticated
        }
    }
    
    fun getCurrentUserId(): String? = _uiState.value.user?.id
    
    fun isSignedIn(): Boolean = authRepository.isLoggedIn()
}
