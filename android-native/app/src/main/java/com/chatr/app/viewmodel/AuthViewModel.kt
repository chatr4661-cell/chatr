package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.*
import com.chatr.app.data.api.*
import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.data.repository.NotificationsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject

/**
 * Phone authentication steps - matches web PhoneAuthStep type from useFirebasePhoneAuth.tsx
 */
enum class PhoneAuthStep {
    PHONE,      // 'phone' - Enter phone number
    OTP,        // 'otp' - Enter OTP code  
    SYNCING     // 'syncing' - Syncing with backend
}

/**
 * Authentication UI State - mirrors web useFirebasePhoneAuth hook state
 */
data class AuthUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val user: User? = null,
    val error: String? = null,
    // Phone auth specific state (matches web hook)
    val step: PhoneAuthStep = PhoneAuthStep.PHONE,
    val countdown: Int = 0,
    val phoneNumber: String = "",
    val isExistingUser: Boolean = false,
    val failedAttempts: Int = 0,
    // Legacy compatibility
    val otpSent: Boolean = false,
    val otpVerified: Boolean = false
)

/**
 * Authentication state sealed class
 */
sealed class AuthState {
    object Initial : AuthState()
    object Authenticated : AuthState()
    object Unauthenticated : AuthState()
    data class Error(val message: String) : AuthState()
}

