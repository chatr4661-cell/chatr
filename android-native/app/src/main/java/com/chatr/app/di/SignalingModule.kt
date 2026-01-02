package com.chatr.app.di

import com.chatr.app.data.local.dao.CallDao
import com.chatr.app.webrtc.signaling.CallSignalingClient
import com.chatr.app.webrtc.signaling.CallSignalingRepository
import com.chatr.app.webrtc.timeout.CallTimeoutManager
import com.chatr.app.webrtc.multidevice.MultiDeviceSafetyManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.ktor.client.*
import javax.inject.Singleton

/**
 * Hilt Module for Call Signaling dependencies
 */
@Module
@InstallIn(SingletonComponent::class)
object SignalingModule {

    @Provides
    @Singleton
    fun provideCallSignalingClient(
        httpClient: HttpClient
    ): CallSignalingClient {
        return CallSignalingClient(httpClient)
    }

    @Provides
    @Singleton
    fun provideCallSignalingRepository(
        signalingClient: CallSignalingClient,
        callDao: CallDao
    ): CallSignalingRepository {
        return CallSignalingRepository(signalingClient, callDao)
    }
}
