# Chatr Mini Apps - Indian Web Apps Integration

## Overview
Chatr Mini Apps brings 20 popular Indian web applications directly into the Chatr ecosystem, allowing users to access, use, and maintain sessions across their favorite services without leaving Chatr.

## Integrated Apps

### Food & Delivery
1. **Zomato** - Food delivery & dining discovery
   - URL: https://www.zomato.com
   - Brand Color: #E23744

2. **Swiggy** - Quick food delivery & Instamart
   - URL: https://www.swiggy.com
   - Brand Color: #FC8019

3. **Dunzo** - Quick delivery & errands
   - URL: https://www.dunzo.com
   - Brand Color: #FF0000

### Payments & Finance
4. **Paytm** - Payments, recharge & wallet
   - URL: https://www.paytm.com
   - Brand Color: #00B9F5

5. **PhonePe** - UPI & financial services
   - URL: https://www.phonepe.com
   - Brand Color: #5F259F

6. **Groww** - Stocks & mutual funds
   - URL: https://www.groww.in
   - Brand Color: #00D09C

7. **Zerodha Kite** - Stock trading platform
   - URL: https://kite.zerodha.com
   - Brand Color: #387ED1

### Shopping & E-commerce
8. **Meesho** - Social commerce marketplace
   - URL: https://www.meesho.com
   - Brand Color: #9F2089

9. **Flipkart** - Online shopping
   - URL: https://www.flipkart.com
   - Brand Color: #2874F0

10. **Myntra** - Fashion & lifestyle
    - URL: https://www.myntra.com
    - Brand Color: #FF3F6C

11. **Tata Cliq** - Premium e-commerce
    - URL: https://www.tatacliq.com
    - Brand Color: #D41F3D

### Entertainment
12. **JioSaavn** - Music streaming
    - URL: https://www.jiosaavn.com
    - Brand Color: #2BC5B4

13. **Gaana** - Songs & podcasts
    - URL: https://www.gaana.com
    - Brand Color: #E8352E

14. **Hotstar** - Streaming & live sports
    - URL: https://www.hotstar.com
    - Brand Color: #0F1014

### Travel & Booking
15. **IRCTC** - Train booking portal
    - URL: https://www.irctc.co.in
    - Brand Color: #C44B4B

16. **RedBus** - Bus ticket booking
    - URL: https://www.redbus.in
    - Brand Color: #D84E55

17. **OYO Rooms** - Hotel booking
    - URL: https://www.oyorooms.com
    - Brand Color: #EE2E24

### Jobs & Learning
18. **Naukri** - Job search platform
    - URL: https://www.naukri.com
    - Brand Color: #4A90E2

19. **Internshala** - Internships & jobs
    - URL: https://www.internshala.com
    - Brand Color: #00A5EC

### Health & Wellness
20. **HealthifyMe** - Fitness & diet tracking
    - URL: https://www.healthifyme.com
    - Brand Color: #7CB342

## Features

### 1. WebView Integration
- Apps open in a native-like fullscreen WebView
- Brand-colored toolbar for each app
- Seamless transitions between Chatr and apps

### 2. Session Management
- Automatic session tracking when apps are opened
- Session data persistence across app switches
- Login state preservation (where supported by the web app)

### 3. Usage Analytics
- Tracks time spent in each app
- Records session start and end times
- Calculates usage duration automatically
- Available in App Statistics dashboard

### 4. Offline Caching
- Apps list cached locally for offline access
- Recently used apps always available
- Smooth experience even with poor connectivity

### 5. App Management
- Install/Uninstall functionality
- Recently used apps tracking
- App categorization (food, payments, shopping, etc.)
- Search and filter capabilities

## Technical Implementation

### Database Tables
- `mini_apps` - Stores app metadata
- `user_installed_apps` - Tracks user installations
- `app_usage_sessions` - Records usage sessions
- `app_session_data` - Stores session cookies/tokens
- `app_categories` - Categorizes apps

### Key Components
- **MiniAppsStore** - Main marketplace UI
- **AppStatistics** - Usage analytics dashboard
- **useWebViewManager** - Enhanced WebView handling
- **useAppUsageTracking** - Session tracking hook

### App-Specific Configurations
Each app has custom configuration:
- Brand colors for toolbar
- URL bar hiding preferences
- Zoom settings
- Session persistence options

## User Journey

1. **Browse** - Users browse available apps in the marketplace
2. **Install** - One-tap installation to user's app library
3. **Open** - Apps open in fullscreen WebView
4. **Use** - Users interact with the web app normally
5. **Track** - Session duration automatically tracked
6. **Close** - Session saved for next time
7. **Analytics** - View usage stats in App Statistics

## Benefits

### For Users
- Single ecosystem for all favorite apps
- Unified login management
- Usage insights and analytics
- Quick app switching
- Data synchronization

### For Chatr Platform
- Increased user engagement
- Rich usage data
- Ecosystem stickiness
- Monetization opportunities
- User retention

## Future Enhancements

1. **Deep Linking** - Direct links to specific app sections
2. **Push Notifications** - App-specific notifications
3. **Payment Integration** - Unified Chatr Coins payments
4. **Social Features** - Share within Chatr community
5. **Offline Mode** - Progressive Web App features
6. **App SDK** - For native mini-app development
7. **Cross-Device Sync** - Session sync across devices
8. **App Recommendations** - AI-powered suggestions

## Vision

**Make Chatr the third major app ecosystem after Android & iOS** by:
- Providing seamless access to 1 million+ web apps
- Creating a unified user experience
- Maintaining session persistence
- Building a super app ecosystem
- Empowering users with analytics
- Enabling cross-app interactions

## Getting Started

1. Navigate to Mini Apps from home screen
2. Browse or search for apps
3. Tap "GET" to install an app
4. Tap "OPEN" to launch the app
5. View your usage in "Stats" button
6. Manage installed apps from "My Apps" section

## Support

For issues or questions:
- Check app compatibility
- Clear app data if login issues occur
- Report bugs through Chatr support
- Request new apps through "Submit App"
