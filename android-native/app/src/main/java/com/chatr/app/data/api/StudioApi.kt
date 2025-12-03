package com.chatr.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface StudioApi {
    
    // ==================== TEMPLATES ====================
    @GET("studio/templates")
    suspend fun getTemplates(
        @Query("category") category: String? = null,
        @Query("isPremium") isPremium: Boolean? = null
    ): Response<List<StudioTemplateResponse>>
    
    @GET("studio/templates/{templateId}")
    suspend fun getTemplate(@Path("templateId") templateId: String): Response<StudioTemplateResponse>
    
    @GET("studio/templates/categories")
    suspend fun getTemplateCategories(): Response<List<TemplateCategoryResponse>>
    
    // ==================== USER DESIGNS ====================
    @GET("studio/designs")
    suspend fun getUserDesigns(): Response<List<UserDesignResponse>>
    
    @POST("studio/designs")
    suspend fun createDesign(@Body request: CreateDesignRequest): Response<UserDesignResponse>
    
    @PUT("studio/designs/{designId}")
    suspend fun updateDesign(
        @Path("designId") designId: String,
        @Body request: UpdateDesignRequest
    ): Response<UserDesignResponse>
    
    @DELETE("studio/designs/{designId}")
    suspend fun deleteDesign(@Path("designId") designId: String): Response<Unit>
    
    @POST("studio/designs/{designId}/export")
    suspend fun exportDesign(
        @Path("designId") designId: String,
        @Body request: ExportDesignRequest
    ): Response<ExportDesignResponse>
    
    @POST("studio/designs/{designId}/publish")
    suspend fun publishDesign(@Path("designId") designId: String): Response<UserDesignResponse>
    
    // ==================== AI FEATURES ====================
    @POST("studio/ai/generate-background")
    suspend fun generateAIBackground(@Body request: AIBackgroundRequest): Response<AIBackgroundResponse>
    
    @POST("studio/ai/remove-background")
    suspend fun removeBackground(@Body request: RemoveBackgroundRequest): Response<RemoveBackgroundResponse>
    
    @POST("studio/ai/enhance-image")
    suspend fun enhanceImage(@Body request: EnhanceImageRequest): Response<EnhanceImageResponse>
}

// Request/Response models
data class StudioTemplateResponse(
    val id: String,
    val name: String,
    val category: String,
    val description: String?,
    val thumbnailUrl: String?,
    val templateData: Map<String, Any>,
    val width: Int,
    val height: Int,
    val isPremium: Boolean,
    val usageCount: Int,
    val createdAt: String
)

data class TemplateCategoryResponse(
    val id: String,
    val name: String,
    val icon: String?,
    val templateCount: Int
)

data class UserDesignResponse(
    val id: String,
    val userId: String,
    val name: String,
    val templateId: String?,
    val designData: Map<String, Any>,
    val thumbnailUrl: String?,
    val exportedUrl: String?,
    val isPublished: Boolean,
    val createdAt: String,
    val updatedAt: String
)

data class CreateDesignRequest(
    val name: String,
    val templateId: String?,
    val designData: Map<String, Any>,
    val width: Int,
    val height: Int
)

data class UpdateDesignRequest(
    val name: String?,
    val designData: Map<String, Any>?,
    val thumbnailUrl: String?
)

data class ExportDesignRequest(
    val format: String = "png", // png, jpg, pdf
    val quality: Int = 100
)

data class ExportDesignResponse(
    val downloadUrl: String,
    val format: String,
    val size: Long
)

data class AIBackgroundRequest(
    val prompt: String,
    val width: Int,
    val height: Int,
    val style: String? = null
)

data class AIBackgroundResponse(
    val imageUrl: String,
    val prompt: String
)

data class RemoveBackgroundRequest(
    val imageUrl: String
)

data class RemoveBackgroundResponse(
    val processedImageUrl: String
)

data class EnhanceImageRequest(
    val imageUrl: String,
    val enhancementType: String // upscale, denoise, sharpen, color_correct
)

data class EnhanceImageResponse(
    val enhancedImageUrl: String
)
