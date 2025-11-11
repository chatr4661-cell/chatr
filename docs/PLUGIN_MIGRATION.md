# Capacitor Plugin → Native Android SDK Migration Guide

This document details how to migrate from Capacitor plugins to native Android SDKs for the Chatr+ app.

---

## 📋 Migration Overview

| Priority | Plugin | Native Alternative | Complexity | Status |
|----------|--------|-------------------|------------|--------|
| 🔴 High | Push Notifications | Firebase Messaging | Medium | Planned |
| 🔴 High | Geolocation | FusedLocationProvider | Medium | Planned |
| 🔴 High | Camera | CameraX | High | Planned |
| 🔴 High | Preferences | DataStore | Low | Planned |
| 🟡 Medium | Filesystem | Java File APIs | Low | Planned |
| 🟡 Medium | Contacts | ContactsContract | Medium | Planned |
| 🟡 Medium | Local Notifications | NotificationCompat | Low | Planned |
| 🟡 Medium | Network | ConnectivityManager | Low | Planned |
| 🟡 Medium | Haptics | Vibrator | Low | Planned |
| 🟢 Low | Bluetooth LE | Android Bluetooth | High | Deferred |
| 🟢 Low | App Lifecycle | Activity Callbacks | Low | Planned |
| 🟢 Low | Device Info | Build Class | Low | Planned |
| 🟢 Low | Share | ShareCompat | Low | Planned |
| 🟢 Low | Clipboard | ClipboardManager | Low | Planned |

---

## 1️⃣ Push Notifications

### **Current: Capacitor Push Notifications**

**React/TypeScript:**
```typescript
// src/hooks/usePushNotifications.tsx
import { PushNotifications } from '@capacitor/push-notifications';

export const usePushNotifications = (userId?: string) => {
  useEffect(() => {
    const initPush = async () => {
      await PushNotifications.requestPermissions();
      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token) => {
        await supabase.from('device_tokens').upsert({
          user_id: userId,
          device_token: token.value,
          platform: 'android'
        });
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        toast({
          title: notification.title,
          description: notification.body
        });
      });
    };

    initPush();
  }, [userId]);
};
```

### **Native: Firebase Cloud Messaging**

**Kotlin:**

#### 1. Add Dependencies
```kotlin
// app/build.gradle.kts
dependencies {
    implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("androidx.work:work-runtime-ktx:2.9.0")
}

// Apply Google services plugin
plugins {
    id("com.google.gms.google-services")
}
```

#### 2. Create Messaging Service
```kotlin
// app/src/main/java/com/chatr/app/data/services/ChatrMessagingService.kt
@AndroidEntryPoint
class ChatrMessagingService : FirebaseMessagingService() {
    
    @Inject
    lateinit var deviceTokenRepository: DeviceTokenRepository
    
    @Inject
    lateinit var notificationManager: NotificationManagerCompat
    
    // Called when a new FCM token is generated
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        
        // Save token to Supabase
        CoroutineScope(Dispatchers.IO).launch {
            try {
                deviceTokenRepository.saveDeviceToken(token, "android")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to save device token", e)
            }
        }
    }
    
    // Called when a message is received
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        Log.d(TAG, "Message from: ${remoteMessage.from}")
        
        // Check if message contains data payload
        if (remoteMessage.data.isNotEmpty()) {
            handleDataMessage(remoteMessage.data)
        }
        
        // Check if message contains notification payload
        remoteMessage.notification?.let { notification ->
            showNotification(
                title = notification.title ?: "Chatr",
                body = notification.body ?: "",
                data = remoteMessage.data
            )
        }
    }
    
    private fun handleDataMessage(data: Map<String, String>) {
        val type = data["type"]
        
        when (type) {
            "message" -> {
                val conversationId = data["conversation_id"]
                val senderId = data["sender_id"]
                val messageBody = data["body"]
                
                showNotification(
                    title = data["sender_name"] ?: "New Message",
                    body = messageBody ?: "",
                    data = data
                )
            }
            "call" -> {
                // Handle incoming call notification
                val callId = data["call_id"]
                showIncomingCallNotification(callId, data)
            }
            "geofence" -> {
                // Handle geofence notification
                showNotification(
                    title = data["title"] ?: "Location Alert",
                    body = data["body"] ?: "",
                    data = data
                )
            }
        }
    }
    
    private fun showNotification(
        title: String,
        body: String,
        data: Map<String, String>
    ) {
        val channelId = "chatr_messages"
        
        // Create intent for notification tap
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("notification_data", Bundle().apply {
                data.forEach { (key, value) -> putString(key, value) }
            })
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
        
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
    
    private fun showIncomingCallNotification(callId: String?, data: Map<String, String>) {
        // Use CallKit/ConnectionService for full-screen incoming call UI
        // See CallKit implementation section
    }
    
    companion object {
        private const val TAG = "ChatrMessagingService"
    }
}
```

