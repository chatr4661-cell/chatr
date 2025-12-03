package com.chatr.app.data.repository

import retrofit2.Response

/**
 * Helper function for safe API calls with proper error handling
 */
suspend fun <T> safeApiCall(call: suspend () -> Response<T>): Result<T> {
    return try {
        val response = call()
        if (response.isSuccessful && response.body() != null) {
            Result.success(response.body()!!)
        } else {
            val errorBody = response.errorBody()?.string() ?: "Unknown error"
            Result.failure(ApiException(response.code(), errorBody))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}

/**
 * Custom API exception with HTTP status code
 */
class ApiException(
    val code: Int,
    override val message: String
) : Exception("API Error $code: $message")
