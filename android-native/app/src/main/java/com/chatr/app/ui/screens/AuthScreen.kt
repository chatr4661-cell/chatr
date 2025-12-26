package com.chatr.app.ui.screens

import android.app.Activity
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.chatr.app.viewmodel.AuthState
import com.chatr.app.viewmodel.AuthViewModel
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import java.util.concurrent.TimeUnit

@Composable
fun AuthScreen(
    navController: NavController,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val authState by viewModel.authState.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    
    var authMode by remember { mutableStateOf("phone") } // "phone", "otp", "email"
    var phoneNumber by remember { mutableStateOf("+91") }
    var otpCode by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var verificationId by remember { mutableStateOf<String?>(null) }
    
    val context = LocalContext.current
    val activity = context as? Activity
    
    // Navigate when authenticated
    LaunchedEffect(authState) {
        when (authState) {
            is AuthState.Authenticated -> {
                navController.navigate("chats") {
                    popUpTo("auth") { inclusive = true }
                }
            }
            is AuthState.Error -> {
                errorMessage = (authState as AuthState.Error).message
                isLoading = false
            }
            else -> {}
        }
    }
    
    // Firebase Phone Auth callbacks
    val phoneAuthCallbacks = remember {
        object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                // Auto-verification or instant verification
                isLoading = true
                FirebaseAuth.getInstance().signInWithCredential(credential)
                    .addOnSuccessListener { result ->
                        val uid = result.user?.uid
                        if (uid != null) {
                            viewModel.verifyOtpWithFirebaseUid(phoneNumber, uid)
                        } else {
                            errorMessage = "Failed to get user ID"
                            isLoading = false
                        }
                    }
                    .addOnFailureListener { e ->
                        errorMessage = e.message ?: "Verification failed"
                        isLoading = false
                    }
            }
            
            override fun onVerificationFailed(e: FirebaseException) {
                errorMessage = e.message ?: "Verification failed"
                isLoading = false
            }
            
            override fun onCodeSent(verId: String, token: PhoneAuthProvider.ForceResendingToken) {
                verificationId = verId
                authMode = "otp"
                isLoading = false
            }
        }
    }
    
    fun sendOtp() {
        if (phoneNumber.length < 10) {
            errorMessage = "Please enter a valid phone number"
            return
        }
        
        if (activity == null) {
            errorMessage = "Cannot send OTP from this context"
            return
        }
        
        isLoading = true
        errorMessage = null
        
        val options = PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
            .setPhoneNumber(phoneNumber)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(phoneAuthCallbacks)
            .build()
        
        PhoneAuthProvider.verifyPhoneNumber(options)
    }
    
    fun verifyOtp() {
        val verId = verificationId
        if (verId == null || otpCode.length != 6) {
            errorMessage = "Please enter a valid 6-digit OTP"
            return
        }
        
        isLoading = true
        errorMessage = null
        
        val credential = PhoneAuthProvider.getCredential(verId, otpCode)
        FirebaseAuth.getInstance().signInWithCredential(credential)
            .addOnSuccessListener { result ->
                val uid = result.user?.uid
                if (uid != null) {
                    viewModel.verifyOtpWithFirebaseUid(phoneNumber, uid)
                } else {
                    errorMessage = "Failed to get user ID"
                    isLoading = false
                }
            }
            .addOnFailureListener { e ->
                errorMessage = e.message ?: "Invalid OTP"
                isLoading = false
            }
    }
    
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo
            Text(
                text = "CHATR",
                fontSize = 48.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = when (authMode) {
                    "phone" -> "Enter your phone number"
                    "otp" -> "Enter verification code"
                    else -> "Sign in with email"
                },
                fontSize = 20.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            when (authMode) {
                "phone" -> {
                    // Phone number input
                    OutlinedTextField(
                        value = phoneNumber,
                        onValueChange = { 
                            phoneNumber = it
                            errorMessage = null
                        },
                        label = { Text("Phone Number") },
                        leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !isLoading,
                        placeholder = { Text("+91 9999999999") }
                    )
                    
                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = errorMessage!!,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 14.sp
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Button(
                        onClick = { sendOtp() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        enabled = !isLoading
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text("Send OTP", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    TextButton(onClick = { authMode = "email" }) {
                        Text("Use email instead")
                    }
                }
                
                "otp" -> {
                    // OTP input
                    Text(
                        text = "Code sent to $phoneNumber",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    OutlinedTextField(
                        value = otpCode,
                        onValueChange = { 
                            if (it.length <= 6 && it.all { c -> c.isDigit() }) {
                                otpCode = it
                                errorMessage = null
                            }
                        },
                        label = { Text("6-digit OTP") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !isLoading
                    )
                    
                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = errorMessage!!,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 14.sp
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Button(
                        onClick = { verifyOtp() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        enabled = !isLoading && otpCode.length == 6
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text("Verify OTP", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Row {
                        TextButton(onClick = { 
                            authMode = "phone"
                            otpCode = ""
                            verificationId = null
                        }) {
                            Text("Change number")
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        TextButton(onClick = { sendOtp() }, enabled = !isLoading) {
                            Text("Resend OTP")
                        }
                    }
                }
                
                "email" -> {
                    // Email/password input
                    OutlinedTextField(
                        value = email,
                        onValueChange = { 
                            email = it
                            errorMessage = null
                        },
                        label = { Text("Email") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !isLoading
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    OutlinedTextField(
                        value = password,
                        onValueChange = { 
                            password = it
                            errorMessage = null
                        },
                        label = { Text("Password") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = null
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !isLoading
                    )
                    
                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = errorMessage!!,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 14.sp
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Button(
                        onClick = { viewModel.signInWithEmail(email, password) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        enabled = !isLoading
                    ) {
                        if (isLoading || uiState.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text("Sign In", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    TextButton(onClick = { authMode = "phone" }) {
                        Text("Use phone number instead")
                    }
                }
            }
        }
    }
}
