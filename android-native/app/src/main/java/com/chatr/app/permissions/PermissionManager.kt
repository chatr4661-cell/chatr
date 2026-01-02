package com.chatr.app.permissions

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * Centralized permission management for CHATR
 * Handles all runtime permissions required for telecom-grade calling
 */
object PermissionManager {
    
    enum class PermissionGroup {
        PHONE,          // Phone state, call management
        MICROPHONE,     // Audio recording
        CAMERA,         // Video calls
        CONTACTS,       // Contact sync
        NOTIFICATIONS,  // Push notifications (Android 13+)
        BLUETOOTH       // Bluetooth audio devices
    }
    
    data class PermissionStatus(
        val group: PermissionGroup,
        val isGranted: Boolean,
        val permissions: List<String>,
        val rationale: String,
        val isCritical: Boolean
    )
    
    fun getRequiredPermissions(): List<String> {
        val permissions = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.CALL_PHONE,
            Manifest.permission.READ_CONTACTS,
            Manifest.permission.CAMERA
        )
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            permissions.add(Manifest.permission.ANSWER_PHONE_CALLS)
        }
        
        return permissions
    }
    
    fun getCriticalPermissions(): List<String> {
        val permissions = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.READ_PHONE_STATE
        )
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        
        return permissions
    }
    
    fun checkAllPermissions(context: Context): List<PermissionStatus> {
        return listOf(
            checkPhonePermissions(context),
            checkMicrophonePermission(context),
            checkCameraPermission(context),
            checkContactsPermission(context),
            checkNotificationPermission(context),
            checkBluetoothPermission(context)
        )
    }
    
    fun getMissingCriticalPermissions(context: Context): List<String> {
        return getCriticalPermissions().filter {
            ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
        }
    }
    
    fun getMissingPermissions(context: Context): List<String> {
        return getRequiredPermissions().filter {
            ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
        }
    }
    
    fun areAllCriticalPermissionsGranted(context: Context): Boolean {
        return getMissingCriticalPermissions(context).isEmpty()
    }
    
    fun areAllPermissionsGranted(context: Context): Boolean {
        return getMissingPermissions(context).isEmpty()
    }
    
    private fun checkPhonePermissions(context: Context): PermissionStatus {
        val permissions = mutableListOf(
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.CALL_PHONE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            permissions.add(Manifest.permission.ANSWER_PHONE_CALLS)
        }
        
        val allGranted = permissions.all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }
        
        return PermissionStatus(
            group = PermissionGroup.PHONE,
            isGranted = allGranted,
            permissions = permissions,
            rationale = "Phone access is required to manage calls and integrate with your device's calling system.",
            isCritical = true
        )
    }
    
    private fun checkMicrophonePermission(context: Context): PermissionStatus {
        val permission = Manifest.permission.RECORD_AUDIO
        val isGranted = ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        
        return PermissionStatus(
            group = PermissionGroup.MICROPHONE,
            isGranted = isGranted,
            permissions = listOf(permission),
            rationale = "Microphone access is required to transmit your voice during calls.",
            isCritical = true
        )
    }
    
    private fun checkCameraPermission(context: Context): PermissionStatus {
        val permission = Manifest.permission.CAMERA
        val isGranted = ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        
        return PermissionStatus(
            group = PermissionGroup.CAMERA,
            isGranted = isGranted,
            permissions = listOf(permission),
            rationale = "Camera access is required for video calls.",
            isCritical = false
        )
    }
    
    private fun checkContactsPermission(context: Context): PermissionStatus {
        val permission = Manifest.permission.READ_CONTACTS
        val isGranted = ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        
        return PermissionStatus(
            group = PermissionGroup.CONTACTS,
            isGranted = isGranted,
            permissions = listOf(permission),
            rationale = "Contacts access helps you connect with people you know.",
            isCritical = false
        )
    }
    
    private fun checkNotificationPermission(context: Context): PermissionStatus {
        val permission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Manifest.permission.POST_NOTIFICATIONS
        } else {
            return PermissionStatus(
                group = PermissionGroup.NOTIFICATIONS,
                isGranted = true,
                permissions = emptyList(),
                rationale = "",
                isCritical = false
            )
        }
        
        val isGranted = ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        
        return PermissionStatus(
            group = PermissionGroup.NOTIFICATIONS,
            isGranted = isGranted,
            permissions = listOf(permission),
            rationale = "Notifications ensure you never miss an incoming call or message.",
            isCritical = true
        )
    }
    
    private fun checkBluetoothPermission(context: Context): PermissionStatus {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return PermissionStatus(
                group = PermissionGroup.BLUETOOTH,
                isGranted = true,
                permissions = emptyList(),
                rationale = "",
                isCritical = false
            )
        }
        
        val permission = Manifest.permission.BLUETOOTH_CONNECT
        val isGranted = ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        
        return PermissionStatus(
            group = PermissionGroup.BLUETOOTH,
            isGranted = isGranted,
            permissions = listOf(permission),
            rationale = "Bluetooth access enables using wireless headphones and car audio during calls.",
            isCritical = false
        )
    }
}
