# Chatr+ 💬

Fast, simple, and secure chat application with Firebase authentication, real-time chat persistence, and push notifications. Built as a Progressive Web App (PWA) with full Android support.

## 🚀 Features

### Core Features
- ✅ **Firebase Authentication** - Google Sign-In integration
- ✅ **Real-time Chat** - Cloud Firestore with live updates
- ✅ **Push Notifications** - Firebase Cloud Messaging (FCM)
- ✅ **PWA-Compliant** - Installable on any device
- ✅ **Offline Support** - Service Worker caching + Firestore offline
- ✅ **Android Ready** - Full Capacitor integration
- ✅ **Modern UI** - Material Design with purple theme
- ✅ **Secure** - Firestore security rules + authentication
- ✅ **Fast** - Optimized performance + lazy loading
- ✅ **Responsive** - Works on all screen sizes

## 📦 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Mobile**: Capacitor 7
- **UI**: Tailwind CSS + Radix UI + shadcn/ui
- **Authentication**: Firebase Auth (Google Sign-In)
- **Database**: Cloud Firestore (real-time)
- **Push**: Firebase Cloud Messaging (FCM)
- **Backend**: Supabase (Lovable Cloud) + Firebase
- **State**: TanStack Query

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd chatr-plus
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase** (IMPORTANT)

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

The Firebase config in `src/firebase.ts` is already set up with the project credentials. For production, you should:

- Enable **Google Authentication** in Firebase Console
- Set up **Cloud Firestore** database
- Enable **Cloud Messaging** for push notifications
- Deploy **Firestore security rules** from `firestore.rules`

4. **Run development server**
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing `chatr-91067`)
3. Register your web app

### 2. Enable Authentication

1. Go to **Authentication** → **Sign-in method**
2. Enable **Google** sign-in provider
3. Add authorized domains (your Lovable preview URL + deployed domain)

### 3. Create Firestore Database

1. Go to **Firestore Database**
2. Click **Create Database**
3. Start in **test mode** (or use security rules from `firestore.rules`)
4. Select a region (e.g., `us-central1`)

### 4. Deploy Security Rules

Copy the contents of `firestore.rules` and paste into:
- **Firestore Database** → **Rules** tab

### 5. Enable Cloud Messaging (Push Notifications)

1. Go to **Project Settings** → **Cloud Messaging**
2. Under **Web Push certificates**, click **Generate key pair**
3. Copy the VAPID key
4. Add to `.env.local`:
```bash
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### 6. Configure Firebase in Code

The Firebase configuration in `src/firebase.ts` uses:
```typescript
apiKey: "AIzaSyDUUbQlOmkHsrEyMw9AmQBXbjNx11iM7w4"
projectId: "chatr-91067"
// ... other config
```

**For production:** Update these values with your own Firebase project credentials.

### Build for Production

```bash
npm run build
```

## 📱 Mobile Development

### Android Setup

1. **Add Android platform**
```bash
npx cap add android
```

2. **Sync project**
```bash
npm run build
npx cap sync android
```

3. **Open in Android Studio**
```bash
npx cap open android
```

4. **Run on device/emulator**
```bash
npx cap run android
```

### iOS Setup

1. **Add iOS platform**
```bash
npx cap add ios
```

2. **Sync project**
```bash
npm run build
npx cap sync ios
```

3. **Open in Xcode**
```bash
npx cap open ios
```

## 🌐 PWA Installation

The app can be installed directly from the browser:

### Desktop
1. Visit the app URL
2. Click the install icon in the address bar
3. Click "Install"

### Mobile
1. Visit the app URL
2. Tap the share button
3. Select "Add to Home Screen"

## 📋 App Configuration

**App ID**: `com.chatr.app`  
**App Name**: Chatr+  
**Theme Color**: `#6200ee` (Purple)  
**Background**: `#ffffff` (White)

## 🔧 Key Files

- `capacitor.config.ts` - Capacitor configuration
- `public/manifest.json` - PWA manifest
- `public/sw.js` - Service worker
- `vite.config.ts` - Vite configuration
- `src/main.tsx` - App entry point

## 📊 PWA Compliance

This app is designed to score 100/100 on PWA Builder:

✅ Web App Manifest  
✅ Service Worker  
✅ HTTPS (in production)  
✅ Responsive Design  
✅ Offline Support  
✅ Install Prompt  

Test with: [PWA Builder](https://www.pwabuilder.com/)

## 🏪 Play Store Submission

### Required Assets

All assets are located in `/public` and `/store/metadata`:

- `icons/icon-192x192.png` - App icon (192x192)
- `icons/icon-512x512.png` - App icon (512x512)
- `assets/screenshots/` - Store screenshots
- `store/metadata/android/short_description.txt`
- `store/metadata/android/full_description.txt`

### Submission Steps

1. Build the Android app
```bash
npm run build
npx cap sync android
```

2. Generate signed APK/AAB in Android Studio

3. Upload to Google Play Console with:
   - App bundle (AAB)
   - Screenshots from `/assets/screenshots/`
   - Descriptions from `/store/metadata/android/`
   - Icon from `/icons/icon-512x512.png`

## 🧪 Testing

### PWA Testing
```bash
npm run build
npm run preview
```

### Mobile Testing
```bash
npx cap run android
npx cap run ios
```

## 📝 Environment Variables

Create a `.env` file (auto-generated by Lovable Cloud):

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

## 🔐 Security

- Row Level Security (RLS) enabled
- End-to-end message encryption
- Secure authentication
- HTTPS required in production

## 📞 Support

- **Email**: support@chatr.app
- **Website**: https://chatr.app
- **Issues**: GitHub Issues

## 📄 License

See LICENSE file for details.

## 🙏 Credits

Built with [Lovable](https://lovable.dev) - Ship your app in minutes

---

**Ready for deployment!** 🚀

Test PWA: https://www.pwabuilder.com/  
Test Android: `npx cap run android`  
Build: `npm run build`
