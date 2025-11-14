# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep data classes
-keep class com.chatr.app.data.models.** { *; }

# Keep Retrofit interfaces
-keep interface com.chatr.app.data.api.** { *; }

# Gson specific classes
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# WebRTC
-keep class org.webrtc.** { *; }

# Supabase
-keep class io.github.jan.supabase.** { *; }

# Ktor
-keep class io.ktor.** { *; }
