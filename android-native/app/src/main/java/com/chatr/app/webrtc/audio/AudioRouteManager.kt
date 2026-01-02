package com.chatr.app.webrtc.audio

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothHeadset
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Audio Route Manager - GSM-grade audio routing
 * 
 * Handles:
 * - Earpiece (default for voice calls)
 * - Speaker
 * - Bluetooth SCO
 * - Wired headset
 * - Audio focus management
 * - Network switching awareness
 */
@Singleton
class AudioRouteManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "AudioRouteManager"
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private var bluetoothHeadset: BluetoothHeadset? = null

    private val _currentRoute = MutableStateFlow(AudioRoute.EARPIECE)
    val currentRoute: StateFlow<AudioRoute> = _currentRoute.asStateFlow()

    private val _availableRoutes = MutableStateFlow<Set<AudioRoute>>(setOf(AudioRoute.EARPIECE, AudioRoute.SPEAKER))
    val availableRoutes: StateFlow<Set<AudioRoute>> = _availableRoutes.asStateFlow()

    private val _isMuted = MutableStateFlow(false)
    val isMuted: StateFlow<Boolean> = _isMuted.asStateFlow()

    private val _hasAudioFocus = MutableStateFlow(false)
    val hasAudioFocus: StateFlow<Boolean> = _hasAudioFocus.asStateFlow()

    private var audioFocusRequest: AudioFocusRequest? = null
    private var isBluetoothScoStarted = false
    private var originalAudioMode: Int = AudioManager.MODE_NORMAL
    private var originalSpeakerState: Boolean = false

    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        Log.d(TAG, "Audio focus changed: $focusChange")
        when (focusChange) {
            AudioManager.AUDIOFOCUS_GAIN -> {
                _hasAudioFocus.value = true
                restoreAudioState()
            }
            AudioManager.AUDIOFOCUS_LOSS -> {
                _hasAudioFocus.value = false
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                _hasAudioFocus.value = false
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                // Lower volume but keep playing
            }
        }
    }

    private val headsetReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                Intent.ACTION_HEADSET_PLUG -> {
                    val state = intent.getIntExtra("state", 0)
                    Log.d(TAG, "Wired headset state: $state")
                    updateAvailableRoutes()
                    if (state == 1) {
                        // Headset connected - switch to it
                        setAudioRoute(AudioRoute.WIRED_HEADSET)
                    } else {
                        // Headset disconnected - switch to earpiece
                        setAudioRoute(AudioRoute.EARPIECE)
                    }
                }
                BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED -> {
                    val state = intent.getIntExtra(BluetoothProfile.EXTRA_STATE, BluetoothProfile.STATE_DISCONNECTED)
                    Log.d(TAG, "Bluetooth headset state: $state")
                    updateAvailableRoutes()
                    if (state == BluetoothProfile.STATE_CONNECTED) {
                        // Bluetooth connected
                    } else if (state == BluetoothProfile.STATE_DISCONNECTED) {
                        if (_currentRoute.value == AudioRoute.BLUETOOTH) {
                            setAudioRoute(AudioRoute.EARPIECE)
                        }
                    }
                }
                AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED -> {
                    val state = intent.getIntExtra(AudioManager.EXTRA_SCO_AUDIO_STATE, AudioManager.SCO_AUDIO_STATE_ERROR)
                    Log.d(TAG, "SCO audio state: $state")
                    if (state == AudioManager.SCO_AUDIO_STATE_CONNECTED) {
                        _currentRoute.value = AudioRoute.BLUETOOTH
                    } else if (state == AudioManager.SCO_AUDIO_STATE_DISCONNECTED) {
                        isBluetoothScoStarted = false
                    }
                }
            }
        }
    }

    private val bluetoothProfileListener = object : BluetoothProfile.ServiceListener {
        override fun onServiceConnected(profile: Int, proxy: BluetoothProfile) {
            if (profile == BluetoothProfile.HEADSET) {
                bluetoothHeadset = proxy as BluetoothHeadset
                updateAvailableRoutes()
            }
        }

        override fun onServiceDisconnected(profile: Int) {
            if (profile == BluetoothProfile.HEADSET) {
                bluetoothHeadset = null
                updateAvailableRoutes()
            }
        }
    }

    /**
     * Initialize audio routing for a call
     */
    fun initialize() {
        Log.d(TAG, "Initializing audio route manager")
        
        // Save original state
        originalAudioMode = audioManager.mode
        originalSpeakerState = audioManager.isSpeakerphoneOn

        // Register receivers
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_HEADSET_PLUG)
            addAction(BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED)
            addAction(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)
        }
        context.registerReceiver(headsetReceiver, filter)

        // Setup Bluetooth
        setupBluetooth()

        // Update available routes
        updateAvailableRoutes()

        // Request audio focus
        requestAudioFocus()

        // Set initial audio mode for VoIP
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
    }

    /**
     * Clean up audio routing
     */
    fun release() {
        Log.d(TAG, "Releasing audio route manager")

        // Stop Bluetooth SCO if active
        if (isBluetoothScoStarted) {
            try {
                audioManager.stopBluetoothSco()
                audioManager.isBluetoothScoOn = false
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping Bluetooth SCO", e)
            }
            isBluetoothScoStarted = false
        }

        // Release audio focus
        releaseAudioFocus()

        // Restore original audio state
        audioManager.mode = originalAudioMode
        audioManager.isSpeakerphoneOn = originalSpeakerState

        // Unregister receiver
        try {
            context.unregisterReceiver(headsetReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering receiver", e)
        }

        // Cleanup Bluetooth
        bluetoothManager?.adapter?.closeProfileProxy(BluetoothProfile.HEADSET, bluetoothHeadset)
        bluetoothHeadset = null
    }

    /**
     * Set the audio route
     */
    fun setAudioRoute(route: AudioRoute) {
        Log.d(TAG, "Setting audio route: $route")

        // Stop current Bluetooth SCO if switching away
        if (_currentRoute.value == AudioRoute.BLUETOOTH && route != AudioRoute.BLUETOOTH) {
            stopBluetoothSco()
        }

        when (route) {
            AudioRoute.EARPIECE -> {
                audioManager.isSpeakerphoneOn = false
                audioManager.isBluetoothScoOn = false
                _currentRoute.value = AudioRoute.EARPIECE
            }
            AudioRoute.SPEAKER -> {
                audioManager.isSpeakerphoneOn = true
                audioManager.isBluetoothScoOn = false
                _currentRoute.value = AudioRoute.SPEAKER
            }
            AudioRoute.BLUETOOTH -> {
                if (isBluetoothAvailable()) {
                    startBluetoothSco()
                } else {
                    Log.w(TAG, "Bluetooth not available")
                }
            }
            AudioRoute.WIRED_HEADSET -> {
                audioManager.isSpeakerphoneOn = false
                audioManager.isBluetoothScoOn = false
                _currentRoute.value = AudioRoute.WIRED_HEADSET
            }
        }
    }

    /**
     * Toggle speaker
     */
    fun toggleSpeaker(): Boolean {
        val newRoute = if (_currentRoute.value == AudioRoute.SPEAKER) {
            AudioRoute.EARPIECE
        } else {
            AudioRoute.SPEAKER
        }
        setAudioRoute(newRoute)
        return _currentRoute.value == AudioRoute.SPEAKER
    }

    /**
     * Toggle mute
     */
    fun toggleMute(): Boolean {
        _isMuted.value = !_isMuted.value
        audioManager.isMicrophoneMute = _isMuted.value
        Log.d(TAG, "Mute toggled: ${_isMuted.value}")
        return _isMuted.value
    }

    /**
     * Set mute state
     */
    fun setMuted(muted: Boolean) {
        _isMuted.value = muted
        audioManager.isMicrophoneMute = muted
    }

    /**
     * Cycle through available audio routes
     */
    fun cycleRoute() {
        val routes = _availableRoutes.value.toList()
        val currentIndex = routes.indexOf(_currentRoute.value)
        val nextIndex = (currentIndex + 1) % routes.size
        setAudioRoute(routes[nextIndex])
    }

    private fun setupBluetooth() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) 
            == PackageManager.PERMISSION_GRANTED || Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            bluetoothManager?.adapter?.getProfileProxy(
                context,
                bluetoothProfileListener,
                BluetoothProfile.HEADSET
            )
        }
    }

    private fun requestAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(audioFocusChangeListener, Handler(Looper.getMainLooper()))
                .build()

            val result = audioManager.requestAudioFocus(audioFocusRequest!!)
            _hasAudioFocus.value = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            Log.d(TAG, "Audio focus request result: $result")
        } else {
            @Suppress("DEPRECATION")
            val result = audioManager.requestAudioFocus(
                audioFocusChangeListener,
                AudioManager.STREAM_VOICE_CALL,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
            )
            _hasAudioFocus.value = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
    }

    private fun releaseAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let {
                audioManager.abandonAudioFocusRequest(it)
            }
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(audioFocusChangeListener)
        }
        _hasAudioFocus.value = false
    }

    private fun startBluetoothSco() {
        if (!isBluetoothScoStarted) {
            try {
                audioManager.startBluetoothSco()
                audioManager.isBluetoothScoOn = true
                isBluetoothScoStarted = true
                Log.d(TAG, "Started Bluetooth SCO")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start Bluetooth SCO", e)
            }
        }
    }

    private fun stopBluetoothSco() {
        if (isBluetoothScoStarted) {
            try {
                audioManager.stopBluetoothSco()
                audioManager.isBluetoothScoOn = false
                isBluetoothScoStarted = false
                Log.d(TAG, "Stopped Bluetooth SCO")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop Bluetooth SCO", e)
            }
        }
    }

    private fun isBluetoothAvailable(): Boolean {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT)
            != PackageManager.PERMISSION_GRANTED && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return false
        }
        return bluetoothHeadset?.connectedDevices?.isNotEmpty() == true
    }

    private fun isWiredHeadsetConnected(): Boolean {
        val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
        return audioDevices.any { 
            it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET || 
            it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
            it.type == AudioDeviceInfo.TYPE_USB_HEADSET
        }
    }

    private fun updateAvailableRoutes() {
        val routes = mutableSetOf(AudioRoute.EARPIECE, AudioRoute.SPEAKER)
        
        if (isWiredHeadsetConnected()) {
            routes.add(AudioRoute.WIRED_HEADSET)
        }
        
        if (isBluetoothAvailable()) {
            routes.add(AudioRoute.BLUETOOTH)
        }
        
        _availableRoutes.value = routes
        Log.d(TAG, "Available routes: $routes")
    }

    private fun restoreAudioState() {
        // Restore current route settings
        setAudioRoute(_currentRoute.value)
    }
}

/**
 * Audio routing options
 */
enum class AudioRoute {
    EARPIECE,
    SPEAKER,
    BLUETOOTH,
    WIRED_HEADSET
}
