package com.chatr.app.webrtc.core

import android.content.Context
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import org.webrtc.*
import org.webrtc.audio.JavaAudioDeviceModule
import javax.inject.Inject
import javax.inject.Singleton

/**
 * PeerConnectionFactory Provider - Singleton factory with optimized settings
 * 
 * Provides a properly configured PeerConnectionFactory with:
 * - Hardware acceleration
 * - Echo cancellation
 * - Noise suppression
 * - Automatic gain control
 * - VP8/VP9/H264 codec support
 */
@Singleton
class PeerConnectionFactoryProvider @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "PCFactoryProvider"
    }

    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var eglBase: EglBase? = null

    val factory: PeerConnectionFactory
        get() = peerConnectionFactory ?: createFactory()

    val eglBaseContext: EglBase.Context
        get() = eglBase?.eglBaseContext ?: createEglBase().eglBaseContext

    val rootEglBase: EglBase
        get() = eglBase ?: createEglBase()

    @Synchronized
    private fun createEglBase(): EglBase {
        if (eglBase == null) {
            eglBase = EglBase.create()
            Log.d(TAG, "EglBase created")
        }
        return eglBase!!
    }

    @Synchronized
    private fun createFactory(): PeerConnectionFactory {
        if (peerConnectionFactory != null) {
            return peerConnectionFactory!!
        }

        Log.d(TAG, "Creating PeerConnectionFactory")

        // Initialize WebRTC
        val initOptions = PeerConnectionFactory.InitializationOptions.builder(context)
            .setEnableInternalTracer(true)
            .setFieldTrials("WebRTC-H264HighProfile/Enabled/")
            .createInitializationOptions()
        PeerConnectionFactory.initialize(initOptions)

        // Create audio device module with echo cancellation
        val audioDeviceModule = createAudioDeviceModule()

        // Create video encoder/decoder factories with hardware acceleration
        val encoderFactory = DefaultVideoEncoderFactory(
            eglBaseContext,
            true, // enableIntelVp8Encoder
            true  // enableH264HighProfile
        )
        
        val decoderFactory = DefaultVideoDecoderFactory(eglBaseContext)

        // Build factory with optimized options
        val options = PeerConnectionFactory.Options().apply {
            disableEncryption = false
            disableNetworkMonitor = false
        }

        peerConnectionFactory = PeerConnectionFactory.builder()
            .setOptions(options)
            .setAudioDeviceModule(audioDeviceModule)
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .createPeerConnectionFactory()

        Log.d(TAG, "PeerConnectionFactory created successfully")
        return peerConnectionFactory!!
    }

    private fun createAudioDeviceModule(): JavaAudioDeviceModule {
        return JavaAudioDeviceModule.builder(context)
            .setUseHardwareAcousticEchoCanceler(true)
            .setUseHardwareNoiseSuppressor(true)
            .setAudioRecordErrorCallback(object : JavaAudioDeviceModule.AudioRecordErrorCallback {
                override fun onWebRtcAudioRecordInitError(errorMessage: String) {
                    Log.e(TAG, "Audio record init error: $errorMessage")
                }

                override fun onWebRtcAudioRecordStartError(
                    errorCode: JavaAudioDeviceModule.AudioRecordStartErrorCode,
                    errorMessage: String
                ) {
                    Log.e(TAG, "Audio record start error: $errorCode - $errorMessage")
                }

                override fun onWebRtcAudioRecordError(errorMessage: String) {
                    Log.e(TAG, "Audio record error: $errorMessage")
                }
            })
            .setAudioTrackErrorCallback(object : JavaAudioDeviceModule.AudioTrackErrorCallback {
                override fun onWebRtcAudioTrackInitError(errorMessage: String) {
                    Log.e(TAG, "Audio track init error: $errorMessage")
                }

                override fun onWebRtcAudioTrackStartError(
                    errorCode: JavaAudioDeviceModule.AudioTrackStartErrorCode,
                    errorMessage: String
                ) {
                    Log.e(TAG, "Audio track start error: $errorCode - $errorMessage")
                }

                override fun onWebRtcAudioTrackError(errorMessage: String) {
                    Log.e(TAG, "Audio track error: $errorMessage")
                }
            })
            .setAudioRecordStateCallback(object : JavaAudioDeviceModule.AudioRecordStateCallback {
                override fun onWebRtcAudioRecordStart() {
                    Log.d(TAG, "Audio recording started")
                }

                override fun onWebRtcAudioRecordStop() {
                    Log.d(TAG, "Audio recording stopped")
                }
            })
            .setAudioTrackStateCallback(object : JavaAudioDeviceModule.AudioTrackStateCallback {
                override fun onWebRtcAudioTrackStart() {
                    Log.d(TAG, "Audio playback started")
                }

                override fun onWebRtcAudioTrackStop() {
                    Log.d(TAG, "Audio playback stopped")
                }
            })
            .createAudioDeviceModule()
    }

    /**
     * Dispose factory and release resources
     */
    @Synchronized
    fun dispose() {
        Log.d(TAG, "Disposing PeerConnectionFactory")
        peerConnectionFactory?.dispose()
        peerConnectionFactory = null
        
        eglBase?.release()
        eglBase = null
    }

    /**
     * Create optimized MediaConstraints for audio
     */
    fun createAudioConstraints(): MediaConstraints {
        return MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("googEchoCancellation", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googAutoGainControl", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googHighpassFilter", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googNoiseSuppression", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googTypingNoiseDetection", "true"))
        }
    }

    /**
     * Create SDP constraints for offers/answers
     */
    fun createSdpConstraints(
        receiveAudio: Boolean = true,
        receiveVideo: Boolean = true
    ): MediaConstraints {
        return MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", receiveAudio.toString()))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", receiveVideo.toString()))
        }
    }
}
