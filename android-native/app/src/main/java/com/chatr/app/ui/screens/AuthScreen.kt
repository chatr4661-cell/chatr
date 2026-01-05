package com.chatr.app.ui.screens

import android.app.Activity
import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.chatr.app.viewmodel.AuthState
import com.chatr.app.viewmodel.AuthViewModel
import com.chatr.app.viewmodel.PhoneAuthStep
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import java.util.concurrent.TimeUnit

private const val TAG = "AuthScreen"

/**
 * AuthScreen - Mirrors web login flow exactly
 * 
 * Flow (from useFirebasePhoneAuth.tsx):
 * 1. User enters phone number
 * 2. checkPhoneAndProceed() - Try instant login for existing users
 *    - If exists: Instant login via Supabase signInWithPassword (no OTP needed!)
 *    - If new: Proceed to Firebase OTP
 * 3. Firebase OTP verification
 * 4. Call firebase-phone-auth edge function with Firebase UID
 * 5. Session saved, user authenticated
 */
@Composable
fun AuthScreen(
    navController: NavController,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val authState by viewModel.authState.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    
    var phoneNumber by remember { mutableStateOf("+91") }
    var otpCode by remember { mutableStateOf("") }
    var localError by remember { mutableStateOf<String?>(null) }
    var verificationId by remember { mutableStateOf<String?>(null) }
    var isFirebaseSending by remember { mutableStateOf(false) }
    
    val context = LocalContext.current
    val activity = context as? Activity
    
    // Navigate when authenticated
    LaunchedEffect(authState) {
        when (authState) {
            is AuthState.Authenticated -> {
                Log.d(TAG, "Authenticated! Navigating to chats...")
                navController.navigate("chats") {
                    popUpTo("auth") { inclusive = true }
                }
            }
            is AuthState.Error -> {
                localError = (authState as AuthState.Error).message
            }
            else -> {}
        }
    }
    
    // Firebase Phone Auth callbacks
    val phoneAuthCallbacks = remember {
        object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                // Auto-verification (e.g., SMS auto-read on some devices)
                Log.d(TAG, "Auto-verification completed")
                FirebaseAuth.getInstance().signInWithCredential(credential)
                    .addOnSuccessListener { result ->
                        val uid = result.user?.uid
                        if (uid != null) {
                            viewModel.verifyOtpWithFirebaseUid(phoneNumber, uid)
                        } else {
                            localError = "Failed to get user ID"
                        }
                    }
                    .addOnFailureListener { e ->
                        localError = e.message ?: "Verification failed"
                    }
            }
            
            override fun onVerificationFailed(e: FirebaseException) {
                Log.e(TAG, "Firebase verification failed", e)
                isFirebaseSending = false
                localError = when {
                    e.message?.contains("too-many-requests", ignoreCase = true) == true ->
                        "Too many attempts. Please wait a few minutes."
                    e.message?.contains("invalid-phone", ignoreCase = true) == true ->
                        "Invalid phone number format"
                    e.message?.contains("quota", ignoreCase = true) == true ->
                        "Service temporarily unavailable"
                    else -> e.message ?: "Verification failed"
                }
            }
            
            override fun onCodeSent(verId: String, token: PhoneAuthProvider.ForceResendingToken) {
                Log.d(TAG, "OTP code sent, verificationId: ${verId.take(10)}...")
                verificationId = verId
                isFirebaseSending = false
                viewModel.onOtpSent()
            }
        }
    }
    
    /**
     * Send Firebase OTP - called ONLY after checkPhoneAndProceed determines user is new
     */
    fun sendFirebaseOtp() {
        if (activity == null) {
            localError = "Cannot send OTP from this context"
            return
        }
        
        Log.d(TAG, "Sending Firebase OTP to: $phoneNumber")
        isFirebaseSending = true
        localError = null
        
        val options = PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
            .setPhoneNumber(phoneNumber)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(phoneAuthCallbacks)
            .build()
        
        PhoneAuthProvider.verifyPhoneNumber(options)
    }
    
    /**
     * Handle Continue button - mirrors web checkPhoneAndProceed()
     * First tries instant login, only sends OTP if user is new
     */
    fun handleContinue() {
        if (phoneNumber.replace("+", "").replace(" ", "").length < 10) {
            localError = "Please enter a valid phone number"
            return
        }
        
        localError = null
        
        Log.d(TAG, "Checking phone: $phoneNumber")
        viewModel.checkPhoneAndProceed(
            phoneNumber = phoneNumber,
            onOtpRequired = {
                // New user - send Firebase OTP
                Log.d(TAG, "User not found, sending OTP...")
                sendFirebaseOtp()
            },
            onSuccess = {
                // Existing user - instant login! No OTP needed
                Log.d(TAG, "Instant login success!")
            }
        )
    }
    
    /**
     * Verify OTP code with Firebase
     */
    fun verifyOtp() {
        val verId = verificationId
        if (verId == null || otpCode.length != 6) {
            localError = "Please enter a valid 6-digit OTP"
            return
        }
        
        Log.d(TAG, "Verifying OTP...")
        localError = null
        
        val credential = PhoneAuthProvider.getCredential(verId, otpCode)
        FirebaseAuth.getInstance().signInWithCredential(credential)
            .addOnSuccessListener { result ->
                val uid = result.user?.uid
                if (uid != null) {
                    Log.d(TAG, "Firebase auth success, syncing with backend...")
                    viewModel.verifyOtpWithFirebaseUid(phoneNumber, uid)
                } else {
                    localError = "Failed to get user ID"
                }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "OTP verification failed", e)
                localError = when {
                    e.message?.contains("invalid", ignoreCase = true) == true ->
                        "Invalid code. Please check and try again."
                    else -> e.message ?: "Verification failed"
                }
            }
    }
    
    /**
     * Resend OTP
     */
    fun resendOtp() {
        if (uiState.countdown > 0) return
        sendFirebaseOtp()
    }
    
    /**
     * Go back to phone input
     */
    fun goBack() {
        viewModel.reset()
        otpCode = ""
        verificationId = null
        localError = null
    }
    
    // Determine current error to show
    val displayError = localError ?: uiState.error
    val isLoading = uiState.isLoading || isFirebaseSending
    
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(80.dp))
            
            // Logo
            Text(
                text = "chatr",
                fontSize = 42.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            
            Text(
                text = "Smart Messaging, Privacy First",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Card container
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    when (uiState.step) {
                        PhoneAuthStep.PHONE -> {
                            Text(
                                text = "Welcome",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            
                            Text(
                                text = "Enter your phone number to continue",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )
                            
                            Spacer(modifier = Modifier.height(24.dp))
                            
                            // Phone input
                            Text(
                                text = "Phone Number",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.fillMaxWidth()
                            )
                            
                            Spacer(modifier = Modifier.height(8.dp))
                            
                            OutlinedTextField(
                                value = phoneNumber,
                                onValueChange = { 
                                    phoneNumber = it
                                    localError = null
                                },
                                leadingIcon = { Text("+91 ▾", fontSize = 14.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !isLoading,
                                placeholder = { Text("9999999999") }
                            )
                            
                            if (displayError != null) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = displayError,
                                    color = MaterialTheme.colorScheme.error,
                                    fontSize = 13.sp
                                )
                            }
                            
                            Spacer(modifier = Modifier.height(24.dp))
                            
                            Button(
                                onClick = { handleContinue() },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                                enabled = !isLoading
                            ) {
                                if (isLoading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(22.dp),
                                        color = MaterialTheme.colorScheme.onPrimary,
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Text("Continue", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                        
                        PhoneAuthStep.OTP -> {
                            Text(
                                text = "Verification",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            
                            Text(
                                text = "Enter the code sent to\n$phoneNumber",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )
                            
                            Spacer(modifier = Modifier.height(24.dp))
                            
                            OutlinedTextField(
                                value = otpCode,
                                onValueChange = { 
                                    if (it.length <= 6 && it.all { c -> c.isDigit() }) {
                                        otpCode = it
                                        localError = null
                                    }
                                },
                                label = { Text("6-digit code") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !isLoading
                            )
                            
                            if (displayError != null) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = displayError,
                                    color = MaterialTheme.colorScheme.error,
                                    fontSize = 13.sp
                                )
                            }
                            
                            Spacer(modifier = Modifier.height(24.dp))
                            
                            Button(
                                onClick = { verifyOtp() },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                                enabled = !isLoading && otpCode.length == 6
                            ) {
                                if (isLoading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(22.dp),
                                        color = MaterialTheme.colorScheme.onPrimary,
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Text("Verify", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                TextButton(onClick = { goBack() }) {
                                    Text("Change number")
                                }
                                
                                TextButton(
                                    onClick = { resendOtp() },
                                    enabled = !isLoading && uiState.countdown == 0
                                ) {
                                    Text(
                                        if (uiState.countdown > 0) 
                                            "Resend in ${uiState.countdown}s" 
                                        else 
                                            "Resend code"
                                    )
                                }
                            }
                        }
                        
                        PhoneAuthStep.SYNCING -> {
                            CircularProgressIndicator(
                                modifier = Modifier.size(48.dp)
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            Text(
                                text = "Setting up your account...",
                                fontSize = 16.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Footer
            Row(
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                Text("Secure", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Fast", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("AI Powered", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Chatr is a brand of TalentXcel Services Pvt. Ltd.\n© 2026 All rights reserved.",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
