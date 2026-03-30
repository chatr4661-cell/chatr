package com.chatr.app.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import com.chatr.app.ChatrApplication
import com.chatr.app.R
import com.chatr.app.presentation.calling.CallActivity
import com.chatr.app.webrtc.core.PeerConnectionFactoryProvider
import com.chatr.app.webrtc.core.WebRtcClient
import com.chatr.app.webrtc.signaling.CallSignalingClient
import com.chatr.app.webrtc.state.CallState
import com.chatr.app.webrtc.state.CallStateMachine
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import javax.inject.Inject

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              WEBRTC FOREGROUND SERVICE                               ║
 * ║                                                                      ║
 * ║  CRITICAL: Bootstraps WebRTC NATIVELY without WebView               ║
 * ║  Runs as foreground service so Android won't kill it                 ║
 * ║                                                                      ║
 * ║  Solves: "App killed → accept call → stuck on Connecting"           ║
 * ║                                                                      ║
 * ║  Flow:                                                               ║
 * ║  1. FCM data message arrives (killed app)                           ║
 * ║  2. ConnectionService creates Connection                            ║
 * ║  3. User taps "Answer"                                              ║
 * ║  4. THIS service starts immediately                                 ║
 * ║  5. Initializes PeerConnectionFactory (native libwebrtc)            ║
 * ║  6. Creates PeerConnection + audio track                            ║
 * ║  7. Connects to signaling server                                    ║
 * ║  8. Exchanges SDP offer/answer                                      ║
 * ║  9. Audio flows within ~800ms of answer tap                         ║
 * ║                                                                      ║
 * ║  Boot time target: <500ms to first ICE candidate                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
@AndroidEntryPoint
class WebRtcForegroundService : Service() {

    @Inject lateinit var factoryProvider: PeerConnectionFactoryProvider
    @Inject lateinit var webRtcClient: WebRtcClient
    @Inject lateinit var signalingClient: CallSignalingClient
    @Inject lateinit var callStateMachine: CallStateMachine

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var wakeLock: PowerManager.WakeLock? = null
    private var currentCallId: String? = null
    private var isBootstrapped = false

