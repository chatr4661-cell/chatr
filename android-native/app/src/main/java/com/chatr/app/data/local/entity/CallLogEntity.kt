package com.chatr.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.chatr.app.data.api.CallData

@Entity(tableName = "call_logs")
data class CallLogEntity(
    @PrimaryKey val id: String,
    val callerId: String,
    val receiverId: String,
    val type: String,
    val status: String,
    val startTime: Long?,
    val endTime: Long?,
    val duration: Int?,
    val callerName: String?,
    val callerAvatar: String?,
    val receiverName: String?,
    val receiverAvatar: String?
) {
    fun toCallData(): CallData {
        return CallData(
            id = id,
            callerId = callerId,
            receiverId = receiverId,
            type = type,
            status = status,
            startTime = startTime,
            endTime = endTime,
            duration = duration,
            callerName = callerName,
            callerAvatar = callerAvatar,
            receiverName = receiverName,
            receiverAvatar = receiverAvatar
        )
    }
    
    companion object {
        fun fromCallData(call: CallData): CallLogEntity {
            return CallLogEntity(
                id = call.id,
                callerId = call.callerId,
                receiverId = call.receiverId,
                type = call.type,
                status = call.status,
                startTime = call.startTime,
                endTime = call.endTime,
                duration = call.duration,
                callerName = call.callerName,
                callerAvatar = call.callerAvatar,
                receiverName = call.receiverName,
                receiverAvatar = call.receiverAvatar
            )
        }
    }
}
