package com.chatr.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

/**
 * PIN Setup/Entry Screen - Security PIN
 */
@Composable
fun PinScreen(
    navController: NavController,
    onPinSuccess: () -> Unit
) {
    var pin by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var isSetupMode by remember { mutableStateOf(true) } // TODO: Check if PIN exists
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isSetupMode) "Setup PIN" else "Enter PIN") }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = if (isSetupMode) "Create a 4-digit PIN" else "Enter your PIN",
                style = MaterialTheme.typography.headlineSmall
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            OutlinedTextField(
                value = pin,
                onValueChange = { if (it.length <= 4) pin = it },
                label = { Text("PIN") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                modifier = Modifier.fillMaxWidth()
            )
            
            if (isSetupMode) {
                Spacer(modifier = Modifier.height(16.dp))
                
                OutlinedTextField(
                    value = confirmPin,
                    onValueChange = { if (it.length <= 4) confirmPin = it },
                    label = { Text("Confirm PIN") },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Button(
                onClick = {
                    // TODO: Validate and save PIN
                    if (isSetupMode && pin == confirmPin && pin.length == 4) {
                        onPinSuccess()
                    } else if (!isSetupMode && pin.length == 4) {
                        onPinSuccess()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = if (isSetupMode) {
                    pin.length == 4 && confirmPin.length == 4 && pin == confirmPin
                } else {
                    pin.length == 4
                }
            ) {
                Text(if (isSetupMode) "Set PIN" else "Continue")
            }
        }
    }
}
