package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.api.*
import com.chatr.app.data.repository.ChatrWorldRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChatrWorldViewModel @Inject constructor(
    private val repository: ChatrWorldRepository
) : ViewModel() {
    
    // Jobs
    private val _jobs = MutableStateFlow<List<ChatrJobResponse>>(emptyList())
    val jobs: StateFlow<List<ChatrJobResponse>> = _jobs.asStateFlow()
    
    private val _jobApplications = MutableStateFlow<List<JobApplicationResponse>>(emptyList())
    val jobApplications: StateFlow<List<JobApplicationResponse>> = _jobApplications.asStateFlow()
    
    // Healthcare
    private val _healthcareProviders = MutableStateFlow<List<ChatrHealthcareResponse>>(emptyList())
    val healthcareProviders: StateFlow<List<ChatrHealthcareResponse>> = _healthcareProviders.asStateFlow()
    
    private val _appointments = MutableStateFlow<List<AppointmentResponse>>(emptyList())
    val appointments: StateFlow<List<AppointmentResponse>> = _appointments.asStateFlow()
    
    // Restaurants
    private val _restaurants = MutableStateFlow<List<ChatrRestaurantResponse>>(emptyList())
    val restaurants: StateFlow<List<ChatrRestaurantResponse>> = _restaurants.asStateFlow()
    
    private val _foodOrders = MutableStateFlow<List<FoodOrderResponse>>(emptyList())
    val foodOrders: StateFlow<List<FoodOrderResponse>> = _foodOrders.asStateFlow()
    
    private val _menu = MutableStateFlow<List<MenuItemResponse>>(emptyList())
    val menu: StateFlow<List<MenuItemResponse>> = _menu.asStateFlow()
    
    // Deals
    private val _deals = MutableStateFlow<List<ChatrDealResponse>>(emptyList())
    val deals: StateFlow<List<ChatrDealResponse>> = _deals.asStateFlow()
    
    private val _claimedDeals = MutableStateFlow<List<ClaimedDealResponse>>(emptyList())
    val claimedDeals: StateFlow<List<ClaimedDealResponse>> = _claimedDeals.asStateFlow()
    
    // Search
    private val _searchResults = MutableStateFlow<ChatrWorldSearchResponse?>(null)
    val searchResults: StateFlow<ChatrWorldSearchResponse?> = _searchResults.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    // Universal Search
    fun search(query: String, lat: Double? = null, lon: Double? = null, category: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.universalSearch(query, lat, lon, category)
                .onSuccess { _searchResults.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    // Jobs
    fun loadJobs(
        query: String? = null,
        location: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        category: String? = null
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getJobs(query, location, lat, lon, category)
                .onSuccess { _jobs.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun applyForJob(
        jobId: String,
        resumeUrl: String?,
        coverLetter: String?,
        phone: String?,
        email: String?,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.applyForJob(jobId, resumeUrl, coverLetter, phone, email)
                .onSuccess { 
                    onSuccess()
                    loadMyApplications()
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun loadMyApplications() {
        viewModelScope.launch {
            repository.getMyApplications()
                .onSuccess { _jobApplications.value = it }
        }
    }
    
    // Healthcare
    fun loadHealthcareProviders(
        query: String? = null,
        specialty: String? = null,
        lat: Double? = null,
        lon: Double? = null
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getHealthcareProviders(query, specialty, lat, lon)
                .onSuccess { _healthcareProviders.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun bookAppointment(
        providerId: String,
        date: String,
        time: String,
        reason: String?,
        paymentId: String?,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.bookAppointment(providerId, date, time, reason, paymentId)
                .onSuccess { 
                    onSuccess()
                    loadMyAppointments()
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun loadMyAppointments() {
        viewModelScope.launch {
            repository.getMyAppointments()
                .onSuccess { _appointments.value = it }
        }
    }
    
    // Restaurants
    fun loadRestaurants(
        query: String? = null,
        cuisine: String? = null,
        lat: Double? = null,
        lon: Double? = null
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getRestaurants(query, cuisine, lat, lon)
                .onSuccess { _restaurants.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun loadRestaurantMenu(restaurantId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getRestaurantMenu(restaurantId)
                .onSuccess { _menu.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun createFoodOrder(
        restaurantId: String,
        items: List<OrderItem>,
        deliveryAddress: String,
        deliveryInstructions: String?,
        paymentId: String,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.createFoodOrder(restaurantId, items, deliveryAddress, deliveryInstructions, paymentId)
                .onSuccess { 
                    onSuccess()
                    loadMyFoodOrders()
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun loadMyFoodOrders() {
        viewModelScope.launch {
            repository.getMyFoodOrders()
                .onSuccess { _foodOrders.value = it }
        }
    }
    
    // Deals
    fun loadDeals(
        query: String? = null,
        category: String? = null,
        lat: Double? = null,
        lon: Double? = null
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getDeals(query, category, lat, lon)
                .onSuccess { _deals.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun claimDeal(dealId: String, onSuccess: (String) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.claimDeal(dealId)
                .onSuccess { 
                    onSuccess(it.couponCode)
                    loadClaimedDeals()
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun loadClaimedDeals() {
        viewModelScope.launch {
            repository.getClaimedDeals()
                .onSuccess { _claimedDeals.value = it }
        }
    }
    
    fun clearError() {
        _error.value = null
    }
}