    companion object {
        private const val TAG = "WebRtcFgService"
        private const val NOTIFICATION_ID = 9001
        private const val CHANNEL_ACTIVE_CALL = "chatr_active_call"

        const val ACTION_BOOTSTRAP_INCOMING = "com.chatr.app.BOOTSTRAP_INCOMING"
        const val ACTION_BOOTSTRAP_OUTGOING = "com.chatr.app.BOOTSTRAP_OUTGOING"
        const val ACTION_END_CALL = "com.chatr.app.END_CALL"

        const val EXTRA_CALL_ID = "call_id"
        const val EXTRA_CALLER_NAME = "caller_name"
        const val EXTRA_CALLER_PHONE = "caller_phone"
        const val EXTRA_IS_VIDEO = "is_video"
        const val EXTRA_AUTH_TOKEN = "auth_token"

        /**
         * Start service for incoming call bootstrap (called from ConnectionService)
         * Target: <5ms to service start
         */
        fun bootstrapIncoming(
            context: Context,
            callId: String,
            callerName: String,
            callerPhone: String,
            isVideo: Boolean,
            authToken: String
        ) {
            val intent = Intent(context, WebRtcForegroundService::class.java).apply {
                action = ACTION_BOOTSTRAP_INCOMING
                putExtra(EXTRA_CALL_ID, callId)
                putExtra(EXTRA_CALLER_NAME, callerName)
                putExtra(EXTRA_CALLER_PHONE, callerPhone)
                putExtra(EXTRA_IS_VIDEO, isVideo)
                putExtra(EXTRA_AUTH_TOKEN, authToken)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            Log.d(TAG, "⚡ Bootstrap incoming requested for $callId")
        }

        /**
         * Start service for outgoing call (called from system dialer intercept)
         */
        fun bootstrapOutgoing(
            context: Context,
            callId: String,
            receiverPhone: String,
            isVideo: Boolean,
            authToken: String
        ) {
            val intent = Intent(context, WebRtcForegroundService::class.java).apply {
                action = ACTION_BOOTSTRAP_OUTGOING
                putExtra(EXTRA_CALL_ID, callId)
                putExtra(EXTRA_CALLER_PHONE, receiverPhone)
                putExtra(EXTRA_IS_VIDEO, isVideo)
                putExtra(EXTRA_AUTH_TOKEN, authToken)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            Log.d(TAG, "⚡ Bootstrap outgoing requested for $callId")
        }

        fun endCall(context: Context) {
            val intent = Intent(context, WebRtcForegroundService::class.java).apply {
                action = ACTION_END_CALL
            }
            context.startService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        acquireWakeLock()
        Log.d(TAG, "✅ WebRtcForegroundService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_NOT_STICKY

        when (action) {
            ACTION_BOOTSTRAP_INCOMING -> {
                val callId = intent.getStringExtra(EXTRA_CALL_ID) ?: return START_NOT_STICKY
                val callerName = intent.getStringExtra(EXTRA_CALLER_NAME) ?: "Unknown"
                val callerPhone = intent.getStringExtra(EXTRA_CALLER_PHONE) ?: ""
                val isVideo = intent.getBooleanExtra(EXTRA_IS_VIDEO, false)
                val authToken = intent.getStringExtra(EXTRA_AUTH_TOKEN) ?: ""

                currentCallId = callId
                startForeground(NOTIFICATION_ID, buildCallNotification(callerName, true))

                serviceScope.launch {
                    bootstrapWebRtc(callId, callerPhone, isVideo, authToken, isIncoming = true)
                }
            }

            ACTION_BOOTSTRAP_OUTGOING -> {
                val callId = intent.getStringExtra(EXTRA_CALL_ID) ?: return START_NOT_STICKY
                val receiverPhone = intent.getStringExtra(EXTRA_CALLER_PHONE) ?: ""
                val isVideo = intent.getBooleanExtra(EXTRA_IS_VIDEO, false)
                val authToken = intent.getStringExtra(EXTRA_AUTH_TOKEN) ?: ""

                currentCallId = callId
                startForeground(NOTIFICATION_ID, buildCallNotification(receiverPhone, false))

                serviceScope.launch {
                    bootstrapWebRtc(callId, receiverPhone, isVideo, authToken, isIncoming = false)
                }
            }

            ACTION_END_CALL -> {
                teardown()
                stopSelf()
            }
        }

        return START_NOT_STICKY
    }

    /**
     * CRITICAL: Native WebRTC bootstrap — no WebView needed
     * 
     * Timeline:
     * T+0ms:   Service started
     * T+50ms:  PeerConnectionFactory initialized (cached singleton)
     * T+100ms: PeerConnection created with ICE servers
     * T+150ms: Audio track created + added
     * T+200ms: Signaling connected
     * T+300ms: SDP exchange begins
     * T+500ms: ICE candidates flowing
     * T+800ms: Audio connected
     */
    private suspend fun bootstrapWebRtc(
        callId: String,
        remotePhone: String,
        isVideo: Boolean,
        authToken: String,
        isIncoming: Boolean
    ) {
        val startTime = System.currentTimeMillis()
        Log.d(TAG, "⚡ WebRTC bootstrap START for $callId (incoming=$isIncoming)")

        try {
            // Step 1: Ensure PeerConnectionFactory is ready (singleton, ~50ms first time)
            val factory = factoryProvider.factory
            Log.d(TAG, "⚡ Factory ready: ${System.currentTimeMillis() - startTime}ms")

            // Step 2: Initialize WebRTC client (creates PeerConnection)
            webRtcClient.initialize(isVideo)
            Log.d(TAG, "⚡ WebRtcClient initialized: ${System.currentTimeMillis() - startTime}ms")

            // Step 3: Set up ICE candidate callback → send to signaling
            webRtcClient.setOnLocalIceCandidate { candidate ->
                serviceScope.launch {
                    signalingClient.sendIceCandidate(
                        candidate.sdpMid,
                        candidate.sdpMLineIndex,
                        candidate.sdp
                    )
                }
            }

            // Step 4: Connect to signaling server
            signalingClient.connect(callId, authToken)
            Log.d(TAG, "⚡ Signaling connected: ${System.currentTimeMillis() - startTime}ms")

            // Step 5: Listen for signaling events
            serviceScope.launch {
                signalingClient.events.collect { event ->
                    handleSignalingEvent(event, isIncoming)
                }
            }

            // Step 6: If outgoing, create and send offer
            if (!isIncoming) {
                callStateMachine.transition(CallState.Initiating)
                val offer = webRtcClient.createOffer()
                offer?.let {
                    signalingClient.sendOffer(it.description)
                    Log.d(TAG, "⚡ Offer sent: ${System.currentTimeMillis() - startTime}ms")
                }
            } else {
                callStateMachine.transition(CallState.Connecting)
            }

            isBootstrapped = true
            val elapsed = System.currentTimeMillis() - startTime
            Log.d(TAG, "⚡ WebRTC bootstrap COMPLETE in ${elapsed}ms for $callId")

        } catch (e: Exception) {
            Log.e(TAG, "❌ WebRTC bootstrap FAILED for $callId", e)
            callStateMachine.transition(CallState.Failed(
                com.chatr.app.webrtc.state.FailureReason.INITIALIZATION_ERROR
            ))
            teardown()
            stopSelf()
        }
    }

    /**
     * Handle incoming signaling events
     */
    private suspend fun handleSignalingEvent(
        event: com.chatr.app.webrtc.signaling.CallSignalingEvent.Incoming,
        isIncoming: Boolean
    ) {
        when (event) {
            is com.chatr.app.webrtc.signaling.CallSignalingEvent.Incoming.Offer -> {
                if (isIncoming) {
                    // Set remote description and create answer
                    webRtcClient.setRemoteDescription(
                        org.webrtc.SessionDescription(
                            org.webrtc.SessionDescription.Type.OFFER,
                            event.sdp
                        )
                    )
                    val answer = webRtcClient.createAnswer()
                    answer?.let {
                        signalingClient.sendAnswer(it.description)
                        Log.d(TAG, "⚡ Answer sent")
                    }
                }
            }

            is com.chatr.app.webrtc.signaling.CallSignalingEvent.Incoming.Answer -> {
                if (!isIncoming) {
                    webRtcClient.setRemoteDescription(
                        org.webrtc.SessionDescription(
                            org.webrtc.SessionDescription.Type.ANSWER,
                            event.sdp
                        )
                    )
                    Log.d(TAG, "⚡ Remote answer set")
                }
            }

            is com.chatr.app.webrtc.signaling.CallSignalingEvent.Incoming.IceCandidate -> {
                webRtcClient.addIceCandidate(
                    org.webrtc.IceCandidate(event.sdpMid, event.sdpMLineIndex, event.candidate)
                )
            }

            is com.chatr.app.webrtc.signaling.CallSignalingEvent.Incoming.CallEnded -> {
                Log.d(TAG, "📞 Remote ended call")
                callStateMachine.transition(CallState.Disconnected)
                teardown()
                stopSelf()
            }

            else -> {
                Log.d(TAG, "Unhandled signaling event: $event")
            }
        }
    }

    /**
     * Clean up all resources
     */
    private fun teardown() {
        Log.d(TAG, "🧹 Tearing down WebRTC service")
        
        serviceScope.launch {
            try {
                webRtcClient.dispose()
                signalingClient.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Teardown error", e)
            }
        }
        
        releaseWakeLock()
        currentCallId = null
        isBootstrapped = false
    }

    private fun acquireWakeLock() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "chatr:webrtc-call"
        ).apply {
            acquire(30 * 60 * 1000L) // 30 min max
        }
        Log.d(TAG, "🔋 WakeLock acquired")
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        wakeLock = null
        Log.d(TAG, "🔋 WakeLock released")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ACTIVE_CALL,
                "Active Call",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when a call is active"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildCallNotification(name: String, isIncoming: Boolean): Notification {
        val label = if (isIncoming) "Call with $name" else "Calling $name"
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, CallActivity::class.java).apply {
                putExtra(EXTRA_CALL_ID, currentCallId)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return Notification.Builder(this, CHANNEL_ACTIVE_CALL)
            .setContentTitle("Chatr")
            .setContentText(label)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        teardown()
        serviceScope.cancel()
        super.onDestroy()
        Log.d(TAG, "WebRtcForegroundService destroyed")
    }
}