#### 3. Register in Manifest
```xml
<!-- app/src/main/AndroidManifest.xml -->
<application>
    <service
        android:name=".data.services.ChatrMessagingService"
        android:exported="false">
        <intent-filter>
            <action android:name="com.google.firebase.MESSAGING_EVENT" />
        </intent-filter>
    </service>
    
    <!-- Notification channels (Android 8.0+) -->
    <meta-data
        android:name="com.google.firebase.messaging.default_notification_icon"
        android:resource="@drawable/ic_notification" />
    <meta-data
        android:name="com.google.firebase.messaging.default_notification_color"
        android:resource="@color/primary" />
</application>
```

#### 4. Initialize Notification Channels
```kotlin
// app/src/main/java/com/chatr/app/ChatrApplication.kt
class ChatrApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }
    
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channels = listOf(
                NotificationChannel(
                    "chatr_messages",
                    "Messages",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "New message notifications"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 250, 250, 250)
                },
                NotificationChannel(
                    "chatr_calls",
                    "Calls",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Incoming call notifications"
                    setSound(
                        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .build()
                    )
                }
            )
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            channels.forEach { notificationManager.createNotificationChannel(it) }
        }
    }
}
```

#### 5. Request Permission (Android 13+)
```kotlin
// ui/screens/permissions/PermissionsViewModel.kt
@HiltViewModel
class PermissionsViewModel @Inject constructor() : ViewModel() {
    
    fun requestNotificationPermission(activity: ComponentActivity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            activity.requestPermissions(
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                REQUEST_CODE_NOTIFICATION
            )
        } else {
            // Permission granted by default on Android 12 and below
        }
    }
    
    companion object {
        const val REQUEST_CODE_NOTIFICATION = 1001
    }
}
```

---

## 2️⃣ Geolocation & Background Location

### **Current: Capacitor Geolocation**

**React/TypeScript:**
```typescript
// src/hooks/useBackgroundLocation.tsx
import { Geolocation } from '@capacitor/geolocation';

const startTracking = async () => {
  const watchId = await Geolocation.watchPosition(
    { enableHighAccuracy: true },
    (position) => {
      saveLocationToDatabase({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    }
  );
};
```

### **Native: FusedLocationProviderClient + WorkManager**

**Kotlin:**

#### 1. Add Dependencies
```kotlin
// app/build.gradle.kts
dependencies {
    implementation("com.google.android.gms:play-services-location:21.1.0")
    implementation("androidx.work:work-runtime-ktx:2.9.0")
}
```

#### 2. Request Permissions
```xml
<!-- app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<!-- For background location (Android 10+) -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

#### 3. Create Location Repository
```kotlin
// core/data/location/LocationRepository.kt
@Singleton
class LocationRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val supabaseClient: SupabaseClient
) {
    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    
    @RequiresPermission(anyOf = [
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    ])
    suspend fun getCurrentLocation(): Location? = suspendCancellableCoroutine { continuation ->
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000)
            .setWaitForAccurateLocation(false)
            .setMinUpdateIntervalMillis(5000)
            .build()
        
        fusedLocationClient.getCurrentLocation(request, null)
            .addOnSuccessListener { location ->
                continuation.resume(location)
            }
            .addOnFailureListener { exception ->
                continuation.resumeWithException(exception)
            }
    }
    
    suspend fun saveLocation(location: Location, userId: String) {
        try {
            supabaseClient.from("user_locations").insert(
                mapOf(
                    "user_id" to userId,
                    "latitude" to location.latitude,
                    "longitude" to location.longitude,
                    "accuracy" to location.accuracy,
                    "timestamp" to System.currentTimeMillis()
                )
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save location", e)
        }
    }
    
    companion object {
        private const val TAG = "LocationRepository"
    }
}
```

#### 4. Create Background Location Worker
```kotlin
// core/data/workers/LocationWorker.kt
@HiltWorker
class LocationWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val locationRepository: LocationRepository,
    private val userPreferences: UserPreferences
) : CoroutineWorker(appContext, params) {
    
    override suspend fun doWork(): Result {
        return try {
            val userId = userPreferences.getUserId() ?: return Result.failure()
            
            // Check if location sharing is enabled
            if (!userPreferences.isLocationSharingEnabled()) {
                return Result.success()
            }
            
            // Get current location
            val location = locationRepository.getCurrentLocation()
                ?: return Result.retry()
            
            // Save to database
            locationRepository.saveLocation(location, userId)
            
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Location worker failed", e)
            Result.retry()
        }
    }
    
    companion object {
        private const val TAG = "LocationWorker"
    }
}
```

#### 5. Schedule Periodic Work
```kotlin
// ui/screens/location/LocationViewModel.kt
@HiltViewModel
class LocationViewModel @Inject constructor(
    private val workManager: WorkManager,
    private val userPreferences: UserPreferences
) : ViewModel() {
    
    fun startLocationTracking(intervalMinutes: Long = 15) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val locationWork = PeriodicWorkRequestBuilder<LocationWorker>(
            intervalMinutes, TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()
        
        workManager.enqueueUniquePeriodicWork(
            "location_tracking",
            ExistingPeriodicWorkPolicy.KEEP,
            locationWork
        )
        
        viewModelScope.launch {
            userPreferences.setLocationSharingEnabled(true)
        }
    }
    
    fun stopLocationTracking() {
        workManager.cancelUniqueWork("location_tracking")
        
        viewModelScope.launch {
            userPreferences.setLocationSharingEnabled(false)
        }
    }
}
```

---

## 3️⃣ Camera

### **Current: Capacitor Camera**

**React/TypeScript:**
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    resultType: CameraResultType.Uri,
    quality: 90
  });
  
  return image.webPath;
};
```

