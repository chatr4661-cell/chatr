package com.chatr.app.viewmodel

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.contacts.ContactDiscoveryService
import com.chatr.app.contacts.DiscoveryResult
import com.chatr.app.data.api.ContactInfo
import com.chatr.app.data.api.ContactResponse
import com.chatr.app.data.repository.ContactsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ContactsUiState(
    val isLoading: Boolean = false,
    val isSyncing: Boolean = false,
    val registeredContacts: List<ContactResponse> = emptyList(),
    val unregisteredContacts: List<ContactResponse> = emptyList(),
    val registeredCount: Int = 0,
    val totalCount: Int = 0,
    val error: String? = null
)

@HiltViewModel
class ContactsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val contactsRepository: ContactsRepository,
    private val contactDiscoveryService: ContactDiscoveryService
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(ContactsUiState())
    val uiState: StateFlow<ContactsUiState> = _uiState.asStateFlow()
    
    init {
        loadCachedContacts()
    }
    
    fun hasContactPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    private fun loadCachedContacts() {
        viewModelScope.launch {
            contactsRepository.getContacts().collect { result ->
                result.onSuccess { contacts ->
                    val registered = contacts.filter { it.isRegistered }
                    val unregistered = contacts.filter { !it.isRegistered }
                    
                    _uiState.update {
                        it.copy(
                            registeredContacts = registered.sortedBy { c -> c.contactName },
                            unregisteredContacts = unregistered.sortedBy { c -> c.contactName },
                            registeredCount = registered.size,
                            totalCount = contacts.size
                        )
                    }
                }
            }
        }
    }
    
    fun discoverContacts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            when (val result = contactDiscoveryService.discoverContacts()) {
                is DiscoveryResult.Success -> {
                    // Convert to ContactResponse for UI
                    val registered = result.registeredContacts.map { contact ->
                        ContactResponse(
                            id = contact.id,
                            userId = "",
                            contactUserId = contact.id,
                            contactName = contact.name,
                            contactPhone = contact.phoneNumber,
                            isRegistered = true,
                            avatarUrl = contact.avatarUrl,
                            isOnline = contact.isOnline
                        )
                    }
                    val invitable = result.invitableContacts.map { contact ->
                        ContactResponse(
                            id = contact.id,
                            userId = "",
                            contactUserId = null,
                            contactName = contact.name,
                            contactPhone = contact.phoneNumber,
                            isRegistered = false,
                            avatarUrl = contact.avatarUrl,
                            isOnline = false
                        )
                    }
                    
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            registeredContacts = registered,
                            unregisteredContacts = invitable,
                            registeredCount = result.registeredCount,
                            totalCount = result.totalContacts
                        )
                    }
                }
                is DiscoveryResult.NoPermission -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "Contact permission required"
                        )
                    }
                }
                is DiscoveryResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
            }
        }
    }
    
    fun searchContacts(query: String) {
        if (query.isBlank()) {
            loadCachedContacts()
            return
        }
        
        viewModelScope.launch {
            val results = contactDiscoveryService.searchContacts(query)
            
            val registered = results.onChatr.map { contact ->
                ContactResponse(
                    id = contact.id,
                    userId = "",
                    contactUserId = contact.id,
                    contactName = contact.name,
                    contactPhone = contact.phoneNumber,
                    isRegistered = true,
                    avatarUrl = contact.avatarUrl,
                    isOnline = contact.isOnline
                )
            }
            val invitable = results.invite.map { contact ->
                ContactResponse(
                    id = contact.id,
                    userId = "",
                    contactUserId = null,
                    contactName = contact.name,
                    contactPhone = contact.phoneNumber,
                    isRegistered = false,
                    avatarUrl = contact.avatarUrl,
                    isOnline = false
                )
            }
            
            _uiState.update {
                it.copy(
                    registeredContacts = registered,
                    unregisteredContacts = invitable
                )
            }
        }
    }
    
    fun clearSearch() {
        loadCachedContacts()
    }
    
    fun generateInviteMessage(contactName: String): String {
        return contactDiscoveryService.generateInviteMessage(contactName)
    }
    
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
