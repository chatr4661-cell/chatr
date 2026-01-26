package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.repository.AuthRepository
import com.chatr.app.data.repository.SupabaseRpcRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import javax.inject.Inject

/**
 * Call log item from backend
 */
data class CallLogItem(
    val id: String,
    val contactName: String,
    val otherUserId: String,
    val avatarUrl: String?,
    val isVideo: Boolean,
    val isMissed: Boolean,
    val isOutgoing: Boolean,
    val timestamp: String,
    val durationSeconds: Int
)

/**
 * State for call history screen
 */
data class CallHistoryState(
    val isLoading: Boolean = false,
    val calls: List<CallLogItem> = emptyList(),
    val error: String? = null
)

/**
 * ViewModel for call history - fetches REAL data from Supabase calls table
 */
@HiltViewModel
class CallHistoryViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val okHttpClient: OkHttpClient
) : ViewModel() {
    
    private val _state = MutableStateFlow(CallHistoryState())
    val state: StateFlow<CallHistoryState> = _state.asStateFlow()
    
    private val json = Json { 
        ignoreUnknownKeys = true 
        coerceInputValues = true
    }
    
    companion object {
        private const val SUPABASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co"
        private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw"
    }
    
    init {
        loadCallHistory()
    }
    
    /**
     * Load call history from backend
     * Fetches from calls table with joined profile data
     */
    fun loadCallHistory() {
        val accessToken = authRepository.getAccessToken()
        val currentUserId = authRepository.getCurrentUserId()
        
        if (accessToken.isNullOrEmpty() || currentUserId.isNullOrEmpty()) {
            _state.value = _state.value.copy(
                isLoading = false,
                error = "Not authenticated. Please log in again."
            )
            return
        }
        
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            
            try {
                val calls = fetchCallHistory(accessToken, currentUserId)
                _state.value = _state.value.copy(
                    isLoading = false,
                    calls = calls
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load call history"
                )
            }
        }
    }
    
    private suspend fun fetchCallHistory(
        accessToken: String,
        currentUserId: String
    ): List<CallLogItem> = withContext(Dispatchers.IO) {
        // Fetch calls where user is caller or receiver
        val request = Request.Builder()
            .url("$SUPABASE_URL/rest/v1/calls?or=(caller_id.eq.$currentUserId,receiver_id.eq.$currentUserId)&order=created_at.desc&limit=100&select=id,caller_id,receiver_id,call_type,status,created_at,started_at,ended_at,duration,missed,caller_name,caller_avatar,receiver_name,receiver_avatar")
            .addHeader("Authorization", "Bearer $accessToken")
            .addHeader("apikey", SUPABASE_ANON_KEY)
            .get()
            .build()
        
        val response = okHttpClient.newCall(request).execute()
        
        if (!response.isSuccessful) {
            throw Exception("Failed to fetch calls: ${response.code}")
        }
        
        val body = response.body?.string() ?: "[]"
        val rawCalls = json.decodeFromString<List<CallApiResponse>>(body)
        
        // Transform to CallLogItem
        rawCalls.map { call ->
            val isOutgoing = call.caller_id == currentUserId
            val otherUserId = if (isOutgoing) call.receiver_id ?: "" else call.caller_id
            val contactName = if (isOutgoing) {
                call.receiver_name ?: "Unknown"
            } else {
                call.caller_name ?: "Unknown"
            }
            val avatarUrl = if (isOutgoing) {
                call.receiver_avatar
            } else {
                call.caller_avatar
            }
            
            CallLogItem(
                id = call.id,
                contactName = contactName,
                otherUserId = otherUserId,
                avatarUrl = avatarUrl,
                isVideo = call.call_type == "video",
                isMissed = call.missed == true || call.status == "missed",
                isOutgoing = isOutgoing,
                timestamp = call.created_at,
                durationSeconds = call.duration ?: 0
            )
        }
    }
    
    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
}

/**
 * API response model for calls table
 */
@Serializable
private data class CallApiResponse(
    val id: String,
    val caller_id: String,
    val receiver_id: String? = null,
    val call_type: String,
    val status: String? = null,
    val created_at: String,
    val started_at: String? = null,
    val ended_at: String? = null,
    val duration: Int? = null,
    val missed: Boolean? = null,
    val caller_name: String? = null,
    val caller_avatar: String? = null,
    val receiver_name: String? = null,
    val receiver_avatar: String? = null
)
