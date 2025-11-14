package com.chatr.app.webrtc

import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import org.json.JSONObject
import org.webrtc.IceCandidate
import org.webrtc.SessionDescription

class CallSignaling(private val signalingUrl: String) {
    private var socket: Socket? = null
    
    private val _callOfferFlow = MutableSharedFlow<CallOffer>()
    val callOfferFlow: SharedFlow<CallOffer> = _callOfferFlow
    
    private val _callAnswerFlow = MutableSharedFlow<CallAnswer>()
    val callAnswerFlow: SharedFlow<CallAnswer> = _callAnswerFlow
    
    private val _iceCandidateFlow = MutableSharedFlow<IceCandidateEvent>()
    val iceCandidateFlow: SharedFlow<IceCandidateEvent> = _iceCandidateFlow
    
    private val _callEndFlow = MutableSharedFlow<String>()
    val callEndFlow: SharedFlow<String> = _callEndFlow
    
    fun connect(userId: String) {
        val options = IO.Options().apply {
            auth = mapOf("userId" to userId)
        }
        
        socket = IO.socket(signalingUrl, options)
        
        socket?.on("call-offer") { args ->
            val data = args[0] as JSONObject
            val offer = CallOffer(
                callId = data.getString("callId"),
                from = data.getString("from"),
                sdp = data.getString("sdp"),
                type = data.getString("type"),
                isVideo = data.getBoolean("isVideo")
            )
            _callOfferFlow.tryEmit(offer)
        }
        
        socket?.on("call-answer") { args ->
            val data = args[0] as JSONObject
            val answer = CallAnswer(
                callId = data.getString("callId"),
                from = data.getString("from"),
                sdp = data.getString("sdp"),
                type = data.getString("type")
            )
            _callAnswerFlow.tryEmit(answer)
        }
        
        socket?.on("call-candidate") { args ->
            val data = args[0] as JSONObject
            val candidate = IceCandidateEvent(
                callId = data.getString("callId"),
                from = data.getString("from"),
                candidate = data.getString("candidate"),
                sdpMid = data.getString("sdpMid"),
                sdpMLineIndex = data.getInt("sdpMLineIndex")
            )
            _iceCandidateFlow.tryEmit(candidate)
        }
        
        socket?.on("call-end") { args ->
            val data = args[0] as JSONObject
            val callId = data.getString("callId")
            _callEndFlow.tryEmit(callId)
        }
        
        socket?.connect()
    }
    
    fun sendCallOffer(
        callId: String,
        to: String,
        sdp: SessionDescription,
        isVideo: Boolean
    ) {
        val data = JSONObject().apply {
            put("callId", callId)
            put("to", to)
            put("sdp", sdp.description)
            put("type", sdp.type.canonicalForm())
            put("isVideo", isVideo)
        }
        socket?.emit("call-offer", data)
    }
    
    fun sendCallAnswer(
        callId: String,
        to: String,
        sdp: SessionDescription
    ) {
        val data = JSONObject().apply {
            put("callId", callId)
            put("to", to)
            put("sdp", sdp.description)
            put("type", sdp.type.canonicalForm())
        }
        socket?.emit("call-answer", data)
    }
    
    fun sendIceCandidate(
        callId: String,
        to: String,
        candidate: IceCandidate
    ) {
        val data = JSONObject().apply {
            put("callId", callId)
            put("to", to)
            put("candidate", candidate.sdp)
            put("sdpMid", candidate.sdpMid)
            put("sdpMLineIndex", candidate.sdpMLineIndex)
        }
        socket?.emit("call-candidate", data)
    }
    
    fun sendCallEnd(callId: String, to: String) {
        val data = JSONObject().apply {
            put("callId", callId)
            put("to", to)
        }
        socket?.emit("call-end", data)
    }
    
    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
    }
}

data class CallOffer(
    val callId: String,
    val from: String,
    val sdp: String,
    val type: String,
    val isVideo: Boolean
)

data class CallAnswer(
    val callId: String,
    val from: String,
    val sdp: String,
    val type: String
)

data class IceCandidateEvent(
    val callId: String,
    val from: String,
    val candidate: String,
    val sdpMid: String,
    val sdpMLineIndex: Int
)