### **Native: CameraX**

**Kotlin:**

#### 1. Add Dependencies
```kotlin
// app/build.gradle.kts
dependencies {
    implementation("androidx.camera:camera-camera2:1.3.1")
    implementation("androidx.camera:camera-lifecycle:1.3.1")
    implementation("androidx.camera:camera-view:1.3.1")
}
```

#### 2. Request Permissions
```xml
<!-- app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera.any" />
```

#### 3. Create Camera Composable
```kotlin
// ui/components/camera/CameraPreview.kt
@Composable
fun CameraPreview(
    onImageCaptured: (Uri) -> Unit,
    onError: (Exception) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    
    val preview = remember { Preview.Builder().build() }
    val imageCapture = remember {
        ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
            .build()
    }
    
    val cameraSelector = remember {
        CameraSelector.DEFAULT_BACK_CAMERA
    }
    
    val cameraProviderFuture = remember {
        ProcessCameraProvider.getInstance(context)
    }
    
    val previewView = remember { PreviewView(context) }
    
    LaunchedEffect(cameraProviderFuture) {
        val cameraProvider = cameraProviderFuture.await()
        
        try {
            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(
                lifecycleOwner,
                cameraSelector,
                preview,
                imageCapture
            )
            preview.setSurfaceProvider(previewView.surfaceProvider)
        } catch (e: Exception) {
            onError(e)
        }
    }
    
    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { previewView },
            modifier = Modifier.fillMaxSize()
        )
        
        // Capture button
        FloatingActionButton(
            onClick = {
                captureImage(imageCapture, context, onImageCaptured, onError)
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp)
        ) {
            Icon(Icons.Default.CameraAlt, contentDescription = "Capture")
        }
    }
}

private fun captureImage(
    imageCapture: ImageCapture,
    context: Context,
    onImageCaptured: (Uri) -> Unit,
    onError: (Exception) -> Unit
) {
    val photoFile = File(
        context.getExternalFilesDir(Environment.DIRECTORY_PICTURES),
        "IMG_${System.currentTimeMillis()}.jpg"
    )
    
    val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()
    
    imageCapture.takePicture(
        outputOptions,
        ContextCompat.getMainExecutor(context),
        object : ImageCapture.OnImageSavedCallback {
            override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                onImageCaptured(Uri.fromFile(photoFile))
            }
            
            override fun onError(exception: ImageCaptureException) {
                onError(exception)
            }
        }
    )
}
```

---

## 4️⃣ Preferences/Storage

### **Current: Capacitor Preferences**

**React/TypeScript:**
```typescript
import { Preferences } from '@capacitor/preferences';

await Preferences.set({ key: 'user_id', value: userId });
const { value } = await Preferences.get({ key: 'user_id' });
```

### **Native: DataStore**

**Kotlin:**

#### 1. Add Dependencies
```kotlin
// app/build.gradle.kts
dependencies {
    implementation("androidx.datastore:datastore-preferences:1.0.0")
}
```