/**
 * AuthViewModel - Mirrors web useFirebasePhoneAuth.tsx logic exactly
 * 
 * Web login flow (from useFirebasePhoneAuth.tsx):
 * 1. checkPhoneAndProceed() - Try instant login for existing users, else send OTP
 *    - Existing users: signInWithPassword(email: {phone}@chatr.local, password: phone)
 *    - New users: Firebase OTP flow
 * 2. Firebase verifies OTP on client
 * 3. verifyOtpWithFirebaseUid() - Call firebase-phone-auth edge function
 * 4. Edge function creates/updates Supabase user and returns session
 * 5. Session saved to SecureStore for native app access
 */
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val notificationsRepository: NotificationsRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _authState = MutableStateFlow<AuthState>(AuthState.Initial)
    val authState: StateFlow<AuthState> = _authState
    
    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()
    
    private val _isOnboardingComplete = MutableStateFlow(true)
    val isOnboardingComplete: StateFlow<Boolean> = _isOnboardingComplete.asStateFlow()
    
    init {
        checkAuthStatus()
    }
    
    /**
     * Check if user is already authenticated via stored tokens
     * Mirrors web: supabase.auth.getSession() check
     */
    private fun checkAuthStatus() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            if (authRepository.isLoggedIn()) {
                authRepository.getCurrentUser()
                    .onSuccess { user ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            user = user,
                            step = PhoneAuthStep.PHONE
                        )
                        _authState.value = AuthState.Authenticated
                        _isAuthenticated.value = true
                    }
                    .onFailure { 
                        refreshToken()
                    }
            } else {
                _uiState.value = _uiState.value.copy(isLoading = false)
                _authState.value = AuthState.Unauthenticated
                _isAuthenticated.value = false
            }
        }
    }
    
    /**
     * INSTANT LOGIN CHECK - Mirrors web checkPhoneAndProceed()
     * 
     * Web logic (from useFirebasePhoneAuth.tsx lines 74-107):
     * 1. Try instant password login (email: {phone}@chatr.local, password: phone)
     * 2. If exists, user is logged in immediately (no OTP needed) - "Welcome back!"
     * 3. If new user, proceed to Firebase OTP flow
     * 
     * @param phoneNumber The phone number to check
     * @param onOtpRequired Callback when OTP is needed (new user)
     * @param onSuccess Callback when instant login succeeds (existing user)
     */
    fun checkPhoneAndProceed(
        phoneNumber: String, 
        onOtpRequired: () -> Unit, 
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true, 
                error = null,
                phoneNumber = phoneNumber
            )
            
            val normalizedPhone = phoneNumber.replace("\\s".toRegex(), "")
            val email = "${normalizedPhone.replace("+", "")}@chatr.local"
            
            // FAST CHECK: 1-second timeout for instant login (matches web line 85-86)
            val result = withTimeoutOrNull(1000L) {
                authRepository.signInWithEmailPassword(email, normalizedPhone)
            }
            
            if (result != null && result.isSuccess) {
                // Existing user - instant login! (matches web line 94-99)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isAuthenticated = true,
                    user = result.getOrNull()?.user,
                    isExistingUser = true,
                    step = PhoneAuthStep.PHONE
                )
                _authState.value = AuthState.Authenticated
                _isAuthenticated.value = true
                onSuccess()
            } else {
                // New user - need OTP verification (matches web line 105-106)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isExistingUser = false,
                    step = PhoneAuthStep.OTP,
                    countdown = 30
                )
                startCountdown()
                onOtpRequired()
            }
        }
    }
    
    /**
     * Called when Firebase OTP is sent successfully
     * Updates UI to show OTP input screen
     */
    fun onOtpSent() {
        _uiState.value = _uiState.value.copy(
            step = PhoneAuthStep.OTP,
            otpSent = true,
            countdown = 30,
            isLoading = false
        )
        startCountdown()
    }
    
    /**
     * Countdown timer for OTP resend (matches web 30s countdown - line 125)
     */
    private fun startCountdown() {
        viewModelScope.launch {
            while (_uiState.value.countdown > 0) {
                kotlinx.coroutines.delay(1000)
                _uiState.value = _uiState.value.copy(countdown = _uiState.value.countdown - 1)
            }
        }
    }
    
    /**
     * VERIFY OTP WITH FIREBASE UID - Mirrors web verifyOTP() (lines 159-216)
     * 
     * This is called AFTER Firebase successfully verifies the OTP code.
     * The Firebase UID is passed to the edge function which handles Supabase auth.
     * 
     * Web flow:
     * 1. confirmationResult.confirm(otp) - Firebase verifies (line 170)
     * 2. POST to firebase-phone-auth edge function with phone + firebase_uid (lines 176-189)
     * 3. Edge function creates/updates user and returns session
     * 4. supabase.auth.setSession() - Sets the session (lines 198-202)
     * 
     * @param phoneNumber The verified phone number
     * @param firebaseUid The Firebase user UID from successful OTP verification
     */
    fun verifyOtpWithFirebaseUid(phoneNumber: String, firebaseUid: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true, 
                error = null,
                step = PhoneAuthStep.SYNCING
            )
            
            val normalizedPhone = phoneNumber.replace("\\s".toRegex(), "")
            
            // Call edge function (mirrors web fetch to firebase-phone-auth)
            authRepository.verifyOtp(normalizedPhone, firebaseUid)
                .onSuccess { response ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true,
                        user = response.user,
                        otpVerified = true,
                        step = PhoneAuthStep.PHONE
                    )
                    _authState.value = AuthState.Authenticated
                    _isAuthenticated.value = true
                }
                .onFailure { exception ->
                    // Match web error handling (lines 209-214)
                    val errorMsg = when {
                        exception.message?.contains("invalid", ignoreCase = true) == true -> 
                            "Invalid code. Please check and try again."
                        else -> exception.message ?: "Verification failed"
                    }
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = errorMsg,
                        step = PhoneAuthStep.OTP,
                        failedAttempts = _uiState.value.failedAttempts + 1
                    )
                    _authState.value = AuthState.Error(errorMsg)
                }
        }
    }
    
    /**
     * Legacy method - redirects to new flow
     */
    fun verifyOtp(phoneNumber: String, otp: String) {
        verifyOtpWithFirebaseUid(phoneNumber, otp)
    }
    
    /**
     * Send OTP - triggers Firebase to send SMS
     * Matches web sendOTP() function (lines 109-157)
     */
    fun sendOtp(phoneNumber: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true, 
                error = null,
                phoneNumber = phoneNumber
            )
            
            authRepository.sendOtp(phoneNumber)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        otpSent = true,
                        step = PhoneAuthStep.OTP,
                        countdown = 30
                    )
                    startCountdown()
                }
                .onFailure { exception ->
                    // Match web error handling (lines 138-151)
                    val errorMsg = when {
                        exception.message?.contains("too-many-requests", ignoreCase = true) == true ->
                            "Too many attempts. Please wait."
                        exception.message?.contains("invalid-phone", ignoreCase = true) == true ->
                            "Invalid phone number"
                        exception.message?.contains("Hostname", ignoreCase = true) == true ->
                            "Domain not authorized"
                        else -> exception.message ?: "Failed to send OTP"
                    }
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = errorMsg,
                        step = PhoneAuthStep.PHONE,
                        failedAttempts = _uiState.value.failedAttempts + 1
                    )
                }
        }
    }
    
    /**
     * Resend OTP - only allowed after countdown expires
     * Matches web resendOTP() (lines 218-223)
     */
    fun resendOtp() {
        if (_uiState.value.countdown > 0) return
        
        _uiState.value = _uiState.value.copy(failedAttempts = 0)
        sendOtp(_uiState.value.phoneNumber)
    }
    
    /**
     * Reset auth flow - mirrors web reset() (lines 225-234)
     */
    fun reset() {
        _uiState.value = AuthUiState()
        _authState.value = AuthState.Unauthenticated
        _isAuthenticated.value = false
    }
    
    /**
     * Sign up with email and password (fallback method)
     */
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
                _isAuthenticated.value = true
            }.onFailure { exception ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = exception.message ?: "Sign up failed"
                )
                _authState.value = AuthState.Error(exception.message ?: "Sign up failed")
            }
        }
    }
    
    /**
     * Sign in with email and password (fallback method)
     */
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
                _isAuthenticated.value = true
            }.onFailure { exception ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = exception.message ?: "Sign in failed"
                )
                _authState.value = AuthState.Error(exception.message ?: "Sign in failed")
            }
        }
    }
    
    /**
     * Sign in with phone (legacy method)
     */
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
                _isAuthenticated.value = true
            }.onFailure { exception ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = exception.message ?: "Phone sign in failed"
                )
                _authState.value = AuthState.Error(exception.message ?: "Phone sign in failed")
            }
        }
    }
    
    /**
     * Refresh token
     */
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
                    _isAuthenticated.value = true
                }
                .onFailure {
                    authRepository.signOut()
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = false,
                        user = null
                    )
                    _authState.value = AuthState.Unauthenticated
                    _isAuthenticated.value = false
                }
        }
    }
    
    /**
     * Sign out
     */
    fun signOut() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            authRepository.signOut()
                .onSuccess {
                    _uiState.value = AuthUiState(isLoading = false)
                    _authState.value = AuthState.Unauthenticated
                    _isAuthenticated.value = false
                }
                .onFailure {
                    _uiState.value = AuthUiState(isLoading = false)
                    _authState.value = AuthState.Unauthenticated
                    _isAuthenticated.value = false
                }
        }
    }
    
    /**
     * Update user profile
     */
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
    
    /**
     * Register FCM token for push notifications
     */
    fun registerFcmToken(token: String) {
        viewModelScope.launch {
            notificationsRepository.registerDevice(token, "android")
        }
    }
    
    /**
     * Update online status
     */
    fun updateOnlineStatus(isOnline: Boolean) {
        viewModelScope.launch {
            authRepository.updateOnlineStatus(isOnline)
        }
    }
    
    /**
     * Clear error
     */
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
        if (_authState.value is AuthState.Error) {
            _authState.value = AuthState.Unauthenticated
        }
    }
    
    fun getCurrentUserId(): String? = _uiState.value.user?.id
    
    fun isSignedIn(): Boolean = authRepository.isLoggedIn()
    
    /**
     * Phone validation - matches web validation pattern
     */
    fun isValidPhoneNumber(phone: String): Boolean {
        val cleaned = phone.replace("\\s".toRegex(), "")
        return cleaned.length >= 10 && cleaned.matches(Regex("^\\+?[0-9]+$"))
    }
    
    /**
     * Handle successful web authentication
     * Called when WebView auth completes and we have tokens
     */
    fun handleWebAuthSuccess(accessToken: String, refreshToken: String?, userId: String) {
        viewModelScope.launch {
            authRepository.saveWebAuthTokens(accessToken, refreshToken, userId)
            
            authRepository.getCurrentUser()
                .onSuccess { user ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true,
                        user = user
                    )
                    _authState.value = AuthState.Authenticated
                    _isAuthenticated.value = true
                }
                .onFailure {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true
                    )
                    _authState.value = AuthState.Authenticated
                    _isAuthenticated.value = true
                }
        }
    }
}
