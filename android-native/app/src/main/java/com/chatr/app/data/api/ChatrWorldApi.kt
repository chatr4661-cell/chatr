package com.chatr.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface ChatrWorldApi {
    
    // ==================== UNIVERSAL SEARCH ====================
    @POST("chatr-world-search")
    suspend fun universalSearch(@Body request: ChatrWorldSearchRequest): Response<ChatrWorldSearchResponse>
    
    // ==================== JOBS ====================
    @GET("chatr-world/jobs")
    suspend fun getJobs(
        @Query("query") query: String? = null,
        @Query("location") location: String? = null,
        @Query("lat") lat: Double? = null,
        @Query("lon") lon: Double? = null,
        @Query("category") category: String? = null,
        @Query("salaryMin") salaryMin: Int? = null,
        @Query("salaryMax") salaryMax: Int? = null,
        @Query("limit") limit: Int = 20
    ): Response<List<ChatrJobResponse>>
    
    @GET("chatr-world/jobs/{jobId}")
    suspend fun getJob(@Path("jobId") jobId: String): Response<ChatrJobResponse>
    
    @POST("chatr-world/jobs/{jobId}/apply")
    suspend fun applyForJob(
        @Path("jobId") jobId: String,
        @Body request: JobApplicationRequest
    ): Response<JobApplicationResponse>
    
    @GET("chatr-world/jobs/applications")
    suspend fun getMyApplications(): Response<List<JobApplicationResponse>>
    
    // ==================== HEALTHCARE ====================
    @GET("chatr-world/healthcare")
    suspend fun getHealthcareProviders(
        @Query("query") query: String? = null,
        @Query("specialty") specialty: String? = null,
        @Query("lat") lat: Double? = null,
        @Query("lon") lon: Double? = null,
        @Query("limit") limit: Int = 20
    ): Response<List<ChatrHealthcareResponse>>
    
    @GET("chatr-world/healthcare/{providerId}")
    suspend fun getHealthcareProvider(@Path("providerId") providerId: String): Response<ChatrHealthcareResponse>
    
    @POST("chatr-world/healthcare/{providerId}/book")
    suspend fun bookAppointment(
        @Path("providerId") providerId: String,
        @Body request: BookAppointmentRequest
    ): Response<AppointmentResponse>
    
    @GET("chatr-world/healthcare/appointments")
    suspend fun getMyAppointments(): Response<List<AppointmentResponse>>
    
    @PUT("chatr-world/healthcare/appointments/{appointmentId}")
    suspend fun updateAppointment(
        @Path("appointmentId") appointmentId: String,
        @Body request: UpdateAppointmentRequest
    ): Response<AppointmentResponse>
    
    // ==================== FOOD / RESTAURANTS ====================
    @GET("chatr-world/restaurants")
    suspend fun getRestaurants(
        @Query("query") query: String? = null,
        @Query("cuisine") cuisine: String? = null,
        @Query("lat") lat: Double? = null,
        @Query("lon") lon: Double? = null,
        @Query("limit") limit: Int = 20
    ): Response<List<ChatrRestaurantResponse>>
    
    @GET("chatr-world/restaurants/{restaurantId}")
    suspend fun getRestaurant(@Path("restaurantId") restaurantId: String): Response<ChatrRestaurantResponse>
    
    @GET("chatr-world/restaurants/{restaurantId}/menu")
    suspend fun getRestaurantMenu(@Path("restaurantId") restaurantId: String): Response<List<MenuItemResponse>>
    
    @POST("chatr-world/food/orders")
    suspend fun createFoodOrder(@Body request: CreateFoodOrderRequest): Response<FoodOrderResponse>
    
    @GET("chatr-world/food/orders")
    suspend fun getMyFoodOrders(): Response<List<FoodOrderResponse>>
    
    @GET("chatr-world/food/orders/{orderId}")
    suspend fun getFoodOrder(@Path("orderId") orderId: String): Response<FoodOrderResponse>
    
    // ==================== DEALS ====================
    @GET("chatr-world/deals")
    suspend fun getDeals(
        @Query("query") query: String? = null,
        @Query("category") category: String? = null,
        @Query("lat") lat: Double? = null,
        @Query("lon") lon: Double? = null,
        @Query("limit") limit: Int = 20
    ): Response<List<ChatrDealResponse>>
    
    @GET("chatr-world/deals/{dealId}")
    suspend fun getDeal(@Path("dealId") dealId: String): Response<ChatrDealResponse>
    
    @POST("chatr-world/deals/{dealId}/claim")
    suspend fun claimDeal(@Path("dealId") dealId: String): Response<ClaimDealResponse>
    
    @GET("chatr-world/deals/claimed")
    suspend fun getClaimedDeals(): Response<List<ClaimedDealResponse>>
}

// Request/Response models
data class ChatrWorldSearchRequest(
    val query: String,
    val lat: Double? = null,
    val lon: Double? = null,
    val category: String? = null, // jobs, healthcare, food, deals, all
    val limit: Int = 20
)

