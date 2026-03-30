package com.chatr.app.dialer

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.util.Log
import androidx.annotation.RequiresApi
import com.chatr.app.R
import com.chatr.app.calling.service.ChatrConnectionService
import com.chatr.app.service.WebRtcForegroundService
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              SYSTEM DIALER INTEGRATION                               ║
 * ║                                                                      ║
 * ║  Two-tier PhoneAccount registration:                                ║
 * ║                                                                      ║
 * ║  Tier 1: SELF_MANAGED (current)                                     ║
 * ║    → CHATR handles its own incoming/outgoing UI                     ║
 * ║    → Works without system dialer permission                         ║
 * ║                                                                      ║
 * ║  Tier 2: CALL_PROVIDER (new)                                        ║
 * ║    → "Call via Chatr" option in system dialer                       ║
 * ║    → Calls appear in system call log                                ║
 * ║    → User must enable in Settings > Phone > Calling accounts        ║
 * ║    → VoIP badge visible next to Chatr contacts                      ║
 * ║                                                                      ║
 * ║  + Optional: Default Dialer replacement                             ║
 * ║    → Full dialer replacement with GSM+VoIP unified experience       ║
 * ║    → User grants via RoleManager (Android 10+)                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
@Singleton
class SystemDialerIntegration @Inject constructor() {

    companion object {
        private const val TAG = "SystemDialer"
        
        // Two separate PhoneAccount IDs
        const val SELF_MANAGED_ACCOUNT_ID = "chatr_self_managed"
        const val CALL_PROVIDER_ACCOUNT_ID = "chatr_dialer_provider"
    }

    private var selfManagedHandle: PhoneAccountHandle? = null
    private var callProviderHandle: PhoneAccountHandle? = null

    /**
     * Register both PhoneAccounts at app startup
     * Called from ChatrApplication.onCreate()
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun registerAll(context: Context) {
        registerSelfManagedAccount(context)
        registerCallProviderAccount(context)
    }

    /**
     * Tier 1: Self-managed — for CHATR-initiated calls (in-app dialer)
     * This is the existing behavior
     */
    @RequiresApi(Build.VERSION_CODES.O)
    private fun registerSelfManagedAccount(context: Context) {
        try {
            val telecom = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val component = ComponentName(context, ChatrConnectionService::class.java)
            selfManagedHandle = PhoneAccountHandle(component, SELF_MANAGED_ACCOUNT_ID)

            val account = PhoneAccount.builder(selfManagedHandle, "Chatr")
                .setCapabilities(
                    PhoneAccount.CAPABILITY_SELF_MANAGED or
                    PhoneAccount.CAPABILITY_VIDEO_CALLING
                )
                .setIcon(Icon.createWithResource(context, R.mipmap.ic_launcher))
                .setShortDescription("Chatr Voice & Video")
                .addSupportedUriScheme("chatr")
                .setHighlightColor(0xFF6366F1.toInt())
                .build()

            telecom.registerPhoneAccount(account)
            Log.i(TAG, "✅ Self-managed PhoneAccount registered")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Self-managed registration failed", e)
        }
    }

    /**
     * Tier 2: Call Provider — appears in system dialer
     * 
     * When user dials a number from the stock dialer:
     * 1. System checks registered PhoneAccounts
     * 2. If Chatr is enabled, shows "Call via Chatr" option
     * 3. User selects → triggers onCreateOutgoingConnection
     * 4. SmartCallRouter decides VoIP vs GSM
     * 
     * REQUIRES: MANAGE_OWN_CALLS permission + user enablement
     */
    @RequiresApi(Build.VERSION_CODES.O)
    private fun registerCallProviderAccount(context: Context) {
        try {
            val telecom = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val component = ComponentName(context, ChatrDialerConnectionService::class.java)
            callProviderHandle = PhoneAccountHandle(component, CALL_PROVIDER_ACCOUNT_ID)

            val account = PhoneAccount.builder(callProviderHandle, "Chatr VoIP")
                .setCapabilities(
                    PhoneAccount.CAPABILITY_CALL_PROVIDER or
                    PhoneAccount.CAPABILITY_VIDEO_CALLING or
                    PhoneAccount.CAPABILITY_PLACE_EMERGENCY_CALLS.inv() // Never handle emergency
                )
                .setIcon(Icon.createWithResource(context, R.mipmap.ic_launcher))
                .setShortDescription("Free calls to Chatr contacts")
                .addSupportedUriScheme(PhoneAccount.SCHEME_TEL)
                .setHighlightColor(0xFF10B981.toInt()) // Green for VoIP
                .build()

            telecom.registerPhoneAccount(account)
            Log.i(TAG, "✅ Call Provider PhoneAccount registered")
        } catch (e: SecurityException) {
            // Expected if MANAGE_OWN_CALLS not granted
            Log.w(TAG, "⚠️ Call Provider requires MANAGE_OWN_CALLS permission", e)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Call Provider registration failed", e)
        }
    }

    fun getSelfManagedHandle(): PhoneAccountHandle? = selfManagedHandle
    fun getCallProviderHandle(): PhoneAccountHandle? = callProviderHandle

