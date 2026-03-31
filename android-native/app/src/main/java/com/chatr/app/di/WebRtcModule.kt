package com.chatr.app.di

import android.content.Context
import com.chatr.app.calling.*
import com.chatr.app.dialer.SmartCallRouter
import com.chatr.app.dialer.SystemDialerIntegration
import com.chatr.app.webrtc.audio.AudioRouteManager
import com.chatr.app.webrtc.bridge.TelecomWebRtcBridge
import com.chatr.app.webrtc.core.PeerConnectionFactoryProvider
import com.chatr.app.webrtc.core.WebRtcClient
import com.chatr.app.webrtc.network.NetworkMonitor
import com.chatr.app.webrtc.state.CallStateMachine
import com.chatr.app.websocket.WebRTCSignalingClient
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import io.ktor.client.*
import javax.inject.Singleton

/**
 * Hilt Module for WebRTC + Dialer + Carrier-Grade Reliability dependencies
 */
@Module
@InstallIn(SingletonComponent::class)
object WebRtcModule {

    @Provides
    @Singleton
    fun provideCallStateMachine(): CallStateMachine {
        return CallStateMachine()
    }

    @Provides
    @Singleton
    fun providePeerConnectionFactoryProvider(
        @ApplicationContext context: Context
    ): PeerConnectionFactoryProvider {
        return PeerConnectionFactoryProvider(context)
    }

    @Provides
    @Singleton
    fun provideAudioRouteManager(
        @ApplicationContext context: Context
    ): AudioRouteManager {
        return AudioRouteManager(context)
    }

    @Provides
    @Singleton
    fun provideNetworkMonitor(
        @ApplicationContext context: Context
    ): NetworkMonitor {
        return NetworkMonitor(context)
    }

    @Provides
    @Singleton
    fun provideWebRtcClient(
        @ApplicationContext context: Context,
        factoryProvider: PeerConnectionFactoryProvider,
        callStateMachine: CallStateMachine
    ): WebRtcClient {
        return WebRtcClient(context, factoryProvider, callStateMachine)
    }

    @Provides
    @Singleton
    fun provideTelecomWebRtcBridge(
        @ApplicationContext context: Context,
        webRtcClient: WebRtcClient,
        audioRouteManager: AudioRouteManager,
        callStateMachine: CallStateMachine,
        signalingClient: WebRTCSignalingClient
    ): TelecomWebRtcBridge {
        return TelecomWebRtcBridge(
            context,
            webRtcClient,
            audioRouteManager,
            callStateMachine,
            signalingClient
        )
    }

    // --- Carrier-Grade Reliability Layer ---

    @Provides
    @Singleton
    fun provideCallSessionManager(): CallSessionManager {
        return CallSessionManager()
    }

    @Provides
    @Singleton
    fun provideAudioFocusManager(
        @ApplicationContext context: Context
    ): AudioFocusManager {
        return AudioFocusManager(context)
    }

    @Provides
    @Singleton
    fun provideTurnServerProvider(): TurnServerProvider {
        return TurnServerProvider()
    }

    @Provides
    @Singleton
    fun provideNetworkCallbackHandler(
        @ApplicationContext context: Context
    ): NetworkCallbackHandler {
        return NetworkCallbackHandler(context)
    }

    @Provides
    @Singleton
    fun provideOemProtectionHelper(
        @ApplicationContext context: Context
    ): OemProtectionHelper {
        return OemProtectionHelper(context)
    }

    // --- System Dialer Integration ---

    @Provides
    @Singleton
    fun provideSmartCallRouter(
        @ApplicationContext context: Context,
        httpClient: HttpClient
    ): SmartCallRouter {
        return SmartCallRouter(context, httpClient)
    }

    @Provides
    @Singleton
    fun provideSystemDialerIntegration(): SystemDialerIntegration {
        return SystemDialerIntegration()
    }
}
