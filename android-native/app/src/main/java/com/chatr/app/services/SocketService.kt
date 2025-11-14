package com.chatr.app.services

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONObject
import java.net.URI

sealed class SocketEvent {
    data class MessageReceived(val message: JSONObject) : SocketEvent()
    data class MessageDelivered(val messageId: String, val timestamp: Long) : SocketEvent()
    data class MessageRead(val messageId: String, val timestamp: Long) : SocketEvent()
    data class TypingStarted(val userId: String, val conversationId: String) : SocketEvent()
    data class TypingStopped(val userId: String, val conversationId: String) : SocketEvent()
    data class UserPresence(val userId: String, val isOnline: Boolean) : SocketEvent()
    data class Error(val message: String) : SocketEvent()
}

class SocketService {
    private var socket: Socket? = null
    private val _connectionState = MutableStateFlow(false)
    val connectionState: StateFlow<Boolean> = _connectionState
    
    private val _events = MutableSharedFlow<SocketEvent>()
    val events: SharedFlow<SocketEvent> = _events
    
    companion object {
        private const val TAG = "SocketService"
        private const val SOCKET_URL = "ws://localhost:3000" // Replace with actual URL
        
        @Volatile
        private var instance: SocketService? = null
        
        fun getInstance(): SocketService {
            return instance ?: synchronized(this) {
                instance ?: SocketService().also { instance = it }
            }
        }
    }
    
    fun connect(userId: String, token: String) {
        try {
            val options = IO.Options().apply {
                auth = mapOf(
                    "userId" to userId,
                    "token" to token
                )
                reconnection = true
                reconnectionAttempts = 5
                reconnectionDelay = 1000
                timeout = 10000
            }
            
            socket = IO.socket(URI.create(SOCKET_URL), options)
            
            socket?.apply {
                on(Socket.EVENT_CONNECT) {
                    Log.d(TAG, "Socket connected")
                    _connectionState.value = true
                }
                
                on(Socket.EVENT_DISCONNECT) {
                    Log.d(TAG, "Socket disconnected")
                    _connectionState.value = false
                }
                
                on(Socket.EVENT_CONNECT_ERROR) { args ->
                    Log.e(TAG, "Connection error: ${args.firstOrNull()}")
                    _events.tryEmit(SocketEvent.Error("Connection failed"))
                }
                
                on("message") { args ->
                    val data = args.firstOrNull() as? JSONObject
                    data?.let {
                        Log.d(TAG, "Message received: $it")
                        _events.tryEmit(SocketEvent.MessageReceived(it))
                    }
                }
                
                on("message_delivered") { args ->
                    val data = args.firstOrNull() as? JSONObject
                    data?.let {
                        val messageId = it.getString("messageId")
                        val timestamp = it.getLong("timestamp")
                        _events.tryEmit(SocketEvent.MessageDelivered(messageId, timestamp))
                    }
                }
                
                on("message_read") { args ->
                    val data = args.firstOrNull() as? JSONObject
                    data?.let {
                        val messageId = it.getString("messageId")
                        val timestamp = it.getLong("timestamp")
                        _events.tryEmit(SocketEvent.MessageRead(messageId, timestamp))
                    }
                }
                
                on("typing_start") { args ->
                    val data = args.firstOrNull() as? JSONObject
                    data?.let {
                        val userId = it.getString("userId")
                        val conversationId = it.getString("conversationId")
                        _events.tryEmit(SocketEvent.TypingStarted(userId, conversationId))
                    }
                }
                
                on("typing_stop") { args ->
                    val data = args.firstOrNull() as? JSONObject
                    data?.let {
                        val userId = it.getString("userId")
                        val conversationId = it.getString("conversationId")
                        _events.tryEmit(SocketEvent.TypingStopped(userId, conversationId))
                    }
                }
                
                on("user_presence") { args ->
                    val data = args.firstOrNull() as? JSONObject
                    data?.let {
                        val userId = it.getString("userId")
                        val isOnline = it.getBoolean("isOnline")
                        _events.tryEmit(SocketEvent.UserPresence(userId, isOnline))
                    }
                }
                
                connect()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect socket", e)
            _events.tryEmit(SocketEvent.Error(e.message ?: "Unknown error"))
        }
    }
    
    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        _connectionState.value = false
    }
    
    fun sendMessage(message: JSONObject) {
        socket?.emit("send_message", message)
    }
    
    fun sendTyping(conversationId: String, isTyping: Boolean) {
        val event = if (isTyping) "typing_start" else "typing_stop"
        socket?.emit(event, JSONObject().apply {
            put("conversationId", conversationId)
        })
    }
    
    fun markAsDelivered(messageId: String) {
        socket?.emit("mark_delivered", JSONObject().apply {
            put("messageId", messageId)
        })
    }
    
    fun markAsRead(messageIds: List<String>) {
        socket?.emit("mark_read", JSONObject().apply {
            put("messageIds", messageIds)
        })
    }
    
    fun sendReaction(messageId: String, emoji: String) {
        socket?.emit("add_reaction", JSONObject().apply {
            put("messageId", messageId)
            put("emoji", emoji)
        })
    }
    
    fun isConnected(): Boolean = socket?.connected() == true
}
