# CHATR ProGuard Rules - Production Grade

# ============= Kotlin Serialization =============
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}

-keep,includedescriptorclasses class com.chatr.app.**$$serializer { *; }
-keepclassmembers class com.chatr.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.chatr.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# ============= Supabase =============
-keep class io.github.jan.supabase.** { *; }
-dontwarn io.github.jan.supabase.**

# ============= Ktor =============
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**

# ============= WebRTC =============
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**
-keep class io.getstream.webrtc.** { *; }

# ============= Room =============
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# ============= Firebase =============
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# ============= Hilt =============
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ComponentSupplier { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }

# ============= OkHttp =============
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ============= Compose =============
-dontwarn androidx.compose.**

# ============= Domain Models =============
-keep class com.chatr.app.domain.model.** { *; }
-keep class com.chatr.app.data.remote.dto.** { *; }
-keep class com.chatr.app.data.local.entity.** { *; }

# ============= Telecom =============
-keep class com.chatr.app.calling.service.** { *; }
-keep class * extends android.telecom.ConnectionService { *; }
-keep class * extends android.telecom.Connection { *; }

# ============= Services =============
-keep class com.chatr.app.**.service.** { *; }
-keep class * extends android.app.Service { *; }
-keep class * extends androidx.work.Worker { *; }
-keep class * extends androidx.work.ListenableWorker { *; }

# ============= Enums =============
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ============= Parcelable =============
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# ============= Coroutines =============
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# ============= Debugging =============
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
