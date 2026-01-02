package com.chatr.app.presentation.calling

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chatr.app.calling.service.CallForegroundService
import com.chatr.app.presentation.theme.ChatrTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Native Call Activity - Full-screen call UI
 */
@AndroidEntryPoint
class CallActivity : ComponentActivity() {

    private var callId: String = ""
    private var callerName: String = ""
    private var callerPhone: String = ""
    private var isVideo: Boolean = false
    private var isIncoming: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        callId = intent.getStringExtra("extra_call_id") ?: ""
        callerName = intent.getStringExtra("extra_caller_name") ?: "Unknown"
        callerPhone = intent.getStringExtra("extra_caller_phone") ?: ""
        isVideo = intent.getBooleanExtra("extra_is_video", false)
        isIncoming = intent.getBooleanExtra("is_incoming", false)

        // Start foreground service
        CallForegroundService.start(this, callId, callerName, callerPhone, isVideo, isIncoming)

        setContent {
            ChatrTheme {
                CallScreen(
                    callerName = callerName,
                    callerPhone = callerPhone,
                    isVideo = isVideo,
                    onEndCall = { endCall() }
                )
            }
        }
    }

    private fun endCall() {
        CallForegroundService.stop(this)
        finish()
    }
}

@Composable
fun CallScreen(
    callerName: String,
    callerPhone: String,
    isVideo: Boolean,
    onEndCall: () -> Unit
) {
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(64.dp))
            
            Text(text = callerName, style = MaterialTheme.typography.headlineLarge)
            Text(text = callerPhone, style = MaterialTheme.typography.bodyLarge)
            Text(
                text = if (isVideo) "ChatrPlus Video" else "ChatrPlus Audio",
                style = MaterialTheme.typography.labelMedium
            )
            
            Spacer(modifier = Modifier.weight(1f))
            
            Button(
                onClick = onEndCall,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                modifier = Modifier.size(72.dp)
            ) {
                Text("End")
            }
            
            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
