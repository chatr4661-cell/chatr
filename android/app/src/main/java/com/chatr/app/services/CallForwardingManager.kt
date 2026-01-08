package com.chatr.app.services

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject

/**
 * CHATR+ Call Forwarding Manager
 * 
 * Manages call forwarding rules:
 * - Always forward
 * - Forward when busy
 * - Forward when no answer
 * - Forward when unreachable
 */
class CallForwardingManager(private val context: Context) {

    companion object {
        private const val TAG = "CallForwardingManager"
        private const val PREFS_NAME = "chatr_call_forwarding"
        private const val KEY_FORWARDING_SETTINGS = "forwarding_settings"
        
        @Volatile
        private var instance: CallForwardingManager? = null
        
        fun getInstance(context: Context): CallForwardingManager {
            return instance ?: synchronized(this) {
                instance ?: CallForwardingManager(context.applicationContext).also { instance = it }
            }
        }
    }

    data class ForwardingSettings(
        val alwaysEnabled: Boolean = false,
        val alwaysNumber: String = "",
        val busyEnabled: Boolean = false,
        val busyNumber: String = "",
        val noAnswerEnabled: Boolean = false,
        val noAnswerNumber: String = "",
        val noAnswerRings: Int = 5,
        val unreachableEnabled: Boolean = false,
        val unreachableNumber: String = ""
    )

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    private val _settings = MutableStateFlow(loadSettings())
    val settings: StateFlow<ForwardingSettings> = _settings.asStateFlow()

    init {
        Log.i(TAG, "📞 CallForwardingManager initialized")
    }

    /**
     * Check if a call should be forwarded
     */
    fun shouldForwardCall(reason: ForwardReason): String? {
        val currentSettings = _settings.value
        
        return when (reason) {
            ForwardReason.ALWAYS -> {
                if (currentSettings.alwaysEnabled && currentSettings.alwaysNumber.isNotBlank()) {
                    Log.i(TAG, "📞 Forwarding (always) to: ${currentSettings.alwaysNumber}")
                    currentSettings.alwaysNumber
                } else null
            }
            ForwardReason.BUSY -> {
                if (currentSettings.busyEnabled && currentSettings.busyNumber.isNotBlank()) {
                    Log.i(TAG, "📞 Forwarding (busy) to: ${currentSettings.busyNumber}")
                    currentSettings.busyNumber
                } else null
            }
            ForwardReason.NO_ANSWER -> {
                if (currentSettings.noAnswerEnabled && currentSettings.noAnswerNumber.isNotBlank()) {
                    Log.i(TAG, "📞 Forwarding (no answer) to: ${currentSettings.noAnswerNumber}")
                    currentSettings.noAnswerNumber
                } else null
            }
            ForwardReason.UNREACHABLE -> {
                if (currentSettings.unreachableEnabled && currentSettings.unreachableNumber.isNotBlank()) {
                    Log.i(TAG, "📞 Forwarding (unreachable) to: ${currentSettings.unreachableNumber}")
                    currentSettings.unreachableNumber
                } else null
            }
        }
    }

    /**
     * Enable/disable always forward
     */
    fun setAlwaysForward(enabled: Boolean, number: String = "") {
        Log.i(TAG, "📞 Set always forward: $enabled -> $number")
        updateSettings { it.copy(alwaysEnabled = enabled, alwaysNumber = number) }
    }

    /**
     * Enable/disable forward when busy
     */
    fun setBusyForward(enabled: Boolean, number: String = "") {
        Log.i(TAG, "📞 Set busy forward: $enabled -> $number")
        updateSettings { it.copy(busyEnabled = enabled, busyNumber = number) }
    }

    /**
     * Enable/disable forward when no answer
     */
    fun setNoAnswerForward(enabled: Boolean, number: String = "", rings: Int = 5) {
        Log.i(TAG, "📞 Set no answer forward: $enabled -> $number (after $rings rings)")
        updateSettings { it.copy(noAnswerEnabled = enabled, noAnswerNumber = number, noAnswerRings = rings) }
    }

    /**
     * Enable/disable forward when unreachable
     */
    fun setUnreachableForward(enabled: Boolean, number: String = "") {
        Log.i(TAG, "📞 Set unreachable forward: $enabled -> $number")
        updateSettings { it.copy(unreachableEnabled = enabled, unreachableNumber = number) }
    }

    /**
     * Get number of rings before no-answer forward
     */
    fun getNoAnswerRings(): Int = _settings.value.noAnswerRings

    /**
     * Disable all forwarding
     */
    fun disableAllForwarding() {
        Log.i(TAG, "📞 Disabling all forwarding")
        updateSettings { 
            ForwardingSettings()
        }
    }

    /**
     * Update settings and persist
     */
    private fun updateSettings(update: (ForwardingSettings) -> ForwardingSettings) {
        val newSettings = update(_settings.value)
        _settings.value = newSettings
        saveSettings(newSettings)
    }

    private fun saveSettings(settings: ForwardingSettings) {
        try {
            val json = JSONObject().apply {
                put("alwaysEnabled", settings.alwaysEnabled)
                put("alwaysNumber", settings.alwaysNumber)
                put("busyEnabled", settings.busyEnabled)
                put("busyNumber", settings.busyNumber)
                put("noAnswerEnabled", settings.noAnswerEnabled)
                put("noAnswerNumber", settings.noAnswerNumber)
                put("noAnswerRings", settings.noAnswerRings)
                put("unreachableEnabled", settings.unreachableEnabled)
                put("unreachableNumber", settings.unreachableNumber)
            }
            prefs.edit().putString(KEY_FORWARDING_SETTINGS, json.toString()).apply()
            Log.d(TAG, "💾 Forwarding settings saved")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to save settings", e)
        }
    }

    private fun loadSettings(): ForwardingSettings {
        return try {
            val jsonString = prefs.getString(KEY_FORWARDING_SETTINGS, null) ?: return ForwardingSettings()
            val json = JSONObject(jsonString)
            ForwardingSettings(
                alwaysEnabled = json.optBoolean("alwaysEnabled", false),
                alwaysNumber = json.optString("alwaysNumber", ""),
                busyEnabled = json.optBoolean("busyEnabled", false),
                busyNumber = json.optString("busyNumber", ""),
                noAnswerEnabled = json.optBoolean("noAnswerEnabled", false),
                noAnswerNumber = json.optString("noAnswerNumber", ""),
                noAnswerRings = json.optInt("noAnswerRings", 5),
                unreachableEnabled = json.optBoolean("unreachableEnabled", false),
                unreachableNumber = json.optString("unreachableNumber", "")
            )
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to load settings", e)
            ForwardingSettings()
        }
    }

    enum class ForwardReason {
        ALWAYS, BUSY, NO_ANSWER, UNREACHABLE
    }
}
