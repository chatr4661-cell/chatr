package com.chatr.app.webrtc

import android.content.Context
import android.media.AudioManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.webrtc.*

class MediaManager(private val context: Context) {
    private var videoCapturer: CameraVideoCapturer? = null
    private var videoSource: VideoSource? = null
    private var audioSource: AudioSource? = null
    private var localVideoTrack: VideoTrack? = null
    private var localAudioTrack: AudioTrack? = null
    private var localMediaStream: MediaStream? = null
    private var peerConnectionFactory: PeerConnectionFactory? = null
    
    private val _isMicMuted = MutableStateFlow(false)
    val isMicMuted: StateFlow<Boolean> = _isMicMuted
    
    private val _isVideoEnabled = MutableStateFlow(true)
    val isVideoEnabled: StateFlow<Boolean> = _isVideoEnabled
    
    private val _currentCamera = MutableStateFlow(CameraFacing.FRONT)
    val currentCamera: StateFlow<CameraFacing> = _currentCamera
    
    private val _audioRoute = MutableStateFlow(AudioRoute.EARPIECE)
    val audioRoute: StateFlow<AudioRoute> = _audioRoute
    
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    
    fun initializeFactory(factory: PeerConnectionFactory) {
        this.peerConnectionFactory = factory
    }
    
    fun createLocalMediaStream(isVideoCall: Boolean): MediaStream? {
        val factory = peerConnectionFactory ?: return null
        
        // Create audio track
        audioSource = factory.createAudioSource(MediaConstraints())
        localAudioTrack = factory.createAudioTrack("audio_track", audioSource)
        
        localMediaStream = factory.createLocalMediaStream("local_stream")
        localMediaStream?.addTrack(localAudioTrack)
        
        // Create video track if video call
        if (isVideoCall) {
            val surfaceTextureHelper = SurfaceTextureHelper.create(
                "CaptureThread",
                EglBase.create().eglBaseContext
            )
            
            videoCapturer = createCameraVideoCapturer()
            videoSource = factory.createVideoSource(videoCapturer?.isScreencast ?: false)
            videoCapturer?.initialize(surfaceTextureHelper, context, videoSource?.capturerObserver)
            
            localVideoTrack = factory.createVideoTrack("video_track", videoSource)
            localMediaStream?.addTrack(localVideoTrack)
            
            // Start capturing
            videoCapturer?.startCapture(1280, 720, 30)
        }
        
        return localMediaStream
    }
    
    private fun createCameraVideoCapturer(): CameraVideoCapturer? {
        val enumerator = Camera2Enumerator(context)
        val deviceNames = enumerator.deviceNames
        
        // Try front camera first
        for (deviceName in deviceNames) {
            if (enumerator.isFrontFacing(deviceName)) {
                val capturer = enumerator.createCapturer(deviceName, null)
                if (capturer != null) {
                    _currentCamera.value = CameraFacing.FRONT
                    return capturer
                }
            }
        }
        
        // Fall back to back camera
        for (deviceName in deviceNames) {
            if (enumerator.isBackFacing(deviceName)) {
                val capturer = enumerator.createCapturer(deviceName, null)
                if (capturer != null) {
                    _currentCamera.value = CameraFacing.BACK
                    return capturer
                }
            }
        }
        
        return null
    }
    
    fun toggleMicrophone(): Boolean {
        localAudioTrack?.setEnabled(_isMicMuted.value)
        _isMicMuted.value = !_isMicMuted.value
        return _isMicMuted.value
    }
    
    fun toggleVideo(): Boolean {
        localVideoTrack?.setEnabled(_isVideoEnabled.value)
        _isVideoEnabled.value = !_isVideoEnabled.value
        return _isVideoEnabled.value
    }
    
    fun switchCamera() {
        val cameraVideoCapturer = videoCapturer as? CameraVideoCapturer ?: return
        cameraVideoCapturer.switchCamera(object : CameraVideoCapturer.CameraSwitchHandler {
            override fun onCameraSwitchDone(isFrontFacing: Boolean) {
                _currentCamera.value = if (isFrontFacing) CameraFacing.FRONT else CameraFacing.BACK
            }
            
            override fun onCameraSwitchError(errorDescription: String) {
                // Handle error
            }
        })
    }
    
    fun setAudioRoute(route: AudioRoute) {
        _audioRoute.value = route
        
        when (route) {
            AudioRoute.SPEAKER -> {
                audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                audioManager.isSpeakerphoneOn = true
            }
            AudioRoute.EARPIECE -> {
                audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                audioManager.isSpeakerphoneOn = false
            }
            AudioRoute.BLUETOOTH -> {
                audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                audioManager.startBluetoothSco()
                audioManager.isBluetoothScoOn = true
            }
            AudioRoute.WIRED_HEADSET -> {
                audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                audioManager.isSpeakerphoneOn = false
            }
        }
    }
    
    fun attachVideoRenderer(renderer: SurfaceViewRenderer) {
        localVideoTrack?.addSink(renderer)
    }
    
    fun detachVideoRenderer(renderer: SurfaceViewRenderer) {
        localVideoTrack?.removeSink(renderer)
    }
    
    fun release() {
        videoCapturer?.stopCapture()
        videoCapturer?.dispose()
        
        localVideoTrack?.dispose()
        localAudioTrack?.dispose()
        
        videoSource?.dispose()
        audioSource?.dispose()
        
        localMediaStream?.dispose()
        
        // Reset audio
        audioManager.mode = AudioManager.MODE_NORMAL
        audioManager.isSpeakerphoneOn = false
        if (audioManager.isBluetoothScoOn) {
            audioManager.stopBluetoothSco()
            audioManager.isBluetoothScoOn = false
        }
    }
}

enum class CameraFacing {
    FRONT,
    BACK
}

enum class AudioRoute {
    SPEAKER,
    EARPIECE,
    BLUETOOTH,
    WIRED_HEADSET
}