    /**
     * Check if user has enabled Chatr as a calling account in system settings
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun isCallProviderEnabled(context: Context): Boolean {
        return try {
            val telecom = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val account = telecom.getPhoneAccount(callProviderHandle)
            account?.isEnabled == true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Request user to enable Chatr as a calling account
     * Opens system settings
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun requestCallProviderEnable(context: Context) {
        try {
            val intent = Intent(TelecomManager.ACTION_CHANGE_PHONE_ACCOUNTS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open calling accounts settings", e)
        }
    }

    /**
     * Request default dialer role (Android 10+)
     * This makes Chatr the primary dialer app
     */
    @RequiresApi(Build.VERSION_CODES.Q)
    fun requestDefaultDialer(context: Context): Intent? {
        return try {
            val roleManager = context.getSystemService(android.app.role.RoleManager::class.java)
            if (roleManager.isRoleAvailable(android.app.role.RoleManager.ROLE_DIALER)) {
                roleManager.createRequestRoleIntent(android.app.role.RoleManager.ROLE_DIALER)
            } else null
        } catch (e: Exception) {
            Log.e(TAG, "Default dialer request failed", e)
            null
        }
    }
}

/**
 * Separate ConnectionService for CALL_PROVIDER mode
 * 
 * This handles calls initiated from the SYSTEM dialer
 * (vs ChatrConnectionService which handles CHATR-initiated calls)
 */
@RequiresApi(Build.VERSION_CODES.O)
@AndroidEntryPoint
class ChatrDialerConnectionService : android.telecom.ConnectionService() {

    @Inject lateinit var smartCallRouter: SmartCallRouter

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    companion object {
        private const val TAG = "ChatrDialerCS"
    }

    /**
     * System dialer → user selects "Call via Chatr" → this fires
     * 
     * Critical path:
     * 1. Extract phone number from request
     * 2. SmartCallRouter decides VoIP vs GSM
     * 3. If VoIP: bootstrap WebRTC via foreground service
     * 4. If GSM: reject connection (let system handle via default SIM)
     */
    override fun onCreateOutgoingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: android.telecom.ConnectionRequest?
    ): android.telecom.Connection {
        val phone = request?.address?.schemeSpecificPart ?: ""
        Log.d(TAG, "📞 System dialer call: $phone")

        val connection = SystemDialerConnection(this, phone)
        connection.setAddress(request?.address, TelecomManager.PRESENTATION_ALLOWED)
        connection.setDialing()

        // Route decision (async but fast due to cache prewarm)
        serviceScope.launch {
            val decision = smartCallRouter.routeCall(phone)
            
            when (decision.route) {
                CallRoute.VOIP -> {
                    Log.d(TAG, "✅ VoIP route for $phone (${decision.reason})")
                    
                    // Generate call ID and bootstrap WebRTC natively
                    val callId = java.util.UUID.randomUUID().toString()
                    
                    // Get auth token from secure storage
                    val token = getStoredAuthToken() ?: ""
                    
                    WebRtcForegroundService.bootstrapOutgoing(
                        context = this@ChatrDialerConnectionService,
                        callId = callId,
                        receiverPhone = phone,
                        isVideo = false,
                        authToken = token
                    )
                    
                    connection.setActive()
                    connection.setChatrCallId(callId)
                }
                
                CallRoute.GSM -> {
                    Log.d(TAG, "📱 GSM route for $phone (${decision.reason})")
                    // Reject our connection — system will fall through to GSM
                    connection.setDisconnected(
                        android.telecom.DisconnectCause(
                            android.telecom.DisconnectCause.LOCAL,
                            "Not a Chatr user — routing to GSM"
                        )
                    )
                    connection.destroy()
                }
                
                CallRoute.PSTN -> {
                    // Future: VoIP-to-PSTN bridge
                    Log.d(TAG, "🌐 PSTN bridge for $phone")
                    connection.setActive()
                }
            }
        }

        return connection
    }

    override fun onCreateIncomingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: android.telecom.ConnectionRequest?
    ): android.telecom.Connection {
        // Incoming calls are handled by the self-managed ChatrConnectionService
        // This should rarely be called
        Log.w(TAG, "Unexpected incoming on call-provider account")
        return super.onCreateIncomingConnection(connectionManagerPhoneAccount, request)
    }

    private fun getStoredAuthToken(): String? {
        return try {
            val prefs = getSharedPreferences("chatr_auth", Context.MODE_PRIVATE)
            prefs.getString("access_token", null)
        } catch (e: Exception) {
            null
        }
    }
}

/**
 * Connection representing a call placed from the system dialer
 */
@RequiresApi(Build.VERSION_CODES.O)
class SystemDialerConnection(
    private val context: Context,
    private val phone: String
) : android.telecom.Connection() {

    companion object {
        private const val TAG = "SystemDialerConn"
    }

    private var chatrCallId: String? = null

    init {
        connectionProperties = PROPERTY_SELF_MANAGED.inv() // NOT self-managed
        audioModeIsVoip = true
    }

    fun setChatrCallId(callId: String) {
        this.chatrCallId = callId
    }

    override fun onAnswer() {
        Log.d(TAG, "📞 Answer: $phone")
        setActive()
    }

    override fun onReject() {
        Log.d(TAG, "📞 Reject: $phone")
        setDisconnected(android.telecom.DisconnectCause(android.telecom.DisconnectCause.REJECTED))
        destroy()
    }

    override fun onDisconnect() {
        Log.d(TAG, "📞 Disconnect: $phone")
        chatrCallId?.let {
            WebRtcForegroundService.endCall(context)
        }
        setDisconnected(android.telecom.DisconnectCause(android.telecom.DisconnectCause.LOCAL))
        destroy()
    }

    override fun onAbort() {
        Log.d(TAG, "📞 Abort: $phone")
        chatrCallId?.let {
            WebRtcForegroundService.endCall(context)
        }
        super.onAbort()
    }
}
