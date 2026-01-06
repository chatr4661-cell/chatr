package com.chatr.app.calling

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.util.Log
import androidx.annotation.RequiresApi
import com.chatr.app.ChatrApplication
import com.chatr.app.R
import com.chatr.app.calling.service.ChatrConnectionService

/**
 * TelecomHelper - Manages PhoneAccount registration and call placement
 * 
 * This is what makes CHATR behave like a GSM provider:
 * - Registers ChatrPlus as a system call provider
 * - Places calls through TelecomManager
 * - Reports incoming calls to the system
 */
@RequiresApi(Build.VERSION_CODES.O)
object TelecomHelper {

    private const val TAG = "TelecomHelper"

    /**
     * Get PhoneAccountHandle for ChatrPlus
     */
    fun getPhoneAccountHandle(context: Context): PhoneAccountHandle {
        val componentName = ComponentName(context, ChatrConnectionService::class.java)
        return PhoneAccountHandle(componentName, ChatrApplication.PHONE_ACCOUNT_ID)
    }

    /**
     * Register ChatrPlus PhoneAccount with the system
     */
    /**
     * Register ChatrPlus PhoneAccount with the system
     * 
     * CRITICAL: Self-managed ConnectionServices CANNOT have:
     * - CAPABILITY_CALL_PROVIDER (conflicts with self-managed)
     * - CAPABILITY_CONNECTION_MANAGER
     * - CAPABILITY_SIM_SUBSCRIPTION
     * - tel: or sip: URI schemes (reserved for system telephony)
     * 
     * Must use custom URI scheme for self-managed apps.
     */
    fun registerPhoneAccount(context: Context) {
        try {
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val phoneAccountHandle = getPhoneAccountHandle(context)

            // Self-managed only - NO CAPABILITY_CALL_PROVIDER (causes SecurityException)
            val phoneAccount = PhoneAccount.builder(phoneAccountHandle, "ChatrPlus")
                .setCapabilities(
                    PhoneAccount.CAPABILITY_SELF_MANAGED or
                    PhoneAccount.CAPABILITY_VIDEO_CALLING
                )
                .setIcon(android.graphics.drawable.Icon.createWithResource(context, R.drawable.ic_notification))
                .setShortDescription("ChatrPlus Voice & Video Calling")
                .addSupportedUriScheme("chatr") // Custom scheme for self-managed
                .setHighlightColor(context.getColor(R.color.notification_accent))
                .build()

            telecomManager.registerPhoneAccount(phoneAccount)
            Log.i(TAG, "✅ PhoneAccount registered successfully (self-managed mode)")
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ SecurityException registering PhoneAccount - check capabilities", e)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to register PhoneAccount", e)
        }
    }

    /**
     * Check if PhoneAccount is enabled
     */
    fun isPhoneAccountEnabled(context: Context): Boolean {
        return try {
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val phoneAccountHandle = getPhoneAccountHandle(context)
            val phoneAccount = telecomManager.getPhoneAccount(phoneAccountHandle)
            phoneAccount?.isEnabled == true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check PhoneAccount status", e)
            false
        }
    }

    /**
     * Place an outgoing call through TelecomManager
     */
    fun placeCall(
        context: Context,
        callId: String,
        phoneNumber: String,
        displayName: String,
        isVideo: Boolean = false
    ) {
        try {
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val phoneAccountHandle = getPhoneAccountHandle(context)

            val extras = Bundle().apply {
                putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, phoneAccountHandle)
                putString(ChatrConnectionService.EXTRA_CALL_ID, callId)
                putString(ChatrConnectionService.EXTRA_CALLER_NAME, displayName)
                putString(ChatrConnectionService.EXTRA_CALLER_PHONE, phoneNumber)
                putBoolean(ChatrConnectionService.EXTRA_IS_VIDEO, isVideo)
            }

            // Use custom chatr: scheme for self-managed apps
            val uri = Uri.parse("chatr:$phoneNumber")
            telecomManager.placeCall(uri, extras)
            Log.i(TAG, "📞 Placing self-managed call to $phoneNumber")
            Log.d(TAG, "Placing call to $phoneNumber (video: $isVideo)")
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for placing call", e)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to place call", e)
        }
    }

    /**
     * Report an incoming call to TelecomManager
     * This triggers the native incoming call UI
     */
    fun reportIncomingCall(
        context: Context,
        callId: String,
        callerPhone: String,
        callerName: String,
        callerAvatar: String?,
        isVideo: Boolean = false
    ) {
        try {
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val phoneAccountHandle = getPhoneAccountHandle(context)

            val extras = Bundle().apply {
                putString(ChatrConnectionService.EXTRA_CALL_ID, callId)
                putString(ChatrConnectionService.EXTRA_CALLER_NAME, callerName)
                putString(ChatrConnectionService.EXTRA_CALLER_PHONE, callerPhone)
                putString(ChatrConnectionService.EXTRA_CALLER_AVATAR, callerAvatar)
                putBoolean(ChatrConnectionService.EXTRA_IS_VIDEO, isVideo)
                // Use custom chatr: scheme for self-managed apps
                putParcelable(TelecomManager.EXTRA_INCOMING_CALL_ADDRESS, Uri.parse("chatr:$callerPhone"))
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                telecomManager.addNewIncomingCall(phoneAccountHandle, extras)
                Log.d(TAG, "Reported incoming call from $callerName ($callerPhone)")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for reporting incoming call", e)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to report incoming call", e)
        }
    }
}
