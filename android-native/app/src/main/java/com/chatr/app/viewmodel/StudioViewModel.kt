package com.chatr.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatr.app.data.api.*
import com.chatr.app.data.repository.StudioRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StudioViewModel @Inject constructor(
    private val repository: StudioRepository
) : ViewModel() {
    
    private val _templates = MutableStateFlow<List<StudioTemplateResponse>>(emptyList())
    val templates: StateFlow<List<StudioTemplateResponse>> = _templates.asStateFlow()
    
    private val _categories = MutableStateFlow<List<TemplateCategoryResponse>>(emptyList())
    val categories: StateFlow<List<TemplateCategoryResponse>> = _categories.asStateFlow()
    
    private val _userDesigns = MutableStateFlow<List<UserDesignResponse>>(emptyList())
    val userDesigns: StateFlow<List<UserDesignResponse>> = _userDesigns.asStateFlow()
    
    private val _currentDesign = MutableStateFlow<UserDesignResponse?>(null)
    val currentDesign: StateFlow<UserDesignResponse?> = _currentDesign.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    init {
        loadTemplates()
        loadCategories()
        loadUserDesigns()
    }
    
    fun loadTemplates(category: String? = null, isPremium: Boolean? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getTemplates(category, isPremium)
                .onSuccess { _templates.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun loadCategories() {
        viewModelScope.launch {
            repository.getTemplateCategories()
                .onSuccess { _categories.value = it }
        }
    }
    
    fun loadUserDesigns() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getUserDesigns()
                .onSuccess { _userDesigns.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun createDesign(
        name: String,
        templateId: String?,
        designData: Map<String, Any>,
        width: Int,
        height: Int
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.createDesign(name, templateId, designData, width, height)
                .onSuccess { 
                    _currentDesign.value = it
                    loadUserDesigns()
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun updateDesign(
        designId: String,
        name: String? = null,
        designData: Map<String, Any>? = null
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.updateDesign(designId, name, designData)
                .onSuccess { _currentDesign.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun deleteDesign(designId: String) {
        viewModelScope.launch {
            repository.deleteDesign(designId)
                .onSuccess { loadUserDesigns() }
                .onFailure { _error.value = it.message }
        }
    }
    
    fun exportDesign(designId: String, format: String = "png", quality: Int = 100, onSuccess: (String) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.exportDesign(designId, format, quality)
                .onSuccess { onSuccess(it.downloadUrl) }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun generateAIBackground(prompt: String, width: Int, height: Int, onSuccess: (String) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.generateAIBackground(prompt, width, height)
                .onSuccess { onSuccess(it.imageUrl) }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
    
    fun clearError() {
        _error.value = null
    }
}
