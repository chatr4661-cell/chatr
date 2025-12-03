package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.*
import com.chatr.app.data.repository.LocationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LocationState(
    val isLoading: Boolean = false,
    val currentLat: Double? = null,
    val currentLon: Double? = null,
    val accuracy: Double? = null,
    val geofences: List<Geofence> = emptyList(),
    val nearbyResults: List<SearchResult> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class LocationViewModel @Inject constructor(
    private val locationRepository: LocationRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(LocationState())
    val uiState: StateFlow<LocationState> = _uiState.asStateFlow()
    
    fun updateLocation(lat: Double, lon: Double, accuracy: Double? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                currentLat = lat,
                currentLon = lon,
                accuracy = accuracy
            )
            
            // Send location update to server
            locationRepository.updateLocation(lat, lon, accuracy)
        }
    }
    
    fun searchNearby(query: String, radius: Int = 5000, category: String? = null) {
        val lat = _uiState.value.currentLat ?: return
        val lon = _uiState.value.currentLon ?: return
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            locationRepository.geoSearch(query, lat, lon, radius, category)
                .onSuccess { response ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        nearbyResults = response.results
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun loadGeofences() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            locationRepository.getGeofences().collect { result ->
                result.onSuccess { geofences ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        geofences = geofences
                    )
                }.onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
            }
        }
    }
    
    fun createGeofence(name: String, lat: Double, lon: Double, radius: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            locationRepository.createGeofence(name, lat, lon, radius)
                .onSuccess {
                    loadGeofences()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun deleteGeofence(geofenceId: String) {
        viewModelScope.launch {
            locationRepository.deleteGeofence(geofenceId)
                .onSuccess {
                    val updated = _uiState.value.geofences.filter { it.id != geofenceId }
                    _uiState.value = _uiState.value.copy(geofences = updated)
                }
        }
    }
    
    fun getCurrentLocation(): Pair<Double, Double>? {
        val lat = _uiState.value.currentLat
        val lon = _uiState.value.currentLon
        return if (lat != null && lon != null) Pair(lat, lon) else null
    }
    
    fun clearNearbyResults() {
        _uiState.value = _uiState.value.copy(nearbyResults = emptyList())
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
