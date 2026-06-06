package com.chatr.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.bumptech.glide.Glide
import com.chatr.app.engine.CallEngineState
import com.chatr.app.engine.ChatrCallEngine
import com.chatr.app.engine.routing.AffinityUpdateWorker
import com.chatr.app.nativecalls.NativeOutgoingVoipCall
import com.chatr.app.nativecalls.NativeVoipCallLog
import com.chatr.app.nativecalls.SupabaseNativeCallClient
import com.chatr.app.nativecallaudio.CallTone
import com.chatr.app.nativecallaudio.ToneManager
import com.chatr.app.receivers.NotificationActionReceiver
import com.chatr.app.services.CallForegroundService
import com.chatr.app.services.ChatrVoipCallRegistry
import org.webrtc.SurfaceViewRenderer
import org.webrtc.VideoTrack
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.webrtc.EglBase
import org.webrtc.RendererCommon
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.os.Build
import java.util.Locale
import android.view.MotionEvent
import com.chatr.app.ondeviceai.OnDeviceAiService
import com.chatr.app.telecom.ChatrPhoneAccountManager

class ChatrCallsActivity : AppCompatActivity() {

    // Whether this is a video call (used to control which UI is shown when no remote video yet)
    private var isVideoCall = false

    private val TAG = "ChatrCallsActivity"

    private lateinit var remoteVideoView: SurfaceViewRenderer
    private lateinit var localVideoView: SurfaceViewRenderer
    private lateinit var audioCallUiContainer: View

    private lateinit var callerAvatarImage: ImageView
    private lateinit var callerInitialText: TextView
    private lateinit var callerNameText: TextView
    private lateinit var callerPhoneText: TextView
    private lateinit var audioPhoneText: TextView
    private lateinit var callStatusText: TextView
    private lateinit var callerBackgroundImage: ImageView
    private lateinit var aiPanelsContainer: View
    private lateinit var aiAssistantPanel: View
    private lateinit var btnMute: View
    private lateinit var btnCamera: View
    private lateinit var btnSwitchCamera: View
    private lateinit var btnEndCall: View
    private lateinit var btnTranslate: View
    private lateinit var btnSpeaker: View
    private lateinit var btnAddParticipant: View
    private lateinit var participantStrip: LinearLayout
    private lateinit var participantStripScroll: View

    private lateinit var interpreterUiContainer: View
    private lateinit var txtOutgoingOriginal: TextView
    private lateinit var txtOutgoingTranslated: TextView
    private lateinit var txtIncomingOriginal: TextView
    private lateinit var txtIncomingTranslated: TextView
    private lateinit var btnInterpreterSpeak: View

    private var isSpeakerOn = false

    private var currentRemoteTrack: VideoTrack? = null
    private var currentLocalTrack: VideoTrack? = null

    private var isMuted = false
    private var isCameraEnabled = false // Will be set based on callType

    // GSM-style ringback tone (plays on caller side while RINGING)
    private val toneManager by lazy { ToneManager.getInstance(applicationContext) }
    private var isRingbackPlaying = false

    private var speechRecognizer: SpeechRecognizer? = null
    private var textToSpeech: TextToSpeech? = null
    private val onDeviceAiService by lazy {
        OnDeviceAiService(applicationContext)
    }

    private var callStartTime: Long = 0L
    private val uiHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val updateTimeTask = object : Runnable {
        override fun run() {
            if (callStartTime > 0) {
                val durationSec = (System.currentTimeMillis() - callStartTime) / 1000
                val min = durationSec / 60
                val sec = durationSec % 60
                callStatusText.text = String.format("%02d:%02d", min, sec)
                uiHandler.postDelayed(this, 1000)
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Data resolved from cross-process SharedPreferences (VoIP registry)
    // ─────────────────────────────────────────────────────────────────
    private var callId: String = ""
    private var callerId: String = ""
    private var callType: String = "audio"
    private var callerName: String = "Unknown"
    private var callerAvatar: String? = null
    private var callerPhone: String = ""
    private var conversationId: String = ""
    private var isOutgoingCall = false
    private var pendingOutgoingNumber: String? = null
    private var outgoingStartInFlight = false
    private var callFinalized = false
    private var callStartedAt = System.currentTimeMillis()
    private var observingEngine = false
    private var callbackRouteAccountId = ChatrPhoneAccountManager.VOIP_ACCOUNT_ID
    private var callbackRoutingReason = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        if (routeLauncherTapToCalls(intent)) {
            return
        }
        if (!NativeCallMode.mediaEngineEnabled(this)) {
            finishNativeOnlyLaunch(intent)
            return
        }

        // Ensure UI stays on above lock screen
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )

        setContentView(R.layout.activity_chatr_calls)

        remoteVideoView = findViewById(R.id.remoteVideoView)
        localVideoView = findViewById(R.id.localVideoView)
        audioCallUiContainer = findViewById(R.id.audioCallUiContainer)
        callerAvatarImage = findViewById(R.id.callerAvatarImage)
        callerInitialText = findViewById(R.id.callerInitialText)
        callerNameText = findViewById(R.id.callerNameText)
        callerPhoneText = findViewById(R.id.callerPhoneText)
        audioPhoneText = findViewById(R.id.audioPhoneText)
        callStatusText = findViewById(R.id.callStatusText)
        callerBackgroundImage = findViewById(R.id.callerBackgroundImage)
        aiPanelsContainer = findViewById(R.id.aiPanelsContainer)
        aiAssistantPanel = findViewById(R.id.aiAssistantPanel)
        
        btnMute = findViewById(R.id.btnMute)
        btnCamera = findViewById(R.id.btnCamera)
        btnSwitchCamera = findViewById(R.id.btnSwitchCamera)
        btnEndCall = findViewById(R.id.btnEndCall)
        btnTranslate = findViewById(R.id.btnTranslate)
        btnSpeaker = findViewById(R.id.btnSpeaker)
        btnAddParticipant = findViewById(R.id.btnAddParticipant)
        participantStrip = findViewById(R.id.participantStrip)
        participantStripScroll = findViewById(R.id.participantStripScroll)

        // Bind Interpreter UI
        interpreterUiContainer = findViewById(R.id.interpreterUiContainer)
        txtOutgoingOriginal = findViewById(R.id.txtOutgoingOriginal)
        txtOutgoingTranslated = findViewById(R.id.txtOutgoingTranslated)
        txtIncomingOriginal = findViewById(R.id.txtIncomingOriginal)
        txtIncomingTranslated = findViewById(R.id.txtIncomingTranslated)
        btnInterpreterSpeak = findViewById(R.id.btnInterpreterSpeak)

        pendingOutgoingNumber = extractOutgoingPhoneNumber(intent)

        // Phase 3 Stage 1: Read call data from SharedPreferences registry (cross-process safe)
        // The :telecom process already wrote this data when FCM push arrived.
        if (!pendingOutgoingNumber.isNullOrBlank() && intent.getStringExtra("call_id").isNullOrBlank()) {
            isOutgoingCall = true
            callerPhone = pendingOutgoingNumber.orEmpty()
            callerName = callerPhone.ifBlank { "Unknown" }
            callType = normalizeCallType(intent.getStringExtra("call_type") ?: "audio")
            callStartedAt = System.currentTimeMillis()
            Log.i(TAG, "Preparing native outgoing call to $callerPhone")
        } else {
            resolveCallDataFromRegistryOrIntent(intent)
        }

        bindCallMetadataToUI()
        applyNativeCallbackExtras(intent)

        // Initialize Renderers for ultra-fast, hardware-accelerated video
        val eglBase = ChatrCallEngine.eglBase
        
        remoteVideoView.init(eglBase.eglBaseContext, null)
        remoteVideoView.setEnableHardwareScaler(true)
        remoteVideoView.setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FILL) // FaceTime-like immersive full-screen
        
        localVideoView.init(eglBase.eglBaseContext, null)
        localVideoView.setEnableHardwareScaler(true)
        localVideoView.setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FILL)
        localVideoView.setMirror(true)
        localVideoView.setZOrderMediaOverlay(true) // Ensure local PIP floats cleanly above remote video

