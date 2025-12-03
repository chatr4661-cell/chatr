package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatrWorldRepository @Inject constructor(
    private val api: ChatrWorldApi
) {
    
    // Universal Search
    suspend fun universalSearch(
        query: String,
        lat: Double? = null,
        lon: Double? = null,
        category: String? = null,
        limit: Int = 20
    ): Result<ChatrWorldSearchResponse> {
        return safeApiCall {
            api.universalSearch(ChatrWorldSearchRequest(query, lat, lon, category, limit))
        }
    }
    
    // Jobs
    suspend fun getJobs(
        query: String? = null,
        location: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        category: String? = null,
        salaryMin: Int? = null,
        salaryMax: Int? = null,
        limit: Int = 20
    ): Result<List<ChatrJobResponse>> {
        return safeApiCall {
            api.getJobs(query, location, lat, lon, category, salaryMin, salaryMax, limit)
        }
    }
    
    suspend fun getJob(jobId: String): Result<ChatrJobResponse> {
        return safeApiCall {
            api.getJob(jobId)
        }
    }
    
    suspend fun applyForJob(
        jobId: String,
        resumeUrl: String?,
        coverLetter: String?,
        phone: String?,
        email: String?
    ): Result<JobApplicationResponse> {
        return safeApiCall {
            api.applyForJob(jobId, JobApplicationRequest(resumeUrl, coverLetter, phone, email))
        }
    }
    
    suspend fun getMyApplications(): Result<List<JobApplicationResponse>> {
        return safeApiCall {
            api.getMyApplications()
        }
    }
    
    // Healthcare
    suspend fun getHealthcareProviders(
        query: String? = null,
        specialty: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        limit: Int = 20
    ): Result<List<ChatrHealthcareResponse>> {
        return safeApiCall {
            api.getHealthcareProviders(query, specialty, lat, lon, limit)
        }
    }
    
    suspend fun getHealthcareProvider(providerId: String): Result<ChatrHealthcareResponse> {
        return safeApiCall {
            api.getHealthcareProvider(providerId)
        }
    }
    
    suspend fun bookAppointment(
        providerId: String,
        date: String,
        time: String,
        reason: String?,
        paymentId: String?
    ): Result<AppointmentResponse> {
        return safeApiCall {
            api.bookAppointment(providerId, BookAppointmentRequest(date, time, reason, paymentId))
        }
    }
    
    suspend fun getMyAppointments(): Result<List<AppointmentResponse>> {
        return safeApiCall {
            api.getMyAppointments()
        }
    }
    
    suspend fun updateAppointment(
        appointmentId: String,
        date: String? = null,
        time: String? = null,
        status: String? = null
    ): Result<AppointmentResponse> {
        return safeApiCall {
            api.updateAppointment(appointmentId, UpdateAppointmentRequest(date, time, status))
        }
    }
    
    // Food / Restaurants
    suspend fun getRestaurants(
        query: String? = null,
        cuisine: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        limit: Int = 20
    ): Result<List<ChatrRestaurantResponse>> {
        return safeApiCall {
            api.getRestaurants(query, cuisine, lat, lon, limit)
        }
    }
    
    suspend fun getRestaurant(restaurantId: String): Result<ChatrRestaurantResponse> {
        return safeApiCall {
            api.getRestaurant(restaurantId)
        }
    }
    
    suspend fun getRestaurantMenu(restaurantId: String): Result<List<MenuItemResponse>> {
        return safeApiCall {
            api.getRestaurantMenu(restaurantId)
        }
    }
    
    suspend fun createFoodOrder(
        restaurantId: String,
        items: List<OrderItem>,
        deliveryAddress: String,
        deliveryInstructions: String?,
        paymentId: String
    ): Result<FoodOrderResponse> {
        return safeApiCall {
            api.createFoodOrder(CreateFoodOrderRequest(restaurantId, items, deliveryAddress, deliveryInstructions, paymentId))
        }
    }
    
    suspend fun getMyFoodOrders(): Result<List<FoodOrderResponse>> {
        return safeApiCall {
            api.getMyFoodOrders()
        }
    }
    
    suspend fun getFoodOrder(orderId: String): Result<FoodOrderResponse> {
        return safeApiCall {
            api.getFoodOrder(orderId)
        }
    }
    
    // Deals
    suspend fun getDeals(
        query: String? = null,
        category: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        limit: Int = 20
    ): Result<List<ChatrDealResponse>> {
        return safeApiCall {
            api.getDeals(query, category, lat, lon, limit)
        }
    }
    
    suspend fun getDeal(dealId: String): Result<ChatrDealResponse> {
        return safeApiCall {
            api.getDeal(dealId)
        }
    }
    
    suspend fun claimDeal(dealId: String): Result<ClaimDealResponse> {
        return safeApiCall {
            api.claimDeal(dealId)
        }
    }
    
    suspend fun getClaimedDeals(): Result<List<ClaimedDealResponse>> {
        return safeApiCall {
            api.getClaimedDeals()
        }
    }
}
