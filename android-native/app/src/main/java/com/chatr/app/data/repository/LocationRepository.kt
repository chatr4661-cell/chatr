package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationRepository @Inject constructor(
    private val api: LocationApi
) {
    
    suspend fun updateLocation(lat: Double, lon: Double, accuracy: Float? = null): Result<Unit> {
        return safeApiCall {
            api.updateLocation(UpdateLocationRequest(lat, lon, accuracy))
        }
    }
    
    fun getGeofences(): Flow<Result<List<Geofence>>> = flow {
        emit(safeApiCall { api.getGeofences() })
    }
    
    suspend fun createGeofence(name: String, lat: Double, lon: Double, radius: Int): Result<Geofence> {
        return safeApiCall {
            api.createGeofence(CreateGeofenceRequest(name, lat, lon, radius))
        }
    }
    
    suspend fun updateGeofence(
        geofenceId: String,
        name: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        radius: Int? = null,
        isActive: Boolean? = null
    ): Result<Geofence> {
        return safeApiCall {
            api.updateGeofence(geofenceId, UpdateGeofenceRequest(name, lat, lon, radius, isActive))
        }
    }
    
    suspend fun deleteGeofence(geofenceId: String): Result<Unit> {
        return safeApiCall { api.deleteGeofence(geofenceId) }
    }
}
