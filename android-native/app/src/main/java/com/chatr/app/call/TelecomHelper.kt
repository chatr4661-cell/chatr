package com.chatr.app.call

import android.content.ComponentName
import android.content.Context
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

/**
 * Helper class for Telecom integration
 * Registers Chatr+ as a system-recognized calling app
 */
object TelecomHelper {
    
    private const val TAG = "TelecomHelper"
    private const val PHONE_ACCOUNT_ID = "chatr_plus_account"
    
    private var phoneAccountHandle: PhoneAccountHandle? = null
    
    /**
     * Registers Chatr+ PhoneAccount with the system TelecomManager
     * This makes calls appear as "ChatrPlus" in the system call log and Phone app
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun registerPhoneAccount(context: Context) {
        try {
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            
            val componentName = ComponentName(context, ChatrConnectionService::class.java)
            phoneAccountHandle = PhoneAccountHandle(componentName, PHONE_ACCOUNT_ID)
            
            val phoneAccount = PhoneAccount.builder(phoneAccountHandle, "ChatrPlus")
                .setCapabilities(
                    PhoneAccount.CAPABILITY_CALL_PROVIDER or
                    PhoneAccount.CAPABILITY_VIDEO_CALLING or
                    PhoneAccount.CAPABILITY_SELF_MANAGED
                )
                .setIcon(Icon.createWithResource(context, R.mipmap.ic_launcher))
                .setShortDescription("ChatrPlus Voice & Video")
                .addSupportedUriScheme(PhoneAccount.SCHEME_SIP)
                .addSupportedUriScheme(PhoneAccount.SCHEME_TEL)
                .setHighlightColor(0xFF6366F1.toInt()) // ChatrPrimary color
                .build()
            
            telecomManager.registerPhoneAccount(phoneAccount)
            Log.d(TAG, "✅ ChatrPlus PhoneAccount registered successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to register PhoneAccount: ${e.message}", e)
        }
    }
    
    /**
     * Gets the registered PhoneAccountHandle for placing/receiving calls
     */
    fun getPhoneAccountHandle(): PhoneAccountHandle? = phoneAccountHandle
    
    /**
     * Places an outgoing call through the Telecom system
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun placeCall(context: Context, callId: String, recipientNumber: String, callerName: String, isVideo: Boolean) {
        try {
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            
            val extras = Bundle().apply {
                putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, phoneAccountHandle)
                putString("CALL_ID", callId)
                putString("CALLER_NAME", callerName)
                putBoolean(TelecomManager.EXTRA_START_CALL_WITH_VIDEO_STATE, isVideo)
            }
            
            val uri = Uri.fromParts(PhoneAccount.SCHEME_TEL, recipientNumber, null)
            telecomManager.placeCall(uri, extras)
            
            Log.d(TAG, "✅ Outgoing call placed: $recipientNumber (video: $isVideo)")
            
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Permission denied for placing call: ${e.message}", e)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to place call: ${e.message}", e)
        }
    }
    
    /**
     * Reports an incoming call to the Telecom system
     * This triggers the native incoming call UI with "ChatrPlus" branding
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun reportIncomingCall(
        context: Context,
        callId: String,
        callerNumber: String,
        callerName: String,
        isVideo: Boolean
    ) {
        try {
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            
            val extras = Bundle().apply {
                putString("CALL_ID", callId)
                putString("CALLER_NAME", callerName)
                putParcelable(
                    TelecomManager.EXTRA_INCOMING_CALL_ADDRESS,
                    Uri.fromParts(PhoneAccount.SCHEME_TEL, callerNumber, null)
                )
                putInt(
                    TelecomManager.EXTRA_INCOMING_VIDEO_STATE,
                    if (isVideo) android.telecom.VideoProfile.STATE_BIDIRECTIONAL
                    else android.telecom.VideoProfile.STATE_AUDIO_ONLY
                )
            }
            
            telecomManager.addNewIncomingCall(phoneAccountHandle, extras)
            Log.d(TAG, "✅ Incoming call reported: $callerName ($callerNumber) - video: $isVideo")
            
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Permission denied for incoming call: ${e.message}", e)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to report incoming call: ${e.message}", e)
        }
    }
    
    /**
     * Checks if Chatr+ is enabled as a calling account
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun isPhoneAccountEnabled(context: Context): Boolean {
        return try {
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val account = telecomManager.getPhoneAccount(phoneAccountHandle)
            account?.isEnabled == true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check phone account status: ${e.message}")
            false
        }
    }
}
