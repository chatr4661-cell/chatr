import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import React, { Suspense, useEffect } from "react";
import { HelmetProvider } from 'react-helmet-async';
import ProtectedRoute from "./components/ProtectedRoute";
import { NativeAppProvider } from "./components/NativeAppProvider";
import { LocationProvider } from "./contexts/LocationContext";
import { registerServiceWorker } from "./utils/serviceWorkerRegistration";
import { setupNativeCallUI } from "./utils/nativeCallUI";
import { CrashlyticsErrorBoundary } from "./utils/crashlyticsErrorBoundary";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { initPerformanceOptimizations } from './utils/performanceOptimizations';
import { OfflineIndicator } from "./components/OfflineIndicator";
import { GlobalCallListener } from "./components/calling/GlobalCallListener";
import { GlobalNotificationListener } from "./components/GlobalNotificationListener";
import { CallProvider } from "./contexts/CallContext";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { AdminLayout } from "./components/AdminLayout";
import DesktopLayout from "./layouts/DesktopLayout";

// Import all lazy-loaded pages
import {
  PageLoader,
  Index, Auth, Home, Chat, Profile, Contacts, Calls, CallHistory, Notifications, Settings,
  GeoDiscovery, StarredMessages, GlobalContacts, ContactsPage, SmartInbox, Stories, Communities, CreateCommunity,
  WellnessTracking, HealthPassport, LabReports, MedicineReminders, BMICalculator, NutritionTracker, MentalHealth,
  HealthReminders, HealthRiskPredictions, SymptomCheckerPage, HealthWalletPage, TeleconsultationPage,
  MedicationInteractionsPage, HealthStreaksPage, ChronicVitalsPage, EmergencyButton, EmergencyServices,
  WellnessCircles, ExpertSessions, HealthHub, CareAccess, CommunitySpace,
  DoctorDetail, AddFamilyMember, MyAppointments, MedicineHubPage, MedicineSubscribePage, MedicineSubscriptionsPage,
  MedicineFamilyPage, MedicineVitalsPage, MedicinePrescriptionsPage, MedicineRemindersPage, MedicineRewardsPage,
  BookingPage, ProviderPortal, ProviderRegister, AlliedHealthcare, ProviderDetails, BookingTracking, ProviderDashboard, DoctorOnboarding,
  Marketplace, MarketplaceCheckout, OrderSuccessPage, ServiceListing,
  AIAgentsHub, AIAgentCreate, AIAgentChatNew, AIAgents, AIAgentChat, AIAssistant, AIBrowser, AIBrowserHome, AIBrowserView, AIChat, PrechuAI,
  YouthEngagement, YouthFeed, FameCam, FameLeaderboard, ChatrTutors,
  ChatrPoints, RewardShop, ChatrGrowth, AmbassadorProgram, Referrals, ChatrWallet, UserSubscription,
  ChatrPlus, ChatrPlusSearch, ChatrPlusSubscribe, ChatrPlusServiceDetail, ChatrPlusSellerRegistration,
  ChatrPlusSellerDashboard, ChatrPlusCategoryPage, ChatrPlusWallet,
  SellerPortal, SellerBookings, SellerServices, SellerAnalytics, SellerMessages, SellerSettings, SellerReviews, SellerPayouts, SellerSubscription, SellerSettlements,
  MiniAppsStore, AppStatistics, DeveloperPortal, MiniApps, ChatrOS, OSDetection, Launcher,
  ChatrWorld, ChatrGames, ChatrStudio, Capture,
  UniversalSearch, ChatrHome, ChatrResults,
  LocalJobs, JobDetail, LocalHealthcare, Geofences, GeofenceHistory, HomeServices, FoodOrdering, LocalDeals,
  RestaurantDetail, FoodCheckout, OrderTracking, OrderHistory,
  OfficialAccounts, QRPayment, QRLogin, KYCVerificationPage,
  Account, NotificationSettings, DeviceManagement, StealthMode, BluetoothTest, ChatrApp,
  About, Help, Contact, Privacy, Terms, PrivacyPolicy, Refund, Disclaimer, Download, Install, Onboarding, NotFound, JoinInvite, ChatrWeb, Community,
  DesktopChat, DesktopContacts, DesktopCalls,
  AdminDashboard, AdminUsers, AdminProviders, AdminAnalytics, AdminPayments, AdminPoints, AdminSettings, AdminAnnouncements,
  AdminDocuments, AdminDoctorApplications, FeatureBuilder, SchemaManager, KYCApprovals, OfficialAccountsManager, BroadcastManager,
  BrandPartnerships, AppApprovals, ChatrWorldAdmin, PaymentVerification,
  ProviderAppointments, ProviderServices, ProviderPayments,
  BusinessDashboard, BusinessOnboarding, BusinessInbox, CRMPage, BusinessAnalytics, BusinessTeam, BusinessSettings, BusinessCatalog, BusinessBroadcasts, BusinessGroups,
  VendorLogin, VendorRegister, VendorDashboard, VendorSettings, RestaurantMenu, RestaurantOrders, DealsManagement,
  DoctorAppointments, DoctorPatients, DoctorAnalytics, DoctorAvailability,
  CarePathDetail
} from './routes/lazyPages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchInterval: false,
    },
  },
});

