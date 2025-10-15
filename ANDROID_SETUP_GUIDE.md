# 📱 Complete Android App Setup Guide for Chatr+

**Version**: 1.0  
**Last Updated**: October 2025  
**Target**: Google Play Store Publication

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Windows/Mac/Linux** computer with admin access
- [ ] **Node.js 18+** installed (`node --version`)
- [ ] **Git** installed and GitHub account connected
- [ ] **Google Play Developer Account** ($25 one-time fee)
- [ ] **4GB+ RAM** available
- [ ] **10GB+ disk space** available
- [ ] **Android device or emulator** for testing
- [ ] **Stable internet connection** for downloads

---

## 🚀 PHASE 1: Development Environment Setup

### Step 1.1: Install Java JDK 17

**Windows:**
```bash
# Download from: https://www.oracle.com/java/technologies/downloads/#java17
# Or use Chocolatey:
choco install openjdk17

# Verify installation:
java -version
```

**Mac:**
```bash
# Using Homebrew:
brew install openjdk@17

# Add to PATH (add to ~/.zshrc or ~/.bash_profile):
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"

# Verify installation:
java -version
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install openjdk-17-jdk

# Verify installation:
java -version
```

### Step 1.2: Install Android Studio

1. **Download Android Studio**: 
   - Go to https://developer.android.com/studio
   - Download for your platform (Windows/Mac/Linux)
   - File size: ~1GB

2. **Install Android Studio**:
   - **Windows**: Run the `.exe` installer
   - **Mac**: Drag to Applications folder
   - **Linux**: Extract and run `studio.sh`

3. **Complete Setup Wizard**:
   - Choose "Standard" installation
   - Accept all licenses
   - Wait for SDK downloads (~3GB)
   - This will take 15-30 minutes

4. **Configure Android SDK**:
   ```
   Tools > SDK Manager
   - Android SDK Platform 33 (Android 13)
   - Android SDK Platform 34 (Android 14) 
   - Android SDK Build-Tools 34.0.0
   - Android Emulator
   - Android SDK Platform-Tools
   ```

5. **Set Environment Variables**:

   **Windows (PowerShell as Admin):**
   ```powershell
   [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\[YourUsername]\AppData\Local\Android\Sdk', 'User')
   [System.Environment]::SetEnvironmentVariable('Path', $env:Path + ';C:\Users\[YourUsername]\AppData\Local\Android\Sdk\platform-tools', 'User')
   ```

   **Mac/Linux (add to ~/.zshrc or ~/.bashrc):**
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   ```

6. **Verify Setup**:
   ```bash
   adb version
   # Should show: Android Debug Bridge version X.X.X
   ```

### Step 1.3: Export Project from Lovable

1. In Lovable, click **GitHub** button (top right)
2. Click **Connect to GitHub** (if not connected)
3. Click **Create Repository**
4. Name it: `chatr-mobile`
5. Wait for export to complete

### Step 1.4: Clone Project Locally

```bash
# Clone from GitHub
git clone https://github.com/[your-username]/chatr-mobile.git
cd chatr-mobile

# Install dependencies
npm install

# Build the web app
npm run build
```

---

## 🔧 PHASE 2: Capacitor Android Setup

### Step 2.1: Add Android Platform

```bash
# Add Android to Capacitor
npx cap add android

# This creates android/ folder with:
# - app/src/main/
# - build.gradle
# - AndroidManifest.xml
```

### Step 2.2: Update capacitor.config.ts

**IMPORTANT**: Remove development server URL before building for production!

```typescript
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'chat.chatr.app', // CHANGED for production
  appName: 'Chatr',
  webDir: 'dist',
  
  // REMOVE this for production builds:
  // server: {
  //   url: 'https://...',
  //   cleartext: true
  // },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0EA5E9',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#FFFFFF'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
```

### Step 2.3: Sync Project

```bash
# Sync web assets to Android
npx cap sync android

# This copies dist/ folder to android/app/src/main/assets/public/
```

### Step 2.4: Update AndroidManifest.xml

Open `android/app/src/main/AndroidManifest.xml` and update:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="chat.chatr.app">

    <!-- Internet Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Camera & Media -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    
    <!-- Audio/Video Recording -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    
    <!-- Notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- Contacts -->
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    
    <!-- Location (for healthcare features) -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    
    <!-- Vibration for notifications -->
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:label="@string/title_activity_main"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:exported="true">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- Deep Links -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="chatr.chat" />
                <data android:scheme="chatr" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 🎨 PHASE 3: App Icons & Branding

### Step 3.1: Prepare Icon Assets

You need a **512x512px PNG** with transparent background.

**Icon Requirements:**
- Size: 512x512px minimum
- Format: PNG with transparency
- Design: Simple, recognizable at small sizes
- Padding: 10-15% safe area from edges

### Step 3.2: Generate Icon Set

**Option A: Use Android Asset Studio (Recommended)**

1. Go to: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload your 512x512 PNG
3. Configure:
   - Name: `ic_launcher`
   - Shape: Circle (recommended)
   - Background: #0EA5E9 (Chatr blue)
4. Click **Download** (.zip file)
5. Extract and copy contents to `android/app/src/main/res/`

**Option B: Manual Creation**

Create these files in `android/app/src/main/res/`:

```
res/
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_round.png (48x48)
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_round.png (72x72)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_round.png (96x96)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_round.png (144x144)
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    └── ic_launcher_round.png (192x192)
```

### Step 3.3: Add Splash Screen

Create `android/app/src/main/res/drawable/splash.png`:
- Size: 2048x2048px
- Center logo on colored background
- Export as PNG

---

## 🔐 PHASE 4: App Signing (CRITICAL)

### Step 4.1: Generate Keystore

```bash
# Navigate to android/app/
cd android/app

