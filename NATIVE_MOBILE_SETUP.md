# Native Mobile App Setup Guide

Your Chatr app is now configured as a **native mobile app** with full Bluetooth support for iOS and Android! 🎉

## What's Been Set Up

✅ Capacitor installed and configured
✅ Bluetooth LE plugin added (@capacitor-community/bluetooth-le)
✅ iOS permissions configured (Info.plist)
✅ Android permissions configured (AndroidManifest.xml)
✅ Hot-reload enabled for faster development

## To Run on Your Device/Emulator

### Step 1: Export to GitHub
1. Click the **GitHub button** in the top right of Lovable
2. Transfer your project to your GitHub repository

### Step 2: Set Up Locally
Open your terminal and run:

```bash
# Clone your repository
git clone [your-github-repo-url]
cd chatr

# Install dependencies
npm install

# Add iOS platform (Mac with Xcode required)
npx cap add ios

# Add Android platform (Android Studio required)
npx cap add android

# Update native dependencies
npx cap update ios
npx cap update android

# Build the web app
npm run build

# Sync to native platforms
npx cap sync
```

### Step 3: Run the App

**For iOS (requires Mac with Xcode):**
```bash
npx cap run ios
```
Or open in Xcode:
```bash
npx cap open ios
```

**For Android (requires Android Studio):**
```bash
npx cap run android
```
Or open in Android Studio:
```bash
npx cap open android
```

## Bluetooth Features

Once running on a native app:
- ✅ Full Bluetooth LE support on iOS and Android
- ✅ Scan for nearby Chatr users
- ✅ Send messages without internet
- ✅ Mesh network support
- ✅ Offline message queue

## Development Tips

1. **Hot Reload**: Your app will auto-reload from the Lovable sandbox during development
2. **After Code Changes**: Run `npx cap sync` after pulling new changes from GitHub
3. **Testing**: Use real devices for best Bluetooth testing experience
4. **Permissions**: The app will request Bluetooth permissions on first launch

## Need Help?

Check out the [Capacitor documentation](https://capacitorjs.com/docs) or the [Lovable blog post on native mobile development](https://docs.lovable.dev).

## Next Steps

1. Export to GitHub
2. Follow the setup steps above
3. Test Bluetooth features on real devices
4. Publish to App Store and Google Play when ready!