        // Initialize isCameraEnabled based on call type
        isCameraEnabled = (callType == "video")

        setupButtons()
        setupTranslationEngine()
        if (!pendingOutgoingNumber.isNullOrBlank() && callId.isBlank()) {
            requestPermissionsAndStartOutgoing(pendingOutgoingNumber.orEmpty())
        } else {
            requestPermissionsAndBootstrapEngine()
        }
    }

    /** Called when :telecom process re-delivers an answer_call Intent to an already-running activity. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (routeLauncherTapToCalls(intent)) {
            return
        }
        if (!NativeCallMode.mediaEngineEnabled(this)) {
            finishNativeOnlyLaunch(intent)
            return
        }

        val outgoingNumber = extractOutgoingPhoneNumber(intent)
        if (!outgoingNumber.isNullOrBlank() && intent.getStringExtra("call_id").isNullOrBlank()) {
            pendingOutgoingNumber = outgoingNumber
            isOutgoingCall = true
            callerPhone = outgoingNumber
            callerName = outgoingNumber
            bindCallMetadataToUI()
            applyNativeCallbackExtras(intent)
            requestPermissionsAndStartOutgoing(outgoingNumber)
            return
        }
        val newCallId = intent.getStringExtra("call_id")?.takeIf { it.isNotBlank() }
            ?: com.chatr.app.services.ChatrVoipCallRegistry.activeIdentity(this)?.callId
            ?: return
        if (newCallId.isNotBlank() && (newCallId != callId || callId.isBlank())) {
            Log.i(TAG, "onNewIntent: new call $newCallId received while activity running")
            resolveCallDataFromRegistryOrIntent(intent)
            bindCallMetadataToUI()
            applyNativeCallbackExtras(intent)
            bootstrapEngine()
        }
    }

    private fun applyNativeCallbackExtras(src: Intent?) {
        if (src?.getBooleanExtra("EXTRA_CALLBACK", false) != true) {
            callbackRouteAccountId = ChatrPhoneAccountManager.VOIP_ACCOUNT_ID
            callbackRoutingReason = ""
            return
        }
        callbackRouteAccountId = src.getStringExtra("EXTRA_CALL_TYPE")
            ?: ChatrPhoneAccountManager.VOIP_ACCOUNT_ID
        callbackRoutingReason = src.getStringExtra("EXTRA_ROUTING_REASON").orEmpty()
        val message = if (callbackRouteAccountId == ChatrPhoneAccountManager.VOIP_ACCOUNT_ID) {
            "Calling via Chatr"
        } else {
            val simLabel = if (callbackRouteAccountId == ChatrPhoneAccountManager.SIM_1_ACCOUNT_ID) "SIM 2" else "SIM 1"
            "Calling via $simLabel"
        }
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        Log.i(TAG, "Native Recents callback route=$callbackRouteAccountId reason=$callbackRoutingReason")
    }

    private fun routeLauncherTapToCalls(src: Intent?): Boolean {
        if (src?.action != Intent.ACTION_MAIN || !src.hasCategory(Intent.CATEGORY_LAUNCHER)) {
            return false
        }
        if (hasCallIntentPayload(src)) {
            Log.i(TAG, "MAIN/LAUNCHER intent contains call payload; keeping native call UI")
            return false
        }

        Log.i(TAG, "Launched from ChatrCalls icon. Routing MainActivity to /calls.")
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(MainActivity.EXTRA_CHATRCALLS_LAUNCH, true)
            putExtra("navigate_to", "/calls")
            putExtra("source", "chatrcalls_launcher")
        }
        startActivity(mainIntent)
        finish()
        return true
    }

    private fun hasCallIntentPayload(src: Intent): Boolean {
        if (com.chatr.app.services.ChatrVoipCallRegistry.hasRecentIncoming(this)) {
            return true
        }

        if (src.data?.scheme == "tel") return true

        val actionExtra = src.getStringExtra("action")
        if (actionExtra in setOf("answer_call", "answer", "start_outgoing", "end_call", "end")) {
            return true
        }

        return listOf(
            "call_id",
            "caller_id",
            "receiver_id",
            "caller_name",
            "display_name",
            "caller_phone",
            "caller_number",
            "phone_number",
            "conversation_id",
        ).any { key -> !src.getStringExtra(key).isNullOrBlank() }
    }

    private fun finishNativeOnlyLaunch(src: Intent?) {
        val launchedCallId = src?.getStringExtra("call_id").orEmpty()
        val launchedAction = src?.getStringExtra("action") ?: src?.action.orEmpty()
        Log.i(
            TAG,
            "Native-call-only mode; closing ChatrCallsActivity action=$launchedAction callId=${launchedCallId.take(8)}",
        )
        if (launchedCallId.isNotBlank()) {
            ChatrVoipCallRegistry.clear(this, launchedCallId)
        }
        Toast.makeText(this, "Native call mode active", Toast.LENGTH_SHORT).show()
        finish()
    }

    /**
     * Resolves call metadata from the VoIP registry (SharedPreferences) first,
     * then falls back to intent extras. The registry is the ground truth written
     * by NativeCallBootstrapService in the :telecom process.
     */
    private fun resolveCallDataFromRegistryOrIntent(src: Intent) {
        val intentCallId = src.getStringExtra("call_id") ?: ""
        val registry = com.chatr.app.services.ChatrVoipCallRegistry.activeIdentity(this)

        if (registry != null && (intentCallId.isBlank() || registry.callId == intentCallId)) {
            callId           = registry.callId
            callerId         = registry.callerId
            callType         = normalizeCallType(registry.callType)
            callerName       = registry.callerName
            callerAvatar     = registry.callerAvatar
            callerPhone      = registry.callerPhone
            conversationId   = registry.conversationId
            isOutgoingCall   = isStartOutgoingIntent(src)
            Log.i(TAG, "Resolved call data from VoIP registry: $callId ($callType) from $callerName")
        } else {
            // Fallback to direct intent extras (e.g., answer via IncomingCallActivity)
            val phone = src.getStringExtra("caller_phone")
                ?: src.getStringExtra("caller_number")
                ?: src.getStringExtra("phone_number")
                ?: ""
            callId           = intentCallId
            callerId         = src.getStringExtra("caller_id") ?: src.getStringExtra("receiver_id") ?: ""
            callType         = normalizeCallType(src.getStringExtra("call_type") ?: "audio")
            callerName       = src.getStringExtra("caller_name")
                ?: src.getStringExtra("display_name")
                ?: phone.ifBlank { "Unknown caller" }
            callerAvatar     = src.getStringExtra("caller_avatar")
            callerPhone      = phone
            conversationId   = src.getStringExtra("conversation_id") ?: ""
            isOutgoingCall   = src.getStringExtra("action") == "start_outgoing"
            Log.i(TAG, "Resolved call data from Intent extras: $callId ($callType) from $callerName")
        }
    }

    private fun extractOutgoingPhoneNumber(src: Intent?): String? {
        if (src == null) return null
        src.getStringExtra("phone_number")?.takeIf { it.isNotBlank() }?.let { return it }
        src.getStringExtra("caller_phone")?.takeIf { it.isNotBlank() }?.let { return it }
        val action = src.action
        val data = src.data
        if (data?.scheme == "tel" && action in setOf(Intent.ACTION_VIEW, Intent.ACTION_DIAL, Intent.ACTION_CALL)) {
            return data.schemeSpecificPart?.takeIf { it.isNotBlank() }
        }
        return null
    }

    private fun normalizeCallType(raw: String?): String =
        if (raw.equals("video", ignoreCase = true)) "video" else "audio"

    private fun isStartOutgoingIntent(src: Intent?): Boolean =
        src?.getStringExtra("action") == "start_outgoing" || src?.action == "start_outgoing"

    private fun bindCallMetadataToUI() {
        callerNameText.text = callerName.ifBlank { "Unknown Caller" }
        callerPhoneText.text = if (callerPhone.isNotBlank()) callerPhone else "Unknown Location"
        if (::audioPhoneText.isInitialized) {
            audioPhoneText.text = if (callerPhone.isNotBlank()) callerPhone else "Unknown Location"
        }
        
        val initial = if (callerName.isNotBlank()) callerName.first().uppercase() else "U"
        callerInitialText.text = initial
        
        if (!callerAvatar.isNullOrBlank()) {
            callerInitialText.visibility = View.GONE
            Glide.with(this)
                .load(callerAvatar)
                .circleCrop()
                .placeholder(R.drawable.ic_person)
                .into(callerAvatarImage)
                
            Glide.with(this)
                .load(callerAvatar)
                .into(callerBackgroundImage)
            callerBackgroundImage.visibility = View.VISIBLE
            callerBackgroundImage.alpha = 0.3f
        } else {
            callerInitialText.visibility = View.VISIBLE
            callerInitialText.text = callerName.firstOrNull { it.isLetterOrDigit() }?.uppercaseChar()?.toString() ?: "C"
            callerAvatarImage.setImageDrawable(null)
            callerBackgroundImage.visibility = View.GONE
        }

        isVideoCall = (callType == "video")
        if (callType == "audio") {
            findViewById<View>(R.id.localVideoContainer)?.visibility = View.GONE
            audioCallUiContainer.visibility = View.VISIBLE
            callStatusText.text = "Connecting..."
            isCameraEnabled = false
            btnCamera.alpha = 0.5f
        } else {
            // Video call: hide the audio avatar UI and show the dark video background
            audioCallUiContainer.visibility = View.GONE
            // Show a "Waiting for video" overlay until the remote track arrives
            showVideoWaitingOverlay(true)
            isCameraEnabled = true
            btnCamera.alpha = 1.0f
        }
    }



    private val overlayPermissionLauncher = registerForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()
    ) {
        // Continue after returning from Settings.
        // We don't block if they refused, but it's good to have checked.
        continueAfterPermissions()
    }

    private val permissionLauncher = registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestMultiplePermissions()) {
        continueAfterPermissions()
    }

    private fun continueAfterPermissions() {
        observeEngine()
        val outgoingNumber = pendingOutgoingNumber
        if (!outgoingNumber.isNullOrBlank() && callId.isBlank()) {
            startNativeOutgoingCall(outgoingNumber)
        } else {
            bootstrapEngine()
        }
    }

    private fun requestPermissionsAndBootstrapEngine() {
        pendingOutgoingNumber = null
        permissionLauncher.launch(arrayOf(
            android.Manifest.permission.CAMERA,
            android.Manifest.permission.RECORD_AUDIO
        ))
    }

    private fun requestPermissionsAndStartOutgoing(phoneNumber: String) {
        pendingOutgoingNumber = phoneNumber
        permissionLauncher.launch(arrayOf(
            android.Manifest.permission.CAMERA,
            android.Manifest.permission.RECORD_AUDIO
        ))
    }

    private fun startNativeOutgoingCall(phoneNumber: String) {
        if (outgoingStartInFlight) return
        outgoingStartInFlight = true
        callStatusText.text = "Calling..."

        lifecycleScope.launch(Dispatchers.IO) {
            val result = SupabaseNativeCallClient(applicationContext)
                .startOutgoingVoipCall(
                    rawPhoneNumber = phoneNumber,
                    requestedCallId = intent.getStringExtra("call_id"),
                    requestedCallType = intent.getStringExtra("call_type") ?: "voice",
                )

            withContext(Dispatchers.Main) {
                outgoingStartInFlight = false
                if (result == null) {
                    Log.w(TAG, "Native outgoing call could not be started for $phoneNumber")
                    callStatusText.text = "Unable to start Chatr call"
                    uiHandler.postDelayed({ finish() }, 1800L)
                    return@withContext
                }

                bindOutgoingResult(result)
                bootstrapEngine()
            }
        }
    }

    private fun bindOutgoingResult(result: NativeOutgoingVoipCall) {
        callId = result.callId
        callerId = result.receiverId
        callerName = result.receiverName
        callerAvatar = result.receiverAvatar
        callerPhone = result.receiverPhone
        conversationId = result.conversationId
        callType = normalizeCallType(result.callType)
        isOutgoingCall = true
        callStartedAt = System.currentTimeMillis()
        pendingOutgoingNumber = null

        ChatrVoipCallRegistry.markIncoming(
            context = this,
            callId = callId,
            callerId = callerId,
            callerName = callerName,
            callerAvatar = callerAvatar,
            callerPhone = callerPhone,
            callType = callType,
            conversationId = conversationId,
        )

        bindCallMetadataToUI()
        callStatusText.text = if (result.notified) "Ringing..." else "Calling..."
    }

    /**
     * Phase 3 Stage 1: the native calls process owns the 1:1 WebRTC lifecycle.
     * Called after permissions are granted. Runs prepareRoom (signaling + ICE setup)
     * then immediately chains to activateAudio on success.
     *
     * If the room is already RINGING or AUDIO_ACTIVE (e.g. ringing was pre-connected by a previous
     * code path), we go directly to activateAudio to avoid a redundant reconnect.
     */
    private fun recoverCallDataFromRegistryIfBlank() {
        if (callId.isNotBlank()) return
        val registry = com.chatr.app.services.ChatrVoipCallRegistry.activeIdentity(this) ?: return

        callId = registry.callId
        callerId = registry.callerId
        callType = normalizeCallType(registry.callType)
        callerName = registry.callerName
        callerAvatar = registry.callerAvatar
        callerPhone = registry.callerPhone
        conversationId = registry.conversationId
        isOutgoingCall = isStartOutgoingIntent(intent)
        bindCallMetadataToUI()
        Log.i(TAG, "Recovered call data from VoIP registry before bootstrap: ${callId.take(8)}")
    }

    private fun bootstrapEngine() {
        recoverCallDataFromRegistryIfBlank()
        if (callId.isBlank()) {
            Log.w(TAG, "bootstrapEngine: callId is blank — cannot bootstrap")
            return
        }

        CallForegroundService.startForCall(
            context = this,
            callId = callId,
            callType = callType,
            partnerName = callerName.ifBlank { callerPhone.ifBlank { "Active call" } },
            reason = if (isOutgoingCall) "native_call_ui_outgoing" else "native_call_ui_answer",
        )

        var snapshot = ChatrCallEngine.state.value
        val activeIdBeforeBootstrap = ChatrCallEngine.activeCallId
        Log.i(TAG, "bootstrapEngine: current engine state=$snapshot activeCallId=$activeIdBeforeBootstrap callId=$callId")
        if (!activeIdBeforeBootstrap.isNullOrBlank() && activeIdBeforeBootstrap != callId) {
            val released = ChatrCallEngine.releaseActiveCallIfDifferent(callId, "bootstrapEngine")
            snapshot = ChatrCallEngine.state.value
            Log.i(
                TAG,
                "bootstrapEngine: stale active call release=$released oldCallId=${activeIdBeforeBootstrap.take(8)} newCallId=${callId.take(8)} newState=$snapshot",
            )
        }

        // Fast-path: engine is already past the connecting phase for this call
        if (ChatrCallEngine.activeCallId == callId) {
            ChatrCallEngine.prepareRoom(
                context = applicationContext,
                callId = callId,
                callerId = callerId,
                callType = callType,
                outgoing = isOutgoingCall,
            )

            when (snapshot) {
                CallEngineState.AUDIO_ACTIVE -> {
                    Log.i(TAG, "bootstrapEngine: engine already AUDIO_ACTIVE for $callId — no action needed")
                    return
                }
                CallEngineState.ACCEPTED,
                CallEngineState.REQUESTING_MEDIA,
                CallEngineState.PUBLISHING_TRACKS,
                CallEngineState.WAITING_FOR_RTP -> {
                    Log.i(TAG, "bootstrapEngine: media activation already in progress for $callId at $snapshot")
                    return
                }
                CallEngineState.RINGING -> {
                    Log.i(TAG, "bootstrapEngine: engine already RINGING for $callId — activating audio directly")
                    ChatrCallEngine.activateAudio(callId)
                    return
                }
                else -> Unit // Fall through to prepareRoom
            }
        }

        Log.i(TAG, "bootstrapEngine: starting prepareRoom for $callId ($callType)")
        lifecycleScope.launch(Dispatchers.IO) {
            // Subscribe to state changes BEFORE calling prepareRoom so we
            // never miss a state transition (eliminates the race window).
            val stateFlow = ChatrCallEngine.state

            ChatrCallEngine.prepareRoom(
                context = applicationContext,
                callId = callId,
                callerId = callerId,
                callType = callType,
                outgoing = isOutgoingCall,
            )

            // After prepareRoom returns the coroutine has started; read the
            // CURRENT state first — if it's already RINGING (fast device) we
            // don't need to wait for a new emission.
            val currentAfterPrepare = stateFlow.value
            val arrivedState = when {
                currentAfterPrepare != CallEngineState.IDLE &&
                currentAfterPrepare != CallEngineState.PRECONNECTING &&
                currentAfterPrepare != CallEngineState.INCOMING_PUSH_RECEIVED -> {
                    Log.i(TAG, "bootstrapEngine: state already $currentAfterPrepare after prepareRoom — using it directly")
                    currentAfterPrepare
                }
                else -> {
                    // State is still transitional — wait for the first stable state.
                    stateFlow
                        .filter { it != CallEngineState.IDLE &&
                                   it != CallEngineState.PRECONNECTING &&
                                   it != CallEngineState.INCOMING_PUSH_RECEIVED }
                        .first()
                }
            }

            when (arrivedState) {
                CallEngineState.RINGING -> {
                    Log.i(TAG, "bootstrapEngine: room connected for $callId — activating audio")
                    ChatrCallEngine.activateAudio(callId)
                }
                CallEngineState.ACCEPTED,
                CallEngineState.REQUESTING_MEDIA,
                CallEngineState.PUBLISHING_TRACKS,
                CallEngineState.WAITING_FOR_RTP,
                CallEngineState.AUDIO_ACTIVE -> {
                    Log.i(TAG, "bootstrapEngine: engine already in active state $arrivedState for $callId — activation in progress or done")
                }
                else -> {
                    Log.w(TAG, "bootstrapEngine: engine reached $arrivedState for $callId — audio activation skipped")
                }
            }
        }
    }

    private fun setupButtons() {
        btnMute.setOnClickListener {
            isMuted = !isMuted
            ChatrCallEngine.setMuted(isMuted)
            // Visual feedback: dim when muted, bright when active
            btnMute.alpha = if (isMuted) 0.4f else 1.0f
            btnMute.setBackgroundResource(
                if (isMuted) R.drawable.circle_red_bg else R.drawable.circle_primary_bg
            )
        }

        // Initialize UI state for camera toggle based on callType
        btnCamera.alpha = if (isCameraEnabled) 1.0f else 0.4f
        val initialLocalContainer = findViewById<View>(R.id.localVideoContainer)
        initialLocalContainer?.visibility = if (isCameraEnabled) View.VISIBLE else View.GONE

        btnCamera.setOnClickListener {
            isCameraEnabled = !isCameraEnabled
            ChatrCallEngine.setVideoEnabled(isCameraEnabled)
            btnCamera.alpha = if (isCameraEnabled) 1.0f else 0.4f
            // Show/hide local video container
            val localContainer = findViewById<View>(R.id.localVideoContainer)
            localContainer?.visibility = if (isCameraEnabled) View.VISIBLE else View.GONE
        }

        btnSwitchCamera.setOnClickListener {
            ChatrCallEngine.switchCamera()
        }

        btnSpeaker.setOnClickListener {
            isSpeakerOn = !isSpeakerOn
            ChatrCallEngine.setSpeakerphoneOn(isSpeakerOn)
            btnSpeaker.alpha = if (isSpeakerOn) 1.0f else 0.4f
            btnSpeaker.setBackgroundResource(
                if (isSpeakerOn) R.drawable.circle_primary_bg else R.drawable.bg_glass_panel
            )
        }

        btnAddParticipant.setOnClickListener {
            val activeId = ChatrCallEngine.activeCallId ?: callId
            if (activeId.isNotBlank()) {
                AddParticipantBottomSheet
                    .newInstance(activeId, callType)
                    .show(supportFragmentManager, "add_participant")
            } else {
                Toast.makeText(this, "No active call", Toast.LENGTH_SHORT).show()
            }
        }

        btnEndCall.setOnClickListener {
            val activeId = ChatrCallEngine.activeCallId ?: callId
            if (activeId.isNotBlank()) {
                finalizeNativeCall("ended")
                sendTelecomEnd(activeId)
                ChatrCallEngine.endCall(activeId)
            } else {
                finish()
            }
        }
    }

    private fun sendTelecomEnd(activeId: String) {
        val intent = Intent(this, NotificationActionReceiver::class.java).apply {
            action = "ACTION_END_CALL"
            putExtra("call_id", activeId)
            putExtra("caller_name", callerName)
            putExtra("caller_phone", callerPhone)
            putExtra("phone_number", callerPhone)
            putExtra("call_type", callType)
            putExtra("direction", if (isOutgoingCall) "outgoing" else "incoming")
            putExtra("started_at", callStartedAt)
            putExtra("duration_seconds", currentDurationSeconds())
        }
        sendBroadcast(intent)
    }

    private fun finalizeNativeCall(status: String) {
        if (callFinalized || callId.isBlank()) return
        callFinalized = true
        Log.i(TAG, "CALL_ENDED callId=$callId source=native_call_ui status=$status")
        val now = System.currentTimeMillis()
        NativeVoipCallLog.record(
            context = this,
            callId = callId,
            phoneNumber = callerPhone,
            displayName = callerName,
            direction = if (isOutgoingCall) "outgoing" else "incoming",
            status = status,
            startedAt = callStartedAt,
            endedAt = now,
            durationSeconds = currentDurationSeconds(now),
            callType = callType,
        )
        AffinityUpdateWorker.enqueue(
            context = this,
            normalizedNumber = callerPhone,
            simSlotIndex = 0,
            wasSuccessful = status == "ended" && callStartTime > 0L,
            rsrpDbm = -100,
            callId = callId,
            displayName = callerName,
            cachedPhotoUri = callerAvatar,
            direction = if (isOutgoingCall) "outgoing" else "incoming",
            status = status,
            startedAt = callStartedAt,
            durationSeconds = currentDurationSeconds(now),
            callType = callType,
            accountId = callbackRouteAccountId,
        )
        lifecycleScope.launch(Dispatchers.IO) {
            SupabaseNativeCallClient(applicationContext).updateVoipCallStatus(callId, status)
        }
        ChatrVoipCallRegistry.clear(this, callId)
        CallForegroundService.releaseIfNoActiveCall(this, "native_call_finalized_$status")
    }

    private fun currentDurationSeconds(now: Long = System.currentTimeMillis()): Long =
        if (callStartTime > 0L) ((now - callStartTime) / 1000L).coerceAtLeast(0L) else 0L

    private fun setupTranslationEngine() {
        textToSpeech = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                textToSpeech?.language = Locale("hi", "IN") // Set default to Hindi or Punjabi based on user pref
            }
        }

        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onError(error: Int) {
                Log.e(TAG, "Speech recognition error: $error")
                // Unmute on error
                if (!isMuted) ChatrCallEngine.setMuted(false)
            }
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val text = matches?.firstOrNull()
                if (!text.isNullOrBlank()) {
                    translateAndSend(text)
                }
                // Unmute after recognition
                if (!isMuted) ChatrCallEngine.setMuted(false)
            }
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        btnTranslate.setOnClickListener {
            // Toggle visibility of the bidirectional UI
            val isVisible = interpreterUiContainer.visibility == View.VISIBLE
            interpreterUiContainer.visibility = if (isVisible) View.GONE else View.VISIBLE
            btnTranslate.alpha = if (isVisible) 0.5f else 1.0f
        }

        btnInterpreterSpeak.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    // Mute the native WebRTC mic while speech recognition is listening.
                    ChatrCallEngine.setMuted(true)
                    v.alpha = 0.5f
                    
                    txtOutgoingOriginal.text = "Listening..."
                    txtOutgoingTranslated.text = "..."
                    
                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    }
                    speechRecognizer?.startListening(intent)
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    v.alpha = 1.0f
                    speechRecognizer?.stopListening()
                    true
                }
                else -> false
            }
        }
    }

    private fun translateAndSend(sourceText: String) {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                // Using Gemini Nano via OnDeviceAiService
                val prompt = "Translate the following text to Punjabi: $sourceText"
                val result = onDeviceAiService.generate(prompt = prompt, task = "translate")
                val translated = result.text.trim()
                if (translated.isNotEmpty()) {
                    Log.i(TAG, "Translated locally: $translated")
                    withContext(Dispatchers.Main) {
                        txtOutgoingOriginal.text = sourceText
                        txtOutgoingTranslated.text = translated
                    }
                    ChatrCallEngine.sendTranslatedText(translated)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Local translation failed", e)
            }
        }
    }

    // Track whether we've been in an active call to decide if IDLE means "call ended"
    private var hasBeenActive = false

    private fun observeEngine() {
        if (observingEngine) return
        observingEngine = true
        // Observe Call State
        ChatrCallEngine.state.onEach { state ->
            Log.d(TAG, "Engine state: $state")
            val engineCallId = ChatrCallEngine.activeCallId
            if (state.isTerminal && !engineCallId.isNullOrBlank() && engineCallId != callId) {
                Log.i(TAG, "Ignoring stale terminal engine state $state for $engineCallId while handling $callId")
                return@onEach
            }
            when (state) {
                CallEngineState.AUDIO_ACTIVE -> {
                    Log.i(TAG, "CALL_ACTIVE callId=$callId source=native_engine state=AUDIO_ACTIVE")
                    hasBeenActive = true
                    if (callStartTime == 0L) {
                        callStartTime = System.currentTimeMillis()
                        uiHandler.post(updateTimeTask)
                    }
                    stopRingback() // answer received — stop ringback tone
                    callStatusText.text = ""
                    
                    // Auto-publish video track if this is a video call
                    if (isCameraEnabled) {
                        ChatrCallEngine.setVideoEnabled(true)
                    }
                }
                CallEngineState.RINGING -> {
                    startRingback() // start playing ringback tone for caller
                    callStatusText.text = "Ringing..."
                }
                CallEngineState.ACCEPTED,
                CallEngineState.REQUESTING_MEDIA,
                CallEngineState.PUBLISHING_TRACKS,
                CallEngineState.WAITING_FOR_RTP,
                CallEngineState.PRECONNECTING,
                CallEngineState.INCOMING_PUSH_RECEIVED -> {
                    callStatusText.text = "Connecting..."
                }
                else -> { /* no text update */ }
            }
            // Only finish on terminal states or IDLE if we were previously in an active state.
            // Without this guard, observeEngine would immediately finish() the activity
            // when it launches (engine state starts as IDLE and bootstrapEngine hasn't
            // connected yet).
            if (state.isTerminal || (state == CallEngineState.IDLE && hasBeenActive)) {
                val finalStatus = when (state) {
                    CallEngineState.MISSED -> "missed"
                    CallEngineState.REJECTED -> "rejected"
                    CallEngineState.FAILED -> "failed"
                    else -> "ended"
                }
                val durationSec = currentDurationSeconds()
                stopRingback()
                finalizeNativeCall(finalStatus)

                // ── Auto post-call summary ──────────────────────────────────────────
                // Only show for "ended" calls that lasted more than 5 seconds.
                // Sub-5s calls are failed/rejected — no summary needed.
                if (finalStatus == "ended" && durationSec >= 5) {
                    lifecycleScope.launch(Dispatchers.IO) {
                        try {
                            val summary = com.chatr.app.services.CallSummaryEngine()
                                .generateCallSummary(
                                    phoneNumber = callerPhone,
                                    contactName = callerName,
                                    durationSeconds = durationSec,
                                )
                            // Persist summary locally so it can be queried later
                            com.chatr.app.services.CallSummaryEngine.saveSummary(applicationContext, summary)
                            
                            kotlinx.coroutines.delay(1_500L) // let call UI dismiss first
                            withContext(Dispatchers.Main) {
                                PostCallSummaryActivity.start(
                                    context = applicationContext,
                                    phone = callerPhone,
                                    summary = summary.summary,
                                    keyPoints = summary.keyPoints,
                                    actionItems = summary.actionItems,
                                    source = summary.source,
                                )
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to generate post-call summary", e)
                        }
                    }
                }

                Log.i(TAG, "CALL_UI_DISMISS callId=$callId state=$state finalStatus=$finalStatus")
                finish()

            }
        }.launchIn(lifecycleScope)

        // Observe Remote Video Tracks
        ChatrCallEngine.remoteVideoTracks.onEach { tracks ->
            val firstRemote = tracks.values.firstOrNull()

            if (firstRemote != null) {
                // Remote video arrived — hide all non-video UIs, show the full-screen video
                audioCallUiContainer.visibility = View.GONE
                showVideoWaitingOverlay(false)
                remoteVideoView.visibility = View.VISIBLE
            } else {
                // No remote video yet
                if (isVideoCall) {
                    // Video call without remote track yet: keep audio UI hidden, show waiting overlay
                    audioCallUiContainer.visibility = View.GONE
                    showVideoWaitingOverlay(true)
                    remoteVideoView.visibility = View.GONE
                } else {
                    // Pure audio call: show audio UI with avatar
                    audioCallUiContainer.visibility = View.VISIBLE
                    remoteVideoView.visibility = View.GONE
                }
            }

            if (firstRemote != currentRemoteTrack) {
                try {
                    currentRemoteTrack?.removeSink(remoteVideoView)
                } catch (e: IllegalStateException) {
                    Log.w("ChatrCallsActivity", "Failed to remove sink from old remote track (likely disposed)")
                }
                currentRemoteTrack = firstRemote
                try {
                    firstRemote?.addSink(remoteVideoView)
                    if (firstRemote != null) {
                        Log.i(TAG, "REMOTE_VIDEO_ATTACHED callId=$callId trackId=${firstRemote.id()} view=remoteVideoView timestamp=${System.currentTimeMillis()}")
                    }
                } catch (e: IllegalStateException) {
                    Log.w("ChatrCallsActivity", "Failed to add sink to new remote track")
                }
            }
        }.launchIn(lifecycleScope)

        // Observe Local Video Track
        ChatrCallEngine.localVideoTrack.onEach { track ->
            if (track != currentLocalTrack) {
                try {
                    currentLocalTrack?.removeSink(localVideoView)
                } catch (e: IllegalStateException) {
                    Log.w("ChatrCallsActivity", "Failed to remove sink from old local track")
                }
                currentLocalTrack = track
                if (track != null) {
                    try {
                        track.addSink(localVideoView)
                        Log.i(TAG, "LOCAL_VIDEO_ATTACHED callId=$callId trackId=${track.id()} view=localVideoView timestamp=${System.currentTimeMillis()}")
                    } catch (e: IllegalStateException) {
                        Log.w("ChatrCallsActivity", "Failed to add sink to new local track")
                    }
                    localVideoView.visibility = View.VISIBLE
                } else {
                    localVideoView.visibility = View.GONE
                }
            }
        }.launchIn(lifecycleScope)

        // Observe Remote Participants — update participant strip
        ChatrCallEngine.remoteParticipants.onEach { participants ->
            updateParticipantStrip(participants)
        }.launchIn(lifecycleScope)

        // Observe Incoming Translated Text
        ChatrCallEngine.incomingTranslatedText.onEach { text ->
            if (!text.isNullOrBlank()) {
                Log.i(TAG, "Speaking received translation: $text")
                textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, null)
                ChatrCallEngine.clearIncomingTranslatedText()
            }
        }.launchIn(lifecycleScope)
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "APP_PROCESS_DESTROYED component=ChatrCallsActivity pid=${android.os.Process.myPid()}")
        uiHandler.removeCallbacks(updateTimeTask)
        stopRingback()
        // Guard against early-return from onCreate (trampoline/bounce path)
        // where the views were never initialized.
        if (::remoteVideoView.isInitialized) {
            currentRemoteTrack?.removeSink(remoteVideoView)
            remoteVideoView.release()
        }
        if (::localVideoView.isInitialized) {
            currentLocalTrack?.removeSink(localVideoView)
            localVideoView.release()
        }
        speechRecognizer?.destroy()
        textToSpeech?.stop()
        textToSpeech?.shutdown()
    }

    // ─────────────────────────────────────────────────────────────────
    // Ringback Tone
    // ─────────────────────────────────────────────────────────────────

    private fun startRingback() {
        // Only play for outgoing calls and only if not already playing
        if (!isOutgoingCall || isRingbackPlaying) return
        toneManager.playTone(CallTone.RINGBACK, callId.ifBlank { null })
        isRingbackPlaying = true
        Log.i(TAG, "GSM ringback tone started")
    }

    private fun stopRingback() {
        if (!isRingbackPlaying) return
        toneManager.stopTone()
        isRingbackPlaying = false
    }

    // ─────────────────────────────────────────────────────────────────
    // Participant Strip (multi-party)
    // ─────────────────────────────────────────────────────────────────

    private fun updateParticipantStrip(participants: Map<String, String>) {
        if (!::participantStrip.isInitialized) return

        participantStrip.removeAllViews()

        if (participants.size <= 1) {
            // 1-on-1 call: hide the strip
            participantStripScroll.visibility = View.GONE
            return
        }

        // Show the strip with one avatar chip per participant
        participantStripScroll.visibility = View.VISIBLE
        val density = resources.displayMetrics.density
        val chipSize = (48 * density).toInt()
        val chipMargin = (8 * density).toInt()

        participants.forEach { (identity, displayName) ->
            val chip = android.widget.FrameLayout(this).apply {
                layoutParams = LinearLayout.LayoutParams(chipSize, chipSize).apply {
                    marginEnd = chipMargin
                }
            }

            val avatarBg = android.graphics.drawable.GradientDrawable().apply {
                shape = android.graphics.drawable.GradientDrawable.OVAL
                setColor(0xFF4C6FFF.toInt())
            }

            val initial = TextView(this).apply {
                text = displayName.firstOrNull()?.uppercase() ?: "?"
                textSize = 16f
                setTextColor(0xFFFFFFFF.toInt())
                gravity = android.view.Gravity.CENTER
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                layoutParams = android.widget.FrameLayout.LayoutParams(
                    android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                    android.widget.FrameLayout.LayoutParams.MATCH_PARENT
                )
                background = avatarBg
            }

            chip.addView(initial)

            // Add a green dot to indicate they're live
            val dot = View(this).apply {
                val dotSize = (10 * density).toInt()
                layoutParams = android.widget.FrameLayout.LayoutParams(dotSize, dotSize).apply {
                    gravity = android.view.Gravity.BOTTOM or android.view.Gravity.END
                }
                background = android.graphics.drawable.GradientDrawable().apply {
                    shape = android.graphics.drawable.GradientDrawable.OVAL
                    setColor(0xFF4CAF50.toInt())
                }
            }
            chip.addView(dot)

            participantStrip.addView(chip)
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Video Waiting Overlay (shown during video call before remote track arrives)
    // ─────────────────────────────────────────────────────────────────

    private var videoWaitingOverlay: View? = null

    private fun showVideoWaitingOverlay(show: Boolean) {
        if (show) {
            if (videoWaitingOverlay == null) {
                val density = resources.displayMetrics.density
                val overlay = android.widget.FrameLayout(this).apply {
                    // Fill the whole activity
                    layoutParams = android.widget.FrameLayout.LayoutParams(
                        android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                        android.widget.FrameLayout.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(0xFF080810.toInt())
                    id = android.view.View.generateViewId()
                }

                val icon = android.widget.ImageView(this).apply {
                    setImageResource(android.R.drawable.ic_menu_camera)
                    alpha = 0.25f
                    val size = (72 * density).toInt()
                    layoutParams = android.widget.FrameLayout.LayoutParams(size, size).apply {
                        gravity = android.view.Gravity.CENTER
                        bottomMargin = (32 * density).toInt()
                    }
                    setColorFilter(0xFFAAAAAA.toInt(), android.graphics.PorterDuff.Mode.SRC_IN)
                }

                val label = android.widget.TextView(this).apply {
                    text = if (isOutgoingCall) "Waiting for video..." else "Connecting video..."
                    setTextColor(0x66FFFFFF.toInt())
                    textSize = 15f
                    gravity = android.view.Gravity.CENTER
                    layoutParams = android.widget.FrameLayout.LayoutParams(
                        android.widget.FrameLayout.LayoutParams.WRAP_CONTENT,
                        android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        gravity = android.view.Gravity.CENTER
                        topMargin = (48 * density).toInt()
                    }
                }

                // Show caller name in overlay for context
                val callerHint = android.widget.TextView(this).apply {
                    text = callerName.ifBlank { "Unknown" }
                    setTextColor(0xCCFFFFFF.toInt())
                    textSize = 20f
                    gravity = android.view.Gravity.CENTER
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    layoutParams = android.widget.FrameLayout.LayoutParams(
                        android.widget.FrameLayout.LayoutParams.WRAP_CONTENT,
                        android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        gravity = android.view.Gravity.CENTER
                        bottomMargin = (80 * density).toInt()
                    }
                }

                overlay.addView(callerHint)
                overlay.addView(icon)
                overlay.addView(label)
                videoWaitingOverlay = overlay

                // Attach to the content FrameLayout (android.R.id.content wraps the activity's root)
                val contentFrame = window.decorView.findViewById<android.widget.FrameLayout>(android.R.id.content)
                contentFrame?.addView(overlay)
            }
            videoWaitingOverlay?.visibility = View.VISIBLE
            videoWaitingOverlay?.bringToFront()
        } else {
            videoWaitingOverlay?.visibility = View.GONE
        }
    }
}
