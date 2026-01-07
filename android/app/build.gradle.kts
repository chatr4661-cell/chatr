plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
}

android {
    namespace = "com.chatr.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.chatr.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Capacitor configuration
        manifestPlaceholders["appAuthRedirectScheme"] = "com.chatr.app"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug") // TODO: Use release keystore
        }
        debug {
            isMinifyEnabled = false
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Capacitor Core
    implementation("com.capacitorjs:core:6.0.0")
    
    // AndroidX Core
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.activity:activity-ktx:1.8.2")
    implementation("androidx.fragment:fragment-ktx:1.6.2")
    
    // Material Design
    implementation("com.google.android.material:material:1.11.0")
    
    // Splash Screen
    implementation("androidx.core:core-splashscreen:1.0.1")
    
    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")
    
    // Firebase
    implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("com.google.firebase:firebase-analytics-ktx")
    implementation("com.google.firebase:firebase-crashlytics-ktx")
    
    // WorkManager for background tasks
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    
    // Glide for image loading
    implementation("com.github.bumptech.glide:glide:4.16.0")
    
    // Capacitor Plugins
    implementation("com.capacitorjs:push-notifications:6.0.0")
    implementation("com.capacitorjs:splash-screen:6.0.0")
    implementation("com.capacitorjs:status-bar:6.0.0")
    implementation("com.capacitorjs:keyboard:6.0.0")
    implementation("com.capacitorjs:haptics:6.0.0")
    implementation("com.capacitorjs:camera:6.0.0")
    implementation("com.capacitorjs:filesystem:6.0.0")
    implementation("com.capacitorjs:geolocation:6.0.0")
    implementation("com.capacitorjs:network:6.0.0")
    implementation("com.capacitorjs:preferences:6.0.0")
    implementation("com.capacitorjs:app:6.0.0")
    implementation("com.capacitorjs:browser:6.0.0")
    implementation("com.capacitorjs:share:6.0.0")
    implementation("com.capacitorjs:toast:6.0.0")
    implementation("com.capacitorjs:clipboard:6.0.0")
    implementation("com.capacitorjs:device:6.0.0")
    implementation("com.capacitorjs:local-notifications:6.0.0")
    
    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
