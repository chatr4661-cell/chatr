package com.chatr.app.di

import android.content.Context
import com.chatr.app.data.api.SupabaseApi
import com.chatr.app.services.pstn.PSTNCallingService
import com.chatr.app.services.sms.SMSGatewayService
import com.chatr.app.webrtc.emergency.E911LocationService
import com.chatr.app.webrtc.emergency.EmergencyCallHandler
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module for GSM replacement services
 * 
 * Provides:
 * - E911 Location Service
 * - SMS/RCS Gateway
 * - PSTN Calling Service
 */
@Module
@InstallIn(SingletonComponent::class)
object GsmServicesModule {
    
    @Provides
    @Singleton
    fun provideE911LocationService(
        @ApplicationContext context: Context
    ): E911LocationService {
        return E911LocationService(context)
    }
    
    @Provides
    @Singleton
    fun provideSMSGatewayService(
        @ApplicationContext context: Context,
        supabaseApi: SupabaseApi
    ): SMSGatewayService {
        return SMSGatewayService(context, supabaseApi)
    }
    
    @Provides
    @Singleton
    fun providePSTNCallingService(
        @ApplicationContext context: Context,
        supabaseApi: SupabaseApi
    ): PSTNCallingService {
        return PSTNCallingService(context, supabaseApi)
    }
    
    @Provides
    @Singleton
    fun provideEmergencyCallHandler(
        @ApplicationContext context: Context
    ): EmergencyCallHandler {
        return EmergencyCallHandler(context)
    }
}