#### 2. Create DataStore Repository
```kotlin
// core/data/local/UserPreferences.kt
@Singleton
class UserPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val Context.dataStore by preferencesDataStore(name = "chatr_preferences")
    
    private object Keys {
        val USER_ID = stringPreferencesKey("user_id")
        val LOCATION_SHARING_ENABLED = booleanPreferencesKey("location_sharing_enabled")
        val NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
    }
    
    suspend fun setUserId(userId: String) {
        context.dataStore.edit { preferences ->
            preferences[Keys.USER_ID] = userId
        }
    }
    
    fun getUserId(): Flow<String?> = context.dataStore.data
        .map { preferences -> preferences[Keys.USER_ID] }
    
    suspend fun getUserIdOnce(): String? {
        return context.dataStore.data.first()[Keys.USER_ID]
    }
    
    suspend fun setLocationSharingEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[Keys.LOCATION_SHARING_ENABLED] = enabled
        }
    }
    
    fun isLocationSharingEnabled(): Flow<Boolean> = context.dataStore.data
        .map { preferences -> preferences[Keys.LOCATION_SHARING_ENABLED] ?: false }
    
    suspend fun clearAll() {
        context.dataStore.edit { it.clear() }
    }
}
```

#### 3. Usage in ViewModel
```kotlin
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val userPreferences: UserPreferences
) : ViewModel() {
    
    val locationSharingEnabled: StateFlow<Boolean> = userPreferences
        .isLocationSharingEnabled()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = false
        )
    
    fun toggleLocationSharing(enabled: Boolean) {
        viewModelScope.launch {
            userPreferences.setLocationSharingEnabled(enabled)
        }
    }
}
```

---

## 5️⃣ Contacts

### **Current: Capacitor Contacts**

**React/TypeScript:**
```typescript
import { Contacts } from '@capacitor-community/contacts';

const result = await Contacts.getContacts();
const contacts = result.contacts;
```

### **Native: ContactsContract**

**Kotlin:**

#### 1. Request Permissions
```xml
<!-- app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.READ_CONTACTS" />
```

#### 2. Create Contacts Repository
```kotlin
// core/data/contacts/ContactsRepository.kt
@Singleton
class ContactsRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    @RequiresPermission(Manifest.permission.READ_CONTACTS)
    fun getAllContacts(): List<Contact> {
        val contacts = mutableListOf<Contact>()
        
        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER,
            ContactsContract.CommonDataKinds.Phone.PHOTO_URI
        )
        
        context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            projection,
            null,
            null,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
        )?.use { cursor ->
            val idIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
            val nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numberIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            val photoIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.PHOTO_URI)
            
            while (cursor.moveToNext()) {
                val id = cursor.getString(idIndex)
                val name = cursor.getString(nameIndex)
                val number = cursor.getString(numberIndex)
                val photoUri = cursor.getString(photoIndex)
                
                contacts.add(
                    Contact(
                        id = id,
                        displayName = name,
                        phoneNumber = number.normalizePhoneNumber(),
                        photoUri = photoUri
                    )
                )
            }
        }
        
        return contacts.distinctBy { it.phoneNumber }
    }
    
    private fun String.normalizePhoneNumber(): String {
        // Use libphonenumber-android for E.164 normalization
        return this.replace(Regex("[^0-9+]"), "")
    }
}

data class Contact(
    val id: String,
    val displayName: String,
    val phoneNumber: String,
    val photoUri: String?
)
```

---

## ⚙️ Summary Table

| Feature | Capacitor Plugin | Native SDK | Migration Complexity |
|---------|-----------------|------------|---------------------|
| **Push Notifications** | `@capacitor/push-notifications` | `FirebaseMessagingService` | ⭐⭐ Medium |
| **Geolocation** | `@capacitor/geolocation` | `FusedLocationProviderClient` + `WorkManager` | ⭐⭐ Medium |
| **Camera** | `@capacitor/camera` | `CameraX` | ⭐⭐⭐ High |
| **Preferences** | `@capacitor/preferences` | `DataStore` | ⭐ Low |
| **Contacts** | `@capacitor-community/contacts` | `ContactsContract` | ⭐⭐ Medium |
| **Filesystem** | `@capacitor/filesystem` | `java.io.File` | ⭐ Low |
| **Network** | `@capacitor/network` | `ConnectivityManager` | ⭐ Low |
| **Haptics** | `@capacitor/haptics` | `Vibrator` | ⭐ Low |
| **Share** | `@capacitor/share` | `ShareCompat` | ⭐ Low |

---

**Next Steps:**
1. Start with low-complexity migrations (Preferences, Haptics)
2. Move to medium complexity (Push Notifications, Geolocation)
3. Tackle high-complexity last (Camera, Bluetooth)

**See:** [MIGRATION_BLUEPRINT.md](./MIGRATION_BLUEPRINT.md) for overall strategy.
