package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.api.*
import com.chatr.app.data.repository.StealthModeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StealthModeViewModel @Inject constructor(
    private val repository: StealthModeRepository
) : ViewModel() {
    
    private val _status = MutableStateFlow<StealthModeStatusResponse?>(null)
    val status: StateFlow<StealthModeStatusResponse?> = _status.asStateFlow()
    
    private val _sellerSettings = MutableStateFlow<SellerModeSettingsResponse?>(null)
    val sellerSettings: StateFlow<SellerModeSettingsResponse?> = _sellerSettings.asStateFlow()
    
    private val _sellerAnalytics = MutableStateFlow<SellerAnalyticsResponse?>(null)
    val sellerAnalytics: StateFlow<SellerAnalyticsResponse?> = _sellerAnalytics.asStateFlow()
    
    private val _sellerProducts = MutableStateFlow<List<SellerProductResponse>>(emptyList())
    val sellerProducts: StateFlow<List<SellerProductResponse>> = _sellerProducts.asStateFlow()
    
    private val _rewardsSettings = MutableStateFlow<RewardsModeSettingsResponse?>(null)
    val rewardsSettings: StateFlow<RewardsModeSettingsResponse?> = _rewardsSettings.asStateFlow()
    
    private val _dailyChallenges = MutableStateFlow<List<DailyChallengeResponse>>(emptyList())
    val dailyChallenges: StateFlow<List<DailyChallengeResponse>> = _dailyChallenges.asStateFlow()
    
    private val _referralStats = MutableStateFlow<ReferralStatsResponse?>(null)
    val referralStats: StateFlow<ReferralStatsResponse?> = _referralStats.asStateFlow()
    
    private val _availableSubscriptions = MutableStateFlow<List<StealthSubscriptionResponse>>(emptyList())
    val availableSubscriptions: StateFlow<List<StealthSubscriptionResponse>> = _availableSubscriptions.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    init {
        loadStatus()
        loadAvailableSubscriptions()
    }
    
    fun loadStatus() {
        viewModelScope.launch {
            repository.getStealthModeStatus()
                .onSuccess { 
                    _status.value = it
                    when (it.currentMode) {
                        "seller" -> loadSellerData()
                        "rewards" -> loadRewardsData()
                    }
                }
        }
    }
    
    fun switchMode(targetMode: String, subscriptionId: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.switchStealthMode(targetMode, subscriptionId)
                .onSuccess { 
                    _status.value = it
                    loadStatus()
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    // Seller Mode
    private fun loadSellerData() {
        viewModelScope.launch {
            repository.getSellerSettings().onSuccess { _sellerSettings.value = it }
            repository.getSellerAnalytics().onSuccess { _sellerAnalytics.value = it }
            repository.getSellerProducts().onSuccess { _sellerProducts.value = it }
        }
    }
    
    fun updateSellerSettings(
        businessName: String? = null,
        businessDescription: String? = null,
        businessCategory: String? = null,
        contactPhone: String? = null,
        contactEmail: String? = null
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.updateSellerSettings(
                businessName = businessName,
                businessDescription = businessDescription,
                businessCategory = businessCategory,
                contactPhone = contactPhone,
                contactEmail = contactEmail
            )
                .onSuccess { _sellerSettings.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun createProduct(
        name: String,
        description: String?,
        category: String,
        price: Double,
        imageUrls: List<String>,
        stock: Int?
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.createProduct(name, description, category, price, imageUrls, stock)
                .onSuccess { 
                    loadSellerData()
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun deleteProduct(productId: String) {
        viewModelScope.launch {
            repository.deleteProduct(productId)
                .onSuccess { loadSellerData() }
                .onFailure { _error.value = it.message }
        }
    }
    
    // Rewards Mode
    private fun loadRewardsData() {
        viewModelScope.launch {
            repository.getRewardsSettings().onSuccess { _rewardsSettings.value = it }
            repository.getDailyChallenges().onSuccess { _dailyChallenges.value = it }
            repository.getReferralStats().onSuccess { _referralStats.value = it }
        }
    }
    
    fun completeChallenge(challengeId: String, onResult: (ChallengeRewardResponse) -> Unit) {
        viewModelScope.launch {
            repository.completeChallenge(challengeId)
                .onSuccess { 
                    onResult(it)
                    loadRewardsData()
                }
                .onFailure { _error.value = it.message }
        }
    }
    
    fun generateReferralCode(onSuccess: (String) -> Unit) {
        viewModelScope.launch {
            repository.generateReferralCode()
                .onSuccess { 
                    onSuccess(it.shareUrl)
                    loadRewardsData()
                }
                .onFailure { _error.value = it.message }
        }
    }
    
    // Subscriptions
    fun loadAvailableSubscriptions() {
        viewModelScope.launch {
            repository.getAvailableSubscriptions()
                .onSuccess { _availableSubscriptions.value = it }
        }
    }
    
    fun purchaseSubscription(subscriptionId: String, paymentId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.purchaseSubscription(subscriptionId, paymentId)
                .onSuccess { 
                    onSuccess()
                    loadStatus()
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun clearError() {
        _error.value = null
    }
}
