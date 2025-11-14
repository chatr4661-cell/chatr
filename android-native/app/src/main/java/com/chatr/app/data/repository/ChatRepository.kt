package com.chatr.app.data.repository

import com.chatr.app.data.api.ChatrApi
import com.chatr.app.data.models.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepository @Inject constructor(
    private val api: ChatrApi
) {
    
    fun getChats(userId: String): Flow<Result<List<Chat>>> = flow {
        try {
            val response = api.getChats(userId)
            if (response.isSuccessful && response.body() != null) {
                emit(Result.success(response.body()!!))
            } else {
                emit(Result.failure(Exception("Failed to fetch chats")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    fun getMessages(chatId: String): Flow<Result<List<Message>>> = flow {
        try {
            val response = api.getMessages(chatId)
            if (response.isSuccessful && response.body() != null) {
                emit(Result.success(response.body()!!))
            } else {
                emit(Result.failure(Exception("Failed to fetch messages")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
    
    suspend fun sendMessage(message: Message): Result<Message> {
        return try {
            val response = api.sendMessage(message)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to send message"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