# Generate keystore (answer all prompts)
keytool -genkey -v -keystore chatr-release-key.keystore \
  -alias chatr \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Example answers:
# Password: [create strong password]
# First and Last Name: Chatr Development
# Organization: Chatr
# City: Your City
# State: Your State
# Country Code: US
```

**⚠️ CRITICAL: Store these safely!**
- Keystore file: `chatr-release-key.keystore`
- Password
- Alias: `chatr`

If you lose these, you CANNOT update your app on Play Store!

### Step 4.2: Configure Signing

Create `android/key.properties`:

```properties
storePassword=[YOUR_STORE_PASSWORD]
keyPassword=[YOUR_KEY_PASSWORD]
keyAlias=chatr
storeFile=chatr-release-key.keystore
```

**⚠️ Add to .gitignore:**
```bash
echo "android/app/chatr-release-key.keystore" >> .gitignore
echo "android/key.properties" >> .gitignore
```

### Step 4.3: Update build.gradle

Edit `android/app/build.gradle`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "chat.chatr.app"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1  // Increment for each release
        versionName "1.0.0"  // Semantic versioning
    }

    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

---

## 🧪 PHASE 5: Testing

### Step 5.1: Test on Emulator

```bash
# Open Android Studio
npx cap open android

# Create emulator:
# Tools > Device Manager > Create Virtual Device
# Select: Pixel 6 Pro
# System Image: Android 13 (API 33)
# Finish

# Run app:
# Click green "Run" button or Shift+F10
```

### Step 5.2: Test on Physical Device

```bash
# Enable Developer Mode on Android:
# Settings > About Phone > Tap "Build Number" 7 times

# Enable USB Debugging:
# Settings > Developer Options > USB Debugging: ON

# Connect via USB
# Run:
npx cap run android --target [device-id]

# Or use Android Studio: Run > Select Device
```

### Step 5.3: Test Checklist

Test ALL of these:

- [ ] App installs without errors
- [ ] Splash screen shows
- [ ] Login/signup works
- [ ] Messaging works
- [ ] Voice calls connect
- [ ] Video calls connect
- [ ] Camera access works
- [ ] File uploads work
- [ ] Notifications appear
- [ ] App works offline
- [ ] Deep links work
- [ ] Back button navigation works
- [ ] App doesn't crash
- [ ] Memory usage < 150MB
- [ ] No ANR errors

---

## 📦 PHASE 6: Build Release AAB

### Step 6.1: Prepare for Release

```bash
# 1. Update version in android/app/build.gradle
versionCode 1
versionName "1.0.0"

# 2. Remove development URLs from capacitor.config.ts
# 3. Build web assets
npm run build

# 4. Sync to Android
npx cap sync android
```

### Step 6.2: Build AAB (Android App Bundle)

```bash
cd android

# Build release AAB
./gradlew bundleRelease

# Output location:
# android/app/build/outputs/bundle/release/app-release.aab

# File size should be: 15-30MB
```

### Step 6.3: Test AAB Locally

```bash
# Install bundletool
# Download from: https://github.com/google/bundletool/releases

# Generate APKs from AAB
java -jar bundletool.jar build-apks \
  --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=chatr.apks \
  --ks=app/chatr-release-key.keystore \
  --ks-key-alias=chatr