data class ChatrWorldSearchResponse(
    val query: String,
    val aiAnswer: String?,
    val jobs: List<ChatrJobResponse>,
    val healthcare: List<ChatrHealthcareResponse>,
    val restaurants: List<ChatrRestaurantResponse>,
    val deals: List<ChatrDealResponse>
)

data class ChatrJobResponse(
    val id: String,
    val title: String,
    val companyName: String,
    val description: String?,
    val location: String?,
    val salaryRange: String?,
    val salaryMin: Int?,
    val salaryMax: Int?,
    val jobType: String?, // full-time, part-time, contract, internship
    val experienceLevel: String?,
    val skills: List<String>?,
    val benefits: List<String>?,
    val isUrgent: Boolean,
    val postedAt: String,
    val expiresAt: String?,
    val applicationCount: Int
)

data class JobApplicationRequest(
    val resumeUrl: String?,
    val coverLetter: String?,
    val phone: String?,
    val email: String?
)

data class JobApplicationResponse(
    val id: String,
    val jobId: String,
    val job: ChatrJobResponse?,
    val status: String, // pending, reviewing, shortlisted, rejected, hired
    val appliedAt: String,
    val updatedAt: String
)

data class ChatrHealthcareResponse(
    val id: String,
    val providerName: String,
    val specialty: String?,
    val description: String?,
    val address: String?,
    val phone: String?,
    val email: String?,
    val imageUrl: String?,
    val rating: Float?,
    val reviewCount: Int,
    val consultationFee: Int?,
    val availableSlots: List<String>?,
    val isAvailableNow: Boolean,
    val distance: String?
)

data class BookAppointmentRequest(
    val date: String,
    val time: String,
    val reason: String?,
    val paymentId: String?
)

data class AppointmentResponse(
    val id: String,
    val providerId: String,
    val provider: ChatrHealthcareResponse?,
    val date: String,
    val time: String,
    val status: String, // pending, confirmed, completed, cancelled
    val reason: String?,
    val paymentStatus: String?,
    val createdAt: String
)

data class UpdateAppointmentRequest(
    val date: String?,
    val time: String?,
    val status: String?
)

data class ChatrRestaurantResponse(
    val id: String,
    val name: String,
    val description: String?,
    val cuisineTypes: List<String>,
    val address: String?,
    val phone: String?,
    val imageUrl: String?,
    val rating: Float?,
    val reviewCount: Int,
    val priceRange: String?, // $, $$, $$$
    val deliveryTime: String?,
    val deliveryFee: Int?,
    val isOpen: Boolean,
    val distance: String?
)

data class MenuItemResponse(
    val id: String,
    val restaurantId: String,
    val name: String,
    val description: String?,
    val category: String,
    val price: Int,
    val imageUrl: String?,
    val isVeg: Boolean,
    val isAvailable: Boolean,
    val customizations: List<MenuCustomization>?
)

data class MenuCustomization(
    val name: String,
    val options: List<CustomizationOption>
)

data class CustomizationOption(
    val name: String,
    val price: Int
)

data class CreateFoodOrderRequest(
    val restaurantId: String,
    val items: List<OrderItem>,
    val deliveryAddress: String,
    val deliveryInstructions: String?,
    val paymentId: String
)

data class OrderItem(
    val menuItemId: String,
    val quantity: Int,
    val customizations: Map<String, String>?,
    val specialInstructions: String?
)

data class FoodOrderResponse(
    val id: String,
    val restaurantId: String,
    val restaurant: ChatrRestaurantResponse?,
    val items: List<OrderItemResponse>,
    val subtotal: Int,
    val deliveryFee: Int,
    val taxes: Int,
    val total: Int,
    val status: String, // pending, confirmed, preparing, out_for_delivery, delivered, cancelled
    val deliveryAddress: String,
    val estimatedDeliveryTime: String?,
    val createdAt: String
)

data class OrderItemResponse(
    val menuItem: MenuItemResponse,
    val quantity: Int,
    val price: Int,
    val customizations: Map<String, String>?
)

data class ChatrDealResponse(
    val id: String,
    val title: String,
    val description: String?,
    val businessName: String?,
    val category: String?,
    val discountPercentage: Int?,
    val discountAmount: Int?,
    val originalPrice: Int?,
    val discountedPrice: Int?,
    val couponCode: String?,
    val imageUrl: String?,
    val termsAndConditions: String?,
    val validFrom: String?,
    val validUntil: String?,
    val isExpired: Boolean,
    val claimCount: Int,
    val maxClaims: Int?
)

data class ClaimDealResponse(
    val success: Boolean,
    val couponCode: String,
    val expiresAt: String
)

data class ClaimedDealResponse(
    val id: String,
    val deal: ChatrDealResponse,
    val couponCode: String,
    val claimedAt: String,
    val usedAt: String?,
    val status: String // claimed, used, expired
)
