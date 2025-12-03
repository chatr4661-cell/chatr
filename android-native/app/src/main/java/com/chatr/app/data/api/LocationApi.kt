package com.chatr.app.data.api

import com.chatr.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface LocationApi {
    
    @POST("update-location")
    suspend fun updateLocation(@Body request: UpdateLocationRequest): Response<Unit>
    
    @GET("geofences")
    suspend fun getGeofences(): Response<List<Geofence>>
    
    @POST("geofences")
    suspend fun createGeofence(@Body request: CreateGeofenceRequest): Response<Geofence>
    
    @DELETE("geofences/{id}")
    suspend fun deleteGeofence(@Path("id") geofenceId: String): Response<Unit>
    
    @PUT("geofences/{id}")
    suspend fun updateGeofence(
        @Path("id") geofenceId: String,
        @Body request: UpdateGeofenceRequest
    ): Response<Geofence>
}

// Request models
data class UpdateLocationRequest(
    val lat: Double,
    val lon: Double,
    val accuracy: Float? = null
)

data class CreateGeofenceRequest(
    val name: String,
    val lat: Double,
    val lon: Double,
    val radius: Int
)

data class UpdateGeofenceRequest(
    val name: String?,
    val lat: Double?,
    val lon: Double?,
    val radius: Int?,
    val isActive: Boolean?
)

// Response models
data class Geofence(
    val id: String,
    val userId: String,
    val name: String,
    val lat: Double,
    val lon: Double,
    val radius: Int,
    val isActive: Boolean,
    val createdAt: Long
)
