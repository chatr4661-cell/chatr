package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.models.*
import com.chatr.app.data.repository.ContactsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ContactsUiState(
    val isLoading: Boolean = false,
    val contacts: List<Contact> = emptyList(),
    val registeredContacts: List<Contact> = emptyList(),
    val unregisteredContacts: List<Contact> = emptyList(),
    val blockedContacts: List<Contact> = emptyList(),
    val searchResults: List<User> = emptyList(),
    val isSyncing: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ContactsViewModel @Inject constructor(
    private val contactsRepository: ContactsRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(ContactsUiState())
    val uiState: StateFlow<ContactsUiState> = _uiState.asStateFlow()
    
    fun loadContacts() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            contactsRepository.getContacts().collect { result ->
                result.onSuccess { contacts ->
                    val registered = contacts.filter { it.isRegistered }
                    val unregistered = contacts.filter { !it.isRegistered }
                    
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        contacts = contacts,
                        registeredContacts = registered.sortedBy { it.contactName },
                        unregisteredContacts = unregistered.sortedBy { it.contactName }
                    )
                }.onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "Failed to load contacts"
                    )
                }
            }
        }
    }
    
    fun syncContacts(deviceContacts: List<ContactInfo>) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSyncing = true, error = null)
            
            contactsRepository.syncContacts(deviceContacts)
                .onSuccess { matchedUsers ->
                    _uiState.value = _uiState.value.copy(isSyncing = false)
                    // Reload contacts to get updated list
                    loadContacts()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isSyncing = false,
                        error = exception.message ?: "Failed to sync contacts"
                    )
                }
        }
    }
    
    fun searchUsers(query: String) {
        if (query.isBlank()) {
            _uiState.value = _uiState.value.copy(searchResults = emptyList())
            return
        }
        
        viewModelScope.launch {
            contactsRepository.searchUsers(query)
                .onSuccess { users ->
                    _uiState.value = _uiState.value.copy(searchResults = users)
                }
                .onFailure {
                    _uiState.value = _uiState.value.copy(searchResults = emptyList())
                }
        }
    }
    
    fun blockContact(userId: String) {
        viewModelScope.launch {
            contactsRepository.blockContact(userId)
                .onSuccess {
                    loadContacts()
                    loadBlockedContacts()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        error = exception.message
                    )
                }
        }
    }
    
    fun unblockContact(userId: String) {
        viewModelScope.launch {
            contactsRepository.unblockContact(userId)
                .onSuccess {
                    loadContacts()
                    loadBlockedContacts()
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        error = exception.message
                    )
                }
        }
    }
    
    fun loadBlockedContacts() {
        viewModelScope.launch {
            contactsRepository.getBlockedContacts()
                .onSuccess { blocked ->
                    _uiState.value = _uiState.value.copy(blockedContacts = blocked)
                }
        }
    }
    
    fun clearSearch() {
        _uiState.value = _uiState.value.copy(searchResults = emptyList())
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
