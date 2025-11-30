package com.chatr.app.services

import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import com.chatr.app.service.CallForegroundService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class SocketBackgroundService : Service() {

    companion object {
        private const val TAG = "SocketBackgroundService"
        const val EXTRA_AUTH_TOKEN = "authToken"
        const val EXTRA_USER_ID = "userId"
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var eventsJob: Job? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val token = intent?.getStringExtra(EXTRA_AUTH_TOKEN)
        val userId = intent?.getStringExtra(EXTRA_USER_ID) ?: "native_client"

        if (token.isNullOrEmpty()) {
            Log.w(TAG, "Missing auth token, cannot connect socket")
            stopSelf()
            return START_NOT_STICKY
        }

        val socketService = SocketService.getInstance()

        // Ensure we have a live socket connection
        if (!socketService.isConnected()) {
            serviceScope.launch {
                try {
                    Log.d(TAG, "Connecting socket for user=$userId")
                    socketService.connect(userId, token)
                } catch (t: Throwable) {
                    Log.e(TAG, "Error connecting socket", t)
                }
            }
        }

        // Listen for incoming call events and promote to foreground call service
        if (eventsJob == null || eventsJob?.isCancelled == true) {
            eventsJob = serviceScope.launch {
                try {
                    socketService.events.collect { event ->
                        when (event) {
                            is SocketEvent.IncomingCall -> {
                                Log.d(TAG, "Incoming call via socket: ${event.callId}")
                                startCallForegroundService(event)
                            }
                            else -> Unit
                        }
                    }
                } catch (t: Throwable) {
                    Log.e(TAG, "Error collecting socket events", t)
                }
            }
        }

        return START_STICKY
    }

    private fun startCallForegroundService(event: SocketEvent.IncomingCall) {
        val intent = Intent(this, CallForegroundService::class.java).apply {
            action = CallForegroundService.ACTION_START_CALL
            putExtra(CallForegroundService.EXTRA_CALL_ID, event.callId)
            putExtra(CallForegroundService.EXTRA_CALLER_NAME, event.callerName)
            putExtra(CallForegroundService.EXTRA_IS_VIDEO, event.isVideo)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        eventsJob?.cancel()
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
