package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.*
import com.chatr.app.data.repository.NotificationsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationsState(
    val isLoading: Boolean = false,
    val notifications: List<Notification> = emptyList(),
    val unreadCount: Int = 0,
    val error: String? = null
)

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val notificationsRepository: NotificationsRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(NotificationsState())
    val uiState: StateFlow<NotificationsState> = _uiState.asStateFlow()
    
    fun loadNotifications(limit: Int = 50, unreadOnly: Boolean = false) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            notificationsRepository.getNotifications(limit, unreadOnly).collect { result ->
                result.onSuccess { notifications ->
                    val unreadCount = notifications.count { !it.read }
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        notifications = notifications.sortedByDescending { it.createdAt },
                        unreadCount = unreadCount
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
    
    fun markAsRead(notificationIds: List<String>) {
        viewModelScope.launch {
            notificationsRepository.markNotificationsRead(notificationIds)
                .onSuccess {
                    val updatedNotifications = _uiState.value.notifications.map { notification ->
                        if (notificationIds.contains(notification.id)) {
                            notification.copy(read = true)
                        } else {
                            notification
                        }
                    }
                    val unreadCount = updatedNotifications.count { !it.read }
                    _uiState.value = _uiState.value.copy(
                        notifications = updatedNotifications,
                        unreadCount = unreadCount
                    )
                }
        }
    }
    
    fun markAllAsRead() {
        val unreadIds = _uiState.value.notifications
            .filter { !it.read }
            .map { it.id }
        
        if (unreadIds.isNotEmpty()) {
            markAsRead(unreadIds)
        }
    }
    
    fun deleteNotification(notificationId: String) {
        viewModelScope.launch {
            notificationsRepository.deleteNotification(notificationId)
                .onSuccess {
                    val updatedNotifications = _uiState.value.notifications
                        .filter { it.id != notificationId }
                    val unreadCount = updatedNotifications.count { !it.read }
                    _uiState.value = _uiState.value.copy(
                        notifications = updatedNotifications,
                        unreadCount = unreadCount
                    )
                }
        }
    }
    
    fun registerDevice(fcmToken: String, platform: String = "android") {
        viewModelScope.launch {
            notificationsRepository.registerDevice(fcmToken, platform)
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
