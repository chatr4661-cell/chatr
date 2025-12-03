package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StudioRepository @Inject constructor(
    private val api: StudioApi
) {
    
    // Templates
    suspend fun getTemplates(category: String? = null, isPremium: Boolean? = null): Result<List<StudioTemplateResponse>> {
        return safeApiCall {
            api.getTemplates(category, isPremium)
        }
    }
    
    suspend fun getTemplate(templateId: String): Result<StudioTemplateResponse> {
        return safeApiCall {
            api.getTemplate(templateId)
        }
    }
    
    suspend fun getTemplateCategories(): Result<List<TemplateCategoryResponse>> {
        return safeApiCall {
            api.getTemplateCategories()
        }
    }
    
    // User Designs
    suspend fun getUserDesigns(): Result<List<UserDesignResponse>> {
        return safeApiCall {
            api.getUserDesigns()
        }
    }
    
    suspend fun createDesign(
        name: String,
        templateId: String?,
        designData: Map<String, Any>,
        width: Int,
        height: Int
    ): Result<UserDesignResponse> {
        return safeApiCall {
            api.createDesign(CreateDesignRequest(name, templateId, designData, width, height))
        }
    }
    
    suspend fun updateDesign(
        designId: String,
        name: String? = null,
        designData: Map<String, Any>? = null,
        thumbnailUrl: String? = null
    ): Result<UserDesignResponse> {
        return safeApiCall {
            api.updateDesign(designId, UpdateDesignRequest(name, designData, thumbnailUrl))
        }
    }
    
    suspend fun deleteDesign(designId: String): Result<Unit> {
        return safeApiCall {
            api.deleteDesign(designId)
        }
    }
    
    suspend fun exportDesign(designId: String, format: String = "png", quality: Int = 100): Result<ExportDesignResponse> {
        return safeApiCall {
            api.exportDesign(designId, ExportDesignRequest(format, quality))
        }
    }
    
    suspend fun publishDesign(designId: String): Result<UserDesignResponse> {
        return safeApiCall {
            api.publishDesign(designId)
        }
    }
    
    // AI Features
    suspend fun generateAIBackground(prompt: String, width: Int, height: Int, style: String? = null): Result<AIBackgroundResponse> {
        return safeApiCall {
            api.generateAIBackground(AIBackgroundRequest(prompt, width, height, style))
        }
    }
    
    suspend fun removeBackground(imageUrl: String): Result<RemoveBackgroundResponse> {
        return safeApiCall {
            api.removeBackground(RemoveBackgroundRequest(imageUrl))
        }
    }
    
    suspend fun enhanceImage(imageUrl: String, enhancementType: String): Result<EnhanceImageResponse> {
        return safeApiCall {
            api.enhanceImage(EnhanceImageRequest(imageUrl, enhancementType))
        }
    }
}
