package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.api.*
import com.chatr.app.data.repository.PaymentsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PaymentsViewModel @Inject constructor(
    private val repository: PaymentsRepository
) : ViewModel() {
    
    private val _payments = MutableStateFlow<List<UPIPaymentResponse>>(emptyList())
    val payments: StateFlow<List<UPIPaymentResponse>> = _payments.asStateFlow()
    
    private val _currentPayment = MutableStateFlow<UPIPaymentResponse?>(null)
    val currentPayment: StateFlow<UPIPaymentResponse?> = _currentPayment.asStateFlow()
    
    private val _subscription = MutableStateFlow<SubscriptionResponse?>(null)
    val subscription: StateFlow<SubscriptionResponse?> = _subscription.asStateFlow()
    
    private val _walletBalance = MutableStateFlow(0)
    val walletBalance: StateFlow<Int> = _walletBalance.asStateFlow()
    
    private val _transactions = MutableStateFlow<List<WalletTransactionResponse>>(emptyList())
    val transactions: StateFlow<List<WalletTransactionResponse>> = _transactions.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    fun createPayment(
        amount: Double,
        orderType: String,
        orderId: String? = null,
        sellerId: String? = null,
        description: String? = null
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.createPayment(amount, orderType, orderId, sellerId, description)
                .onSuccess { _currentPayment.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun uploadScreenshot(paymentId: String, screenshotBase64: String, upiTransactionId: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.uploadScreenshot(paymentId, screenshotBase64, upiTransactionId)
                .onSuccess { _currentPayment.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun loadUserPayments(userId: String, status: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getUserPayments(userId, status)
                .onSuccess { _payments.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun loadSubscription() {
        viewModelScope.launch {
            repository.getUserSubscription()
                .onSuccess { _subscription.value = it }
        }
    }
    
    fun subscribe(planType: String, paymentId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.subscribe(planType, paymentId)
                .onSuccess { _subscription.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun loadWalletBalance() {
        viewModelScope.launch {
            repository.getWalletBalance()
                .onSuccess { _walletBalance.value = it.balance }
        }
    }
    
    fun loadTransactions(limit: Int = 20, offset: Int = 0) {
        viewModelScope.launch {
            repository.getWalletTransactions(limit, offset)
                .onSuccess { _transactions.value = it }
        }
    }
    
    fun clearError() {
        _error.value = null
    }
}