# Install on connected device
java -jar bundletool.jar install-apks --apks=chatr.apks
```

---

## 🏪 PHASE 7: Google Play Console Setup

### Step 7.1: Create Developer Account

1. Go to: https://play.google.com/console
2. Sign in with Google account
3. Pay **$25** registration fee
4. Complete identity verification
5. Accept agreements

### Step 7.2: Create App

1. Click **Create App**
2. Details:
   - **App name**: Chatr - Communication Hub
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
   - **Category**: Communication
3. Create app

### Step 7.3: Set Up App Content

**Store Listing:**

- **App name**: Chatr - Communication Hub
- **Short description** (80 chars max):
  ```
  All-in-one messaging, calls, health, and community platform
  ```

- **Full description** (4000 chars max):
  ```
  Chatr+ is your complete communication ecosystem combining messaging, video calls, health management, and community features.

  📱 MESSAGING & CALLS
  • Real-time messaging with friends and family
  • HD voice and video calls
  • Group chats with unlimited participants
  • Stories that disappear after 24 hours
  • Share photos, videos, and files

  🏥 HEALTH HUB
  • AI-powered health assistant
  • Digital health passport with QR code
  • Store and manage lab reports
  • Medication reminders
  • Track wellness and fitness goals

  👥 COMMUNITY
  • Join communities based on interests
  • Share and discover stories
  • Connect with like-minded people
  • Participate in challenges

  🎯 MINI APPS
  • Discover and install useful mini apps
  • Extend your Chatr+ experience
  • Everything in one place

  💎 REWARDS
  • Earn points for daily activity
  • Redeem points for services
  • Daily login bonuses
  • Track your streak

  Download Chatr+ now and experience the future of communication!
  ```

- **App icon**: 512x512 PNG (high-res)
- **Feature graphic**: 1024x500 PNG
- **Phone screenshots**: 
  - Minimum 2, maximum 8
  - Size: 1080x1920 or 1440x2560
  - Show: Chat, calls, health hub, communities, mini apps

**Privacy Policy:**
- URL: https://chatr.chat/privacy
- Must be hosted and accessible

**App Category:**
- Primary: Communication
- Secondary: Social

**Contact Details:**
- Email: support@chatr.chat
- Phone: (optional)
- Website: https://chatr.chat

### Step 7.4: Upload AAB

1. Go to **Production** > **Create new release**
2. Upload `app-release.aab`
3. Release name: `1.0.0 - Initial Release`
4. Release notes:
   ```
   Welcome to Chatr+ 1.0!

   ✨ Features:
   • Real-time messaging
   • Voice & video calls
   • Health Hub with AI assistant
   • Communities & stories
   • Points & rewards
   • Mini Apps Store

   This is our first release. We're excited to have you join us!
   ```

### Step 7.5: Content Rating

1. Go to **Content rating**
2. Select questionnaire: **Communication**
3. Answer questions honestly
4. Generate rating

### Step 7.6: Target Audience

- Target age: 13+
- Children directed: No
- Designed for children: No

### Step 7.7: Data Safety

Declare what data you collect:
- ✅ Location data (approximate)
- ✅ Personal info (name, email, phone)
- ✅ Photos and videos
- ✅ Audio files
- ✅ Health and fitness data
- ✅ Messages

Privacy policy link: https://chatr.chat/privacy

---

## 🚀 PHASE 8: Submit for Review

### Final Checklist:

- [ ] AAB uploaded
- [ ] Store listing complete
- [ ] Screenshots added (minimum 2)
- [ ] Privacy policy URL added
- [ ] Content rating completed
- [ ] Data safety filled
- [ ] Pricing: Free
- [ ] Countries: All (or specific)

### Submit:

1. Review all sections (green checkmarks)
2. Click **Review release**
3. Click **Start rollout to Production**
4. Confirm submission

---

## ⏱️ Review Timeline

- **Typical review time**: 3-7 days
- **Possible outcomes**:
  - ✅ **Approved**: App goes live within hours
  - ⚠️ **Changes requested**: Fix and resubmit
  - ❌ **Rejected**: Review policies, fix, resubmit

---

## 📊 Post-Launch

### Monitor

1. **Play Console** > **Dashboard**
   - Installs
   - Ratings & reviews
   - Crashes
   - ANRs

2. **Respond to reviews**
   - Thank positive reviews
   - Fix issues from negative reviews

3. **Update regularly**
   - Increment `versionCode` for each update
   - Update `versionName` (semantic versioning)

---

## 🆘 Troubleshooting

### Build Errors

**Error: "Could not find build tools"**
```bash
# Solution:
# Open Android Studio > SDK Manager
# Install Android SDK Build-Tools 34.0.0
```

**Error: "Keystore not found"**
```bash
# Solution:
# Verify path in key.properties
# Use absolute path if needed:
storeFile=/full/path/to/chatr-release-key.keystore
```

**Error: "Manifest merger failed"**
```bash
# Solution:
# Check for duplicate permissions in AndroidManifest.xml
# Remove duplicates
```

### Runtime Issues

**App crashes on startup**
```bash
# Check logs:
adb logcat | grep "AndroidRuntime"

# Common fix:
# Rebuild: npx cap sync android
```

**White screen after splash**
```bash
# Solution:
# Verify dist/ folder has content
npm run build
npx cap sync android
```

---

## 📞 Support

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Docs**: https://developer.android.com
- **Play Console Help**: https://support.google.com/googleplay/android-developer

---

**Ready to build your Android app? Follow this guide step-by-step!** 🚀