// Check if on web subdomain
const isWebSubdomain = () => {
  const hostname = window.location.hostname;
  return hostname === 'web.chatr.chat' || 
         hostname.startsWith('web.') || 
         new URLSearchParams(window.location.search).get('subdomain') === 'web';
};

// Subdomain redirect component
const SubdomainRedirect = () => {
  const redirectInfo = React.useMemo(() => {
    const hostname = window.location.hostname;
    if (hostname.startsWith('seller.') && window.location.pathname === '/') {
      return { to: '/seller/portal', type: 'seller' };
    }
    if (isWebSubdomain() && window.location.pathname === '/') {
      return { to: '/web', type: 'web' };
    }
    return null;
  }, []);

  if (redirectInfo) {
    return <Navigate to={redirectInfo.to} replace />;
  }

  return <Suspense fallback={<PageLoader />}><Index /></Suspense>;
};

// Preload critical routes after initial render
const preloadCriticalRoutes = () => {
  setTimeout(() => {
    import('@/pages/Home');
    import('@/pages/Chat');
    import('@/pages/Calls');
  }, 1000);
};

const App = () => {
  useEffect(() => {
    let registered = false;
    
    const initServiceWorker = async () => {
      if (registered) return;
      if ('serviceWorker' in navigator) {
        const existing = await navigator.serviceWorker.getRegistration();
        if (existing) {
          registered = true;
          return;
        }
      }
      const registration = await registerServiceWorker();
      if (registration) registered = true;
    };
    
    initServiceWorker();
    preloadCriticalRoutes();
  }, []);

  useEffect(() => {
    setupNativeCallUI().catch(() => {});
  }, []);

  // Wrapper for Suspense
  const S = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  );

  // Protected route with Suspense
  const PS = ({ children }: { children: React.ReactNode }) => (
    <ProtectedRoute><S>{children}</S></ProtectedRoute>
  );

  return (
    <CrashlyticsErrorBoundary>
    <GlobalErrorBoundary>
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <LocationProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NativeAppProvider>
            <CallProvider>
            <OfflineIndicator />
            <GlobalCallListener />
            <GlobalNotificationListener />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<SubdomainRedirect />} />
              <Route path="/launcher" element={<PS><Launcher /></PS>} />
              <Route path="/auth" element={<S><Auth /></S>} />
              <Route path="/download" element={<S><Download /></S>} />
              <Route path="/install" element={<S><Install /></S>} />
              <Route path="/onboarding" element={<S><Onboarding /></S>} />
              <Route path="/about" element={<S><About /></S>} />
              <Route path="/help" element={<S><Help /></S>} />
              <Route path="/contact" element={<S><Contact /></S>} />
              <Route path="/privacy" element={<S><PrivacyPolicy /></S>} />
              <Route path="/terms" element={<S><Terms /></S>} />
              <Route path="/refund" element={<S><Refund /></S>} />
              <Route path="/disclaimer" element={<S><Disclaimer /></S>} />
              <Route path="/join" element={<S><JoinInvite /></S>} />
              <Route path="/web" element={<S><ChatrWeb /></S>} />
              
              {/* Desktop Layout Routes */}
              <Route path="/desktop" element={<DesktopLayout />}>
                <Route index element={<Navigate to="/desktop/chat" replace />} />
                <Route path="chat" element={<S><DesktopChat /></S>} />
                <Route path="contacts" element={<S><DesktopContacts /></S>} />
                <Route path="calls" element={<S><DesktopCalls /></S>} />
                <Route path="notifications" element={<S><Notifications /></S>} />
                <Route path="settings" element={<S><Settings /></S>} />
              </Route>
              
              {/* Consolidated Hub Routes */}
              <Route path="/health" element={<S><HealthHub /></S>} />
              <Route path="/care" element={<S><CareAccess /></S>} />
              <Route path="/community" element={<S><CommunitySpace /></S>} />
              
              {/* New Feature Routes */}
              <Route path="/symptom-checker" element={<S><SymptomCheckerPage /></S>} />
              <Route path="/health-wallet" element={<S><HealthWalletPage /></S>} />
              <Route path="/teleconsultation" element={<S><TeleconsultationPage /></S>} />
              <Route path="/medication-interactions" element={<S><MedicationInteractionsPage /></S>} />
              <Route path="/health-streaks" element={<S><HealthStreaksPage /></S>} />
              <Route path="/chronic-vitals" element={<S><ChronicVitalsPage /></S>} />
              
              {/* Main App Routes */}
              <Route path="/chat" element={<S><Chat /></S>} />
              <Route path="/chat/:conversationId" element={<S><Chat /></S>} />
              <Route path="/starred-messages" element={<S><StarredMessages /></S>} />
              <Route path="/chat/:conversationId/media" element={<S>{React.createElement(React.lazy(() => import('@/components/chat/MediaViewer').then(m => ({ default: m.MediaViewer }))))}</S>} />
              <Route path="/profile" element={<S><Profile /></S>} />
              <Route path="/contacts" element={<S><Contacts /></S>} />
              <Route path="/global-contacts" element={<S><GlobalContacts /></S>} />
              <Route path="/call-history" element={<S><CallHistory /></S>} />
              <Route path="/calls" element={<S><Calls /></S>} />
              <Route path="/smart-inbox" element={<S><SmartInbox /></S>} />
              <Route path="/stories" element={<S><Stories /></S>} />
              <Route path="/communities" element={<S><Communities /></S>} />
              <Route path="/create-community" element={<S><CreateCommunity /></S>} />
              
              {/* Health & Wellness Routes */}
              <Route path="/wellness" element={<S><WellnessTracking /></S>} />
              <Route path="/health-passport" element={<S><HealthPassport /></S>} />
              <Route path="/lab-reports" element={<S><LabReports /></S>} />
              <Route path="/medicine-reminders" element={<S><MedicineReminders /></S>} />
              <Route path="/bmi-calculator" element={<S><BMICalculator /></S>} />
              <Route path="/nutrition-tracker" element={<S><NutritionTracker /></S>} />
              <Route path="/mental-health" element={<S><MentalHealth /></S>} />
              <Route path="/health-reminders" element={<S><HealthReminders /></S>} />
              <Route path="/health-risks" element={<S><HealthRiskPredictions /></S>} />
              <Route path="/emergency" element={<S><EmergencyButton /></S>} />
              <Route path="/emergency-services" element={<S><EmergencyServices /></S>} />
              
              {/* Care Path Routes */}
              <Route path="/care/path/:pathId" element={<S><CarePathDetail /></S>} />
              <Route path="/care/doctor/:doctorId" element={<S><DoctorDetail /></S>} />
              <Route path="/care/family/add" element={<S><AddFamilyMember /></S>} />
              <Route path="/care/appointments" element={<S><MyAppointments /></S>} />
              
              {/* Medicine Subscription Routes */}
              <Route path="/care/medicines" element={<S><MedicineHubPage /></S>} />
              <Route path="/care/medicines/subscribe" element={<S><MedicineSubscribePage /></S>} />
              <Route path="/care/medicines/subscriptions" element={<S><MedicineSubscriptionsPage /></S>} />
              <Route path="/care/medicines/family" element={<S><MedicineFamilyPage /></S>} />
              <Route path="/care/medicines/vitals" element={<S><MedicineVitalsPage /></S>} />
              <Route path="/care/medicines/prescriptions" element={<S><MedicinePrescriptionsPage /></S>} />
              <Route path="/care/medicines/reminders" element={<S><MedicineRemindersPage /></S>} />
              <Route path="/care/medicines/rewards" element={<S><MedicineRewardsPage /></S>} />
              
              {/* Provider & Booking Routes */}
              <Route path="/booking" element={<S><BookingPage /></S>} />
              <Route path="/provider-portal" element={<S><ProviderPortal /></S>} />
              <Route path="/provider-register" element={<S><ProviderRegister /></S>} />
              <Route path="/allied-healthcare" element={<S><AlliedHealthcare /></S>} />
              
              {/* Marketplace & Engagement */}
              <Route path="/marketplace" element={<S><Marketplace /></S>} />
              <Route path="/marketplace/checkout" element={<S><MarketplaceCheckout /></S>} />
              <Route path="/marketplace/order-success" element={<S><OrderSuccessPage /></S>} />
              <Route path="/service/:categoryId" element={<S><ServiceListing /></S>} />
              <Route path="/provider/:providerId" element={<S><ProviderDetails /></S>} />
              <Route path="/booking/track/:bookingId" element={<S><BookingTracking /></S>} />
              <Route path="/provider/dashboard" element={<S><ProviderDashboard /></S>} />
              <Route path="/youth-engagement" element={<S><YouthEngagement /></S>} />
              <Route path="/youth-feed" element={<S><YouthFeed /></S>} />
              <Route path="/app-statistics" element={<S><AppStatistics /></S>} />
              <Route path="/developer-portal" element={<S><DeveloperPortal /></S>} />
              <Route path="/official-accounts" element={<S><OfficialAccounts /></S>} />
              <Route path="/chatr-studio" element={<S><ChatrStudio /></S>} />
              <Route path="/food-ordering" element={<S><FoodOrdering /></S>} />
              <Route path="/restaurant/:id" element={<S><RestaurantDetail /></S>} />
              <Route path="/food-checkout/:id" element={<S><FoodCheckout /></S>} />
              <Route path="/order-tracking/:orderId" element={<S><OrderTracking /></S>} />
              <Route path="/order-history" element={<S><OrderHistory /></S>} />
              <Route path="/local-deals" element={<S><LocalDeals /></S>} />
              
              {/* Points & Payment Routes */}
              <Route path="/chatr-points" element={<S><ChatrPoints /></S>} />
              <Route path="/reward-shop" element={<S><RewardShop /></S>} />
              <Route path="/stealth-mode" element={<PS><StealthMode /></PS>} />
              <Route path="/growth" element={<S><ChatrGrowth /></S>} />
              <Route path="/chatr-growth" element={<S><ChatrGrowth /></S>} />
              <Route path="/chatr-wallet" element={<S><ChatrWallet /></S>} />
              <Route path="/chatr-plus-subscribe" element={<S><ChatrPlusSubscribe /></S>} />
              <Route path="/ambassador-program" element={<S><AmbassadorProgram /></S>} />
              <Route path="/doctor-onboarding" element={<S><DoctorOnboarding /></S>} />
              <Route path="/qr-payment" element={<S><QRPayment /></S>} />
              <Route path="/kyc-verification" element={<PS><KYCVerificationPage /></PS>} />
              
              {/* AI & Settings Routes */}
              <Route path="/chatr-world" element={<S><ChatrWorld /></S>} />
              <Route path="/chatr-games" element={<S><ChatrGames /></S>} />
              <Route path="/native-apps" element={<S><MiniApps /></S>} />
              <Route path="/chatr-os" element={<S><ChatrOS /></S>} />
              <Route path="/os-detection" element={<S><OSDetection /></S>} />
              <Route path="/ai-agents" element={<S><AIAgentsHub /></S>} />
              <Route path="/ai-agents/create" element={<S><AIAgentCreate /></S>} />
              <Route path="/ai-agents/chat/:agentId" element={<S><AIAgentChatNew /></S>} />
              <Route path="/ai-agents/settings/:agentId" element={<S><AIAgents /></S>} />
              <Route path="/ai-assistant" element={<S><AIAssistant /></S>} />
              <Route path="/jobs" element={<S><LocalJobs /></S>} />
              <Route path="/local-jobs" element={<Navigate to="/jobs" replace />} />
              <Route path="/local-healthcare" element={<S><LocalHealthcare /></S>} />
              <Route path="/geofences" element={<S><Geofences /></S>} />
              <Route path="/geofence-history" element={<S><GeofenceHistory /></S>} />
              <Route path="/home" element={<S><Home /></S>} />
              <Route path="/geo" element={<S><GeoDiscovery /></S>} />
              <Route path="/search" element={<S><UniversalSearch /></S>} />
              <Route path="/universal-search" element={<S><UniversalSearch /></S>} />
              <Route path="/chatr-home" element={<S><ChatrHome /></S>} />
              <Route path="/chatr-results" element={<S><ChatrResults /></S>} />
              <Route path="/ai-browser-home" element={<S><AIBrowserHome /></S>} />
              <Route path="/ai-search" element={<S><AIBrowserHome /></S>} />
              <Route path="/ai-browser" element={<S><AIBrowserView /></S>} />
              <Route path="/chat-ai" element={<S><AIChat /></S>} />
              <Route path="/capture" element={<S><Capture /></S>} />
              <Route path="/account" element={<S><Account /></S>} />
              <Route path="/prechu-ai" element={<PS><PrechuAI /></PS>} />
              <Route path="/job/:id" element={<PS><JobDetail /></PS>} />
              <Route path="/notifications" element={<S><Notifications /></S>} />
              <Route path="/notification-settings" element={<S><NotificationSettings /></S>} />
              <Route path="/notifications/settings" element={<S><NotificationSettings /></S>} />
              <Route path="/settings" element={<S><Settings /></S>} />
              <Route path="/device-management" element={<S><DeviceManagement /></S>} />
              <Route path="/bluetooth-test" element={<S><BluetoothTest /></S>} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<S><AdminDashboard /></S>} />
                <Route path="feature-builder" element={<S><FeatureBuilder /></S>} />
                <Route path="schema-manager" element={<S><SchemaManager /></S>} />
                <Route path="users" element={<S><AdminUsers /></S>} />
                <Route path="providers" element={<S><AdminProviders /></S>} />
                <Route path="analytics" element={<S><AdminAnalytics /></S>} />
                <Route path="payments" element={<S><AdminPayments /></S>} />
                <Route path="points" element={<S><AdminPoints /></S>} />
                <Route path="settings" element={<S><AdminSettings /></S>} />
                <Route path="announcements" element={<S><AdminAnnouncements /></S>} />
                <Route path="documents" element={<S><AdminDocuments /></S>} />
                <Route path="doctor-applications" element={<S><AdminDoctorApplications /></S>} />
                <Route path="official-accounts" element={<S><OfficialAccountsManager /></S>} />
                <Route path="broadcast" element={<S><BroadcastManager /></S>} />
                <Route path="brand-partnerships" element={<S><BrandPartnerships /></S>} />
                <Route path="app-approvals" element={<S><AppApprovals /></S>} />
                <Route path="kyc-approvals" element={<S><KYCApprovals /></S>} />
                <Route path="chatr-world" element={<S><ChatrWorldAdmin /></S>} />
                <Route path="payment-verification" element={<S><PaymentVerification /></S>} />
              </Route>
              <Route path="/chatr-tutors" element={<S><ChatrTutors /></S>} />
              <Route path="/tutors" element={<S><ChatrTutors /></S>} />
              <Route path="/home-services" element={<S><HomeServices /></S>} />
              <Route path="/wellness-circles" element={<S><WellnessCircles /></S>} />
              <Route path="/wellness-circles/:circleId" element={<S><WellnessCircles /></S>} />
              <Route path="/expert-sessions" element={<S><ExpertSessions /></S>} />
              <Route path="/community" element={<S><Community /></S>} />
              
              {/* Chatr+ Routes */}
              <Route path="/chatr-plus" element={<S><ChatrPlus /></S>} />
              <Route path="/chatr-plus/search" element={<S><ChatrPlusSearch /></S>} />
              <Route path="/chatr-plus/subscribe" element={<S><ChatrPlusSubscribe /></S>} />
              <Route path="/subscription" element={<S><UserSubscription /></S>} />
              <Route path="/wallet" element={<S><ChatrWallet /></S>} />
              <Route path="/chatr-plus/service/:id" element={<S><ChatrPlusServiceDetail /></S>} />
              <Route path="/chatr-plus/seller-registration" element={<S><ChatrPlusSellerRegistration /></S>} />
              <Route path="/chatr-plus/seller/dashboard" element={<S><ChatrPlusSellerDashboard /></S>} />
              <Route path="/chatr-plus/category/:slug" element={<S><ChatrPlusCategoryPage /></S>} />
              <Route path="/chatr-plus/wallet" element={<S><ChatrPlusWallet /></S>} />
              <Route path="/seller" element={<S><SellerPortal /></S>} />
              <Route path="/seller/portal" element={<S><SellerPortal /></S>} />
              <Route path="/seller/bookings" element={<S><SellerBookings /></S>} />
              <Route path="/seller/services" element={<S><SellerServices /></S>} />
              <Route path="/seller/analytics" element={<S><SellerAnalytics /></S>} />
              <Route path="/seller/messages" element={<S><SellerMessages /></S>} />
              <Route path="/seller/settings" element={<S><SellerSettings /></S>} />
              <Route path="/seller/reviews" element={<S><SellerReviews /></S>} />
              <Route path="/seller/payouts" element={<S><SellerPayouts /></S>} />
              <Route path="/seller/subscription" element={<S><SellerSubscription /></S>} />
              <Route path="/seller/settlements" element={<S><SellerSettlements /></S>} />
              <Route path="/chatr-plus/seller/bookings" element={<S><SellerBookings /></S>} />
              <Route path="/chatr-plus/seller/services" element={<S><SellerServices /></S>} />
              <Route path="/chatr-plus/seller/analytics" element={<S><SellerAnalytics /></S>} />
              <Route path="/chatr-plus/seller/messages" element={<S><SellerMessages /></S>} />
              <Route path="/chatr-plus/seller/settings" element={<S><SellerSettings /></S>} />
              
              {/* Provider Dashboard Routes */}
              <Route path="/provider/appointments" element={<S><ProviderAppointments /></S>} />
              <Route path="/provider/services" element={<S><ProviderServices /></S>} />
              <Route path="/provider/payments" element={<S><ProviderPayments /></S>} />
              
              {/* Business Routes */}
              <Route path="/business" element={<S><BusinessDashboard /></S>} />
              <Route path="/business/onboard" element={<S><BusinessOnboarding /></S>} />
              <Route path="/business/inbox" element={<S><BusinessInbox /></S>} />
              <Route path="/business/crm" element={<S><CRMPage /></S>} />
              <Route path="/business/analytics" element={<S><BusinessAnalytics /></S>} />
              <Route path="/business/team" element={<S><BusinessTeam /></S>} />
              <Route path="/business/settings" element={<S><BusinessSettings /></S>} />
              <Route path="/business/catalog" element={<S><BusinessCatalog /></S>} />
              <Route path="/business/broadcasts" element={<S><BusinessBroadcasts /></S>} />
              <Route path="/business/groups" element={<S><BusinessGroups /></S>} />
              
              {/* Vendor Portal Routes */}
              <Route path="/vendor/login" element={<S><VendorLogin /></S>} />
              <Route path="/vendor/register" element={<S><VendorRegister /></S>} />
              <Route path="/vendor/dashboard" element={<PS><VendorDashboard /></PS>} />
              <Route path="/vendor/menu" element={<PS><RestaurantMenu /></PS>} />
              <Route path="/vendor/orders" element={<PS><RestaurantOrders /></PS>} />
              <Route path="/vendor/deals" element={<PS><DealsManagement /></PS>} />
              <Route path="/vendor/deals/new" element={<PS><DealsManagement /></PS>} />
              <Route path="/vendor/settings" element={<PS><VendorSettings /></PS>} />
              <Route path="/vendor/appointments" element={<PS><DoctorAppointments /></PS>} />
              <Route path="/vendor/patients" element={<PS><DoctorPatients /></PS>} />
              <Route path="/vendor/analytics" element={<PS><DoctorAnalytics /></PS>} />
              <Route path="/vendor/availability" element={<PS><DoctorAvailability /></PS>} />
              
              {/* Ecosystem Routes */}
              <Route path="/chatr-studio" element={<PS><ChatrStudio /></PS>} />
              <Route path="/food-ordering" element={<PS><FoodOrdering /></PS>} />
              <Route path="/local-deals" element={<PS><LocalDeals /></PS>} />
              <Route path="/referrals" element={<PS><Referrals /></PS>} />
              
              {/* Growth System Routes */}
              <Route path="/leaderboard" element={<S><ChatrPoints /></S>} />
              
              {/* FameCam Routes */}
              <Route path="/fame-cam" element={<PS><FameCam /></PS>} />
              <Route path="/fame-leaderboard" element={<PS><FameLeaderboard /></PS>} />
              
              {/* 404 Route */}
              <Route path="*" element={<S><NotFound /></S>} />
            </Routes>
            <Toaster />
            <Sonner />
            </CallProvider>
            </NativeAppProvider>
          </BrowserRouter>
        </LocationProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </HelmetProvider>
    </GlobalErrorBoundary>
    </CrashlyticsErrorBoundary>
  );
};

export default App;
