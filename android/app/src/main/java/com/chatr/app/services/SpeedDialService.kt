package com.chatr.app.services

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject

/**
 * CHATR+ Speed Dial Service
 * 
 * Manages speed dial entries (digits 2-9):
 * - Assign contacts to speed dial slots
 * - Long-press digit to call
 * - Sync with server
 */
class SpeedDialService(private val context: Context) {

    companion object {
        private const val TAG = "SpeedDialService"
        private const val PREFS_NAME = "chatr_speed_dial"
        private const val KEY_ENTRIES = "speed_dial_entries"
        
        // Available speed dial digits (1 is typically voicemail)
        val AVAILABLE_DIGITS = listOf(2, 3, 4, 5, 6, 7, 8, 9)
        
        @Volatile
        private var instance: SpeedDialService? = null
        
        fun getInstance(context: Context): SpeedDialService {
            return instance ?: synchronized(this) {
                instance ?: SpeedDialService(context.applicationContext).also { instance = it }
            }
        }
    }

    data class SpeedDialEntry(
        val digit: Int,
        val contactId: String?,
        val name: String,
        val number: String,
        val avatarUrl: String? = null
    )

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    private val _entries = MutableStateFlow<Map<Int, SpeedDialEntry>>(loadEntries())
    val entries: StateFlow<Map<Int, SpeedDialEntry>> = _entries.asStateFlow()

    init {
        Log.i(TAG, "📞 SpeedDialService initialized")
    }

    /**
     * Assign a contact to a speed dial digit
     */
    fun assignSpeedDial(
        digit: Int,
        contactId: String?,
        name: String,
        number: String,
        avatarUrl: String? = null
    ): Boolean {
        if (digit !in AVAILABLE_DIGITS) {
            Log.e(TAG, "❌ Invalid speed dial digit: $digit")
            return false
        }
        
        val entry = SpeedDialEntry(
            digit = digit,
            contactId = contactId,
            name = name,
            number = number,
            avatarUrl = avatarUrl
        )
        
        val current = _entries.value.toMutableMap()
        current[digit] = entry
        _entries.value = current
        
        saveEntries(current)
        
        Log.i(TAG, "📞 Speed dial $digit assigned to $name ($number)")
        
        return true
    }

    /**
     * Remove a speed dial assignment
     */
    fun removeSpeedDial(digit: Int): Boolean {
        if (digit !in AVAILABLE_DIGITS) {
            Log.e(TAG, "❌ Invalid speed dial digit: $digit")
            return false
        }
        
        val current = _entries.value.toMutableMap()
        current.remove(digit)
        _entries.value = current
        
        saveEntries(current)
        
        Log.i(TAG, "📞 Speed dial $digit removed")
        
        return true
    }

    /**
     * Get speed dial entry for a digit
     */
    fun getSpeedDial(digit: Int): SpeedDialEntry? {
        return _entries.value[digit]
    }

    /**
     * Get all assigned speed dials
     */
    fun getAllSpeedDials(): Map<Int, SpeedDialEntry> {
        return _entries.value
    }

    /**
     * Get available (unassigned) speed dial digits
     */
    fun getAvailableDigits(): List<Int> {
        return AVAILABLE_DIGITS.filter { !_entries.value.containsKey(it) }
    }

    /**
     * Dial a speed dial number
     */
    fun dialSpeedDial(digit: Int): String? {
        val entry = _entries.value[digit]
        
        if (entry == null) {
            Log.w(TAG, "⚠️ No speed dial assigned to digit $digit")
            return null
        }
        
        Log.i(TAG, "📞 Dialing speed dial $digit: ${entry.name} (${entry.number})")
        
        return entry.number
    }

    /**
     * Clear all speed dial entries
     */
    fun clearAll() {
        _entries.value = emptyMap()
        prefs.edit().remove(KEY_ENTRIES).apply()
        Log.i(TAG, "📞 All speed dials cleared")
    }

    private fun saveEntries(entries: Map<Int, SpeedDialEntry>) {
        try {
            val json = JSONObject()
            entries.forEach { (digit, entry) ->
                json.put(digit.toString(), JSONObject().apply {
                    put("digit", entry.digit)
                    put("contactId", entry.contactId)
                    put("name", entry.name)
                    put("number", entry.number)
                    put("avatarUrl", entry.avatarUrl)
                })
            }
            prefs.edit().putString(KEY_ENTRIES, json.toString()).apply()
            Log.d(TAG, "💾 Speed dial entries saved")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to save speed dial entries", e)
        }
    }

    private fun loadEntries(): Map<Int, SpeedDialEntry> {
        return try {
            val jsonString = prefs.getString(KEY_ENTRIES, null) ?: return emptyMap()
            val json = JSONObject(jsonString)
            
            val entries = mutableMapOf<Int, SpeedDialEntry>()
            json.keys().forEach { key ->
                val digit = key.toIntOrNull() ?: return@forEach
                val entryJson = json.getJSONObject(key)
                
                entries[digit] = SpeedDialEntry(
                    digit = entryJson.getInt("digit"),
                    contactId = entryJson.optString("contactId", null),
                    name = entryJson.getString("name"),
                    number = entryJson.getString("number"),
                    avatarUrl = entryJson.optString("avatarUrl", null)
                )
            }
            
            Log.d(TAG, "📥 Loaded ${entries.size} speed dial entries")
            entries
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to load speed dial entries", e)
            emptyMap()
        }
    }
}
