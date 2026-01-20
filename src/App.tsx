import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import React, { useEffect, Suspense } from "react";
import { HelmetProvider } from 'react-helmet-async';
import ProtectedRoute from "./components/ProtectedRoute";
import { NativeAppProvider } from "./components/NativeAppProvider";
import { LocationProvider } from "./contexts/LocationContext";
import { registerServiceWorker } from "./utils/serviceWorkerRegistration";
import { setupNativeCallUI } from "./utils/nativeCallUI";
import { CrashlyticsErrorBoundary } from "./utils/crashlyticsErrorBoundary";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { GlobalCallListener } from "./components/calling/GlobalCallListener";
import { GlobalNotificationListener } from "./components/GlobalNotificationListener";
import { CallProvider } from "./contexts/CallContext";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { PageLoader } from "./components/PageLoader";

// ============================================
// CRITICAL PAGES - Eagerly loaded for instant navigation
// ============================================
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Calls from "./pages/Calls";
import Profile from "./pages/Profile";

// ============================================
// ALL OTHER PAGES - Lazy loaded for performance
// ============================================
import * as LazyPages from "./routes/lazyPages";
import { preloadCriticalRoutes } from "./routes/lazyPages";

// Layout components (small, keep eager)
import { AdminLayout } from "./components/AdminLayout";
import DesktopLayout from "./layouts/DesktopLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchInterval: false,
    },
  },
});

// Check if on web subdomain (web.chatr.chat)
const isWebSubdomain = () => {
  const hostname = window.location.hostname;
  return hostname === 'web.chatr.chat' || 
         hostname.startsWith('web.') || 
         new URLSearchParams(window.location.search).get('subdomain') === 'web';
};

// Component to handle subdomain redirect
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

  return <Index />;
};

// Wrapper for lazy routes with Suspense
const LazyRoute = ({ component: Component, ...props }: { component: React.ComponentType<any>, [key: string]: any }) => (
  <Suspense fallback={<PageLoader />}>
    <Component {...props} />
  </Suspense>
);

// Protected lazy route wrapper
const ProtectedLazyRoute = ({ component: Component }: { component: React.ComponentType<any> }) => (
  <ProtectedRoute>
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  </ProtectedRoute>
);

const App = () => {
  // Register service worker once on mount
  useEffect(() => {
    let registered = false;
    
    const initServiceWorker = async () => {
      if (registered) return;
      
      if ('serviceWorker' in navigator) {
        const existing = await navigator.serviceWorker.getRegistration();
        if (existing) {
          console.log('✅ Service Worker already registered');
          registered = true;
          return;
        }
      }
      
      const registration = await registerServiceWorker();
      if (registration) {
        console.log('✅ Service Worker initialized for push notifications');
        registered = true;
      }
    };
    
    initServiceWorker();
    
    // PERFORMANCE: Preload critical routes after initial render
    preloadCriticalRoutes();
  }, []);

  // Initialize native call UI (CallKit/ConnectionService)
  useEffect(() => {
    setupNativeCallUI().catch(err => {
      console.log('Native call UI not available:', err);
    });
  }, []);

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
            
            <Route path="/launcher" element={<ProtectedLazyRoute component={LazyPages.Launcher} />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/download" element={<LazyRoute component={LazyPages.Download} />} />
            <Route path="/install" element={<LazyRoute component={LazyPages.Install} />} />
            <Route path="/onboarding" element={<LazyRoute component={LazyPages.Onboarding} />} />
            <Route path="/about" element={<LazyRoute component={LazyPages.About} />} />
            <Route path="/help" element={<LazyRoute component={LazyPages.Help} />} />
            <Route path="/contact" element={<LazyRoute component={LazyPages.Contact} />} />
            <Route path="/privacy" element={<LazyRoute component={LazyPages.PrivacyPolicy} />} />
            <Route path="/terms" element={<LazyRoute component={LazyPages.Terms} />} />
            <Route path="/refund" element={<LazyRoute component={LazyPages.Refund} />} />
            <Route path="/disclaimer" element={<LazyRoute component={LazyPages.Disclaimer} />} />
            <Route path="/join" element={<LazyRoute component={LazyPages.JoinInvite} />} />
            <Route path="/web" element={<LazyRoute component={LazyPages.ChatrWeb} />} />
            
            {/* Desktop Layout Routes (web.chatr.chat) */}
            <Route path="/desktop" element={<DesktopLayout />}>
              <Route index element={<Navigate to="/desktop/chat" replace />} />
              <Route path="chat" element={<LazyRoute component={LazyPages.DesktopChat} />} />
              <Route path="contacts" element={<LazyRoute component={LazyPages.DesktopContacts} />} />
              <Route path="calls" element={<LazyRoute component={LazyPages.DesktopCalls} />} />
              <Route path="notifications" element={<LazyRoute component={LazyPages.Notifications} />} />
              <Route path="settings" element={<LazyRoute component={LazyPages.Settings} />} />
            </Route>
            
            {/* Consolidated Hub Routes */}
            <Route path="/health" element={<LazyRoute component={LazyPages.HealthHub} />} />
            <Route path="/care" element={<LazyRoute component={LazyPages.CareAccess} />} />
            <Route path="/community" element={<LazyRoute component={LazyPages.CommunitySpace} />} />
            
            {/* New Feature Routes */}
            <Route path="/symptom-checker" element={<LazyRoute component={LazyPages.SymptomCheckerPage} />} />
            <Route path="/health-wallet" element={<LazyRoute component={LazyPages.HealthWalletPage} />} />
            <Route path="/teleconsultation" element={<LazyRoute component={LazyPages.TeleconsultationPage} />} />
            <Route path="/medication-interactions" element={<LazyRoute component={LazyPages.MedicationInteractionsPage} />} />
            <Route path="/health-streaks" element={<LazyRoute component={LazyPages.HealthStreaksPage} />} />
            <Route path="/chronic-vitals" element={<LazyRoute component={LazyPages.ChronicVitalsPage} />} />
            
            {/* Main App Routes - Critical paths kept eager */}
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:conversationId" element={<Chat />} />
            <Route path="/starred-messages" element={<LazyRoute component={LazyPages.StarredMessages} />} />
            <Route path="/chat/:conversationId/media" 
              element={<Suspense fallback={<PageLoader />}>{React.createElement(React.lazy(() => import('@/components/chat/MediaViewer').then(m => ({ default: m.MediaViewer }))))}</Suspense>}
            />
            <Route path="/profile" element={<Profile />} />
            <Route path="/contacts" element={<LazyRoute component={LazyPages.Contacts} />} />
            <Route path="/global-contacts" element={<LazyRoute component={LazyPages.GlobalContacts} />} />
            <Route path="/call-history" element={<LazyRoute component={LazyPages.CallHistory} />} />
            <Route path="/calls" element={<Calls />} />
            <Route path="/smart-inbox" element={<LazyRoute component={LazyPages.SmartInbox} />} />
            <Route path="/stories" element={<LazyRoute component={LazyPages.Stories} />} />
            <Route path="/communities" element={<LazyRoute component={LazyPages.Communities} />} />
            <Route path="/create-community" element={<LazyRoute component={LazyPages.CreateCommunity} />} />
            
            {/* Health & Wellness Routes */}
            <Route path="/wellness" element={<LazyRoute component={LazyPages.WellnessTracking} />} />
            <Route path="/health-passport" element={<LazyRoute component={LazyPages.HealthPassport} />} />
            <Route path="/lab-reports" element={<LazyRoute component={LazyPages.LabReports} />} />
            <Route path="/medicine-reminders" element={<LazyRoute component={LazyPages.MedicineReminders} />} />
            <Route path="/bmi-calculator" element={<LazyRoute component={LazyPages.BMICalculator} />} />
            <Route path="/nutrition-tracker" element={<LazyRoute component={LazyPages.NutritionTracker} />} />
            <Route path="/mental-health" element={<LazyRoute component={LazyPages.MentalHealth} />} />
            <Route path="/health-reminders" element={<LazyRoute component={LazyPages.HealthReminders} />} />
            <Route path="/health-risks" element={<LazyRoute component={LazyPages.HealthRiskPredictions} />} />
            <Route path="/emergency" element={<LazyRoute component={LazyPages.EmergencyButton} />} />
            <Route path="/emergency-services" element={<LazyRoute component={LazyPages.EmergencyServices} />} />
            
            {/* Care Path Routes */}
            <Route path="/care/path/:pathId" element={<LazyRoute component={LazyPages.CarePathDetail} />} />
            <Route path="/care/doctor/:doctorId" element={<LazyRoute component={LazyPages.DoctorDetail} />} />
            <Route path="/care/family/add" element={<LazyRoute component={LazyPages.AddFamilyMember} />} />
            <Route path="/care/appointments" element={<LazyRoute component={LazyPages.MyAppointments} />} />
            
            {/* Medicine Subscription Routes */}
            <Route path="/care/medicines" element={<LazyRoute component={LazyPages.MedicineHubPage} />} />
            <Route path="/care/medicines/subscribe" element={<LazyRoute component={LazyPages.MedicineSubscribePage} />} />
            <Route path="/care/medicines/subscriptions" element={<LazyRoute component={LazyPages.MedicineSubscriptionsPage} />} />
            <Route path="/care/medicines/family" element={<LazyRoute component={LazyPages.MedicineFamilyPage} />} />
            <Route path="/care/medicines/vitals" element={<LazyRoute component={LazyPages.MedicineVitalsPage} />} />
            <Route path="/care/medicines/prescriptions" element={<LazyRoute component={LazyPages.MedicinePrescriptionsPage} />} />
            <Route path="/care/medicines/reminders" element={<LazyRoute component={LazyPages.MedicineRemindersPage} />} />
            <Route path="/care/medicines/rewards" element={<LazyRoute component={LazyPages.MedicineRewardsPage} />} />
            
            {/* Provider & Booking Routes */}
            <Route path="/booking" element={<LazyRoute component={LazyPages.BookingPage} />} />
            <Route path="/provider-portal" element={<LazyRoute component={LazyPages.ProviderPortal} />} />
            <Route path="/provider-register" element={<LazyRoute component={LazyPages.ProviderRegister} />} />
            <Route path="/allied-healthcare" element={<LazyRoute component={LazyPages.AlliedHealthcare} />} />
            
            {/* Marketplace & Engagement */}
            <Route path="/marketplace" element={<LazyRoute component={LazyPages.Marketplace} />} />
            <Route path="/marketplace/checkout" element={<LazyRoute component={LazyPages.MarketplaceCheckout} />} />
            <Route path="/marketplace/order-success" element={<LazyRoute component={LazyPages.OrderSuccessPage} />} />
            <Route path="/service/:categoryId" element={<LazyRoute component={LazyPages.ServiceListing} />} />
            <Route path="/provider/:providerId" element={<LazyRoute component={LazyPages.ProviderDetails} />} />
            <Route path="/booking/track/:bookingId" element={<LazyRoute component={LazyPages.BookingTracking} />} />
            <Route path="/provider/dashboard" element={<LazyRoute component={LazyPages.ProviderDashboard} />} />
            <Route path="/youth-engagement" element={<LazyRoute component={LazyPages.YouthEngagement} />} />
            <Route path="/youth-feed" element={<LazyRoute component={LazyPages.YouthFeed} />} />
            <Route path="/app-statistics" element={<LazyRoute component={LazyPages.AppStatistics} />} />
            <Route path="/developer-portal" element={<LazyRoute component={LazyPages.DeveloperPortal} />} />
            <Route path="/official-accounts" element={<LazyRoute component={LazyPages.OfficialAccounts} />} />
            <Route path="/chatr-studio" element={<LazyRoute component={LazyPages.ChatrStudio} />} />
            <Route path="/food-ordering" element={<LazyRoute component={LazyPages.FoodOrdering} />} />
            <Route path="/restaurant/:id" element={<LazyRoute component={LazyPages.RestaurantDetail} />} />
            <Route path="/food-checkout/:id" element={<LazyRoute component={LazyPages.FoodCheckout} />} />
            <Route path="/order-tracking/:orderId" element={<LazyRoute component={LazyPages.OrderTracking} />} />
            <Route path="/order-history" element={<LazyRoute component={LazyPages.OrderHistory} />} />
            <Route path="/local-deals" element={<LazyRoute component={LazyPages.LocalDeals} />} />
            
            {/* Earning / Micro-Tasks Routes */}
            <Route path="/earn" element={<ProtectedLazyRoute component={LazyPages.Earn} />} />
            <Route path="/earn/history" element={<ProtectedLazyRoute component={LazyPages.EarnHistory} />} />
            
            {/* Points & Payment Routes */}
            <Route path="/chatr-points" element={<LazyRoute component={LazyPages.ChatrPoints} />} />
            <Route path="/reward-shop" element={<LazyRoute component={LazyPages.RewardShop} />} />
            <Route path="/stealth-mode" element={<ProtectedLazyRoute component={LazyPages.StealthMode} />} />
            <Route path="/growth" element={<LazyRoute component={LazyPages.ChatrGrowth} />} />
            <Route path="/chatr-growth" element={<LazyRoute component={LazyPages.ChatrGrowth} />} />
            <Route path="/chatr-wallet" element={<LazyRoute component={LazyPages.ChatrWallet} />} />
            <Route path="/chatr-plus-subscribe" element={<LazyRoute component={LazyPages.ChatrPlusSubscribe} />} />
            <Route path="/ambassador-program" element={<LazyRoute component={LazyPages.AmbassadorProgram} />} />
            <Route path="/doctor-onboarding" element={<LazyRoute component={LazyPages.DoctorOnboarding} />} />
            <Route path="/qr-payment" element={<LazyRoute component={LazyPages.QRPayment} />} />
            <Route path="/kyc-verification" element={<ProtectedLazyRoute component={LazyPages.KYCVerificationPage} />} />
            
            {/* AI & Settings Routes */}
            <Route path="/chatr-world" element={<LazyRoute component={LazyPages.ChatrWorld} />} />
            <Route path="/chatr-games" element={<LazyRoute component={LazyPages.ChatrGames} />} />
            <Route path="/native-apps" element={<LazyRoute component={LazyPages.MiniApps} />} />
            <Route path="/chatr-os" element={<LazyRoute component={LazyPages.ChatrOS} />} />
            <Route path="/os-detection" element={<LazyRoute component={LazyPages.OSDetection} />} />
            <Route path="/ai-agents" element={<LazyRoute component={LazyPages.AIAgentsHub} />} />
            <Route path="/ai-agents/create" element={<LazyRoute component={LazyPages.AIAgentCreate} />} />
            <Route path="/ai-agents/chat/:agentId" element={<LazyRoute component={LazyPages.AIAgentChatNew} />} />
            <Route path="/ai-agents/settings/:agentId" element={<LazyRoute component={LazyPages.AIAgents} />} />
            <Route path="/ai-assistant" element={<LazyRoute component={LazyPages.AIAssistant} />} />
            <Route path="/jobs" element={<LazyRoute component={LazyPages.LocalJobs} />} />
            <Route path="/local-jobs" element={<Navigate to="/jobs" replace />} />
            <Route path="/local-healthcare" element={<LazyRoute component={LazyPages.LocalHealthcare} />} />
            <Route path="/geofences" element={<LazyRoute component={LazyPages.Geofences} />} />
            <Route path="/geofence-history" element={<LazyRoute component={LazyPages.GeofenceHistory} />} />
            
            {/* Public browser - no auth required */}
            <Route path="/home" element={<Home />} />
            <Route path="/geo" element={<LazyRoute component={LazyPages.GeoDiscovery} />} />
            <Route path="/search" element={<LazyRoute component={LazyPages.UniversalSearch} />} />
            <Route path="/universal-search" element={<LazyRoute component={LazyPages.UniversalSearch} />} />
            <Route path="/chatr-home" element={<LazyRoute component={LazyPages.ChatrHome} />} />
            <Route path="/chatr-results" element={<LazyRoute component={LazyPages.ChatrResults} />} />
            <Route path="/ai-browser-home" element={<LazyRoute component={LazyPages.AIBrowserHome} />} />
            <Route path="/ai-search" element={<LazyRoute component={LazyPages.AIBrowserHome} />} />
            <Route path="/ai-browser" element={<LazyRoute component={LazyPages.AIBrowserView} />} />
            <Route path="/chat-ai" element={<LazyRoute component={LazyPages.AIChat} />} />
            <Route path="/capture" element={<LazyRoute component={LazyPages.Capture} />} />
            <Route path="/account" element={<LazyRoute component={LazyPages.Account} />} />
            <Route path="/prechu-ai" element={<ProtectedLazyRoute component={LazyPages.PrechuAI} />} />
            <Route path="/job/:id" element={<ProtectedLazyRoute component={LazyPages.JobDetail} />} />
            <Route path="/notifications" element={<LazyRoute component={LazyPages.Notifications} />} />
            <Route path="/notification-settings" element={<LazyRoute component={LazyPages.NotificationSettings} />} />
            <Route path="/notifications/settings" element={<LazyRoute component={LazyPages.NotificationSettings} />} />
            <Route path="/settings" element={<LazyRoute component={LazyPages.Settings} />} />
            <Route path="/device-management" element={<LazyRoute component={LazyPages.DeviceManagement} />} />
            <Route path="/bluetooth-test" element={<LazyRoute component={LazyPages.BluetoothTest} />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<LazyRoute component={LazyPages.AdminDashboard} />} />
              <Route path="feature-builder" element={<LazyRoute component={LazyPages.FeatureBuilder} />} />
              <Route path="schema-manager" element={<LazyRoute component={LazyPages.SchemaManager} />} />
              <Route path="users" element={<LazyRoute component={LazyPages.AdminUsers} />} />
              <Route path="providers" element={<LazyRoute component={LazyPages.AdminProviders} />} />
              <Route path="analytics" element={<LazyRoute component={LazyPages.AdminAnalytics} />} />
              <Route path="payments" element={<LazyRoute component={LazyPages.AdminPayments} />} />
              <Route path="points" element={<LazyRoute component={LazyPages.AdminPoints} />} />
              <Route path="settings" element={<LazyRoute component={LazyPages.AdminSettings} />} />
              <Route path="announcements" element={<LazyRoute component={LazyPages.AdminAnnouncements} />} />
              <Route path="documents" element={<LazyRoute component={LazyPages.AdminDocuments} />} />
              <Route path="doctor-applications" element={<LazyRoute component={LazyPages.AdminDoctorApplications} />} />
              <Route path="official-accounts" element={<LazyRoute component={LazyPages.OfficialAccountsManager} />} />
              <Route path="broadcast" element={<LazyRoute component={LazyPages.BroadcastManager} />} />
              <Route path="brand-partnerships" element={<LazyRoute component={LazyPages.BrandPartnerships} />} />
              <Route path="app-approvals" element={<LazyRoute component={LazyPages.AppApprovals} />} />
              <Route path="kyc-approvals" element={<LazyRoute component={LazyPages.KYCApprovals} />} />
              <Route path="chatr-world" element={<LazyRoute component={LazyPages.ChatrWorldAdmin} />} />
              <Route path="payment-verification" element={<LazyRoute component={LazyPages.PaymentVerification} />} />
              <Route path="micro-tasks" element={<LazyRoute component={LazyPages.AdminMicroTasks} />} />
            </Route>
            
            <Route path="/chatr-tutors" element={<LazyRoute component={LazyPages.ChatrTutors} />} />
            <Route path="/tutors" element={<LazyRoute component={LazyPages.ChatrTutors} />} />
            <Route path="/home-services" element={<LazyRoute component={LazyPages.HomeServices} />} />
            <Route path="/wellness-circles" element={<LazyRoute component={LazyPages.WellnessCircles} />} />
            <Route path="/wellness-circles/:circleId" element={<LazyRoute component={LazyPages.WellnessCircles} />} />
            <Route path="/expert-sessions" element={<LazyRoute component={LazyPages.ExpertSessions} />} />
            <Route path="/community" element={<LazyRoute component={LazyPages.Community} />} />
            
            {/* Chatr+ Routes */}
            <Route path="/chatr-plus" element={<LazyRoute component={LazyPages.ChatrPlus} />} />
            <Route path="/chatr-plus/search" element={<LazyRoute component={LazyPages.ChatrPlusSearch} />} />
            <Route path="/chatr-plus/subscribe" element={<LazyRoute component={LazyPages.ChatrPlusSubscribe} />} />
            <Route path="/subscription" element={<LazyRoute component={LazyPages.UserSubscription} />} />
            <Route path="/wallet" element={<LazyRoute component={LazyPages.ChatrWallet} />} />
            <Route path="/chatr-plus/service/:id" element={<LazyRoute component={LazyPages.ChatrPlusServiceDetail} />} />
            <Route path="/chatr-plus/seller-registration" element={<LazyRoute component={LazyPages.ChatrPlusSellerRegistration} />} />
            <Route path="/chatr-plus/seller/dashboard" element={<LazyRoute component={LazyPages.ChatrPlusSellerDashboard} />} />
            <Route path="/chatr-plus/category/:slug" element={<LazyRoute component={LazyPages.ChatrPlusCategoryPage} />} />
            <Route path="/chatr-plus/wallet" element={<LazyRoute component={LazyPages.ChatrPlusWallet} />} />
            <Route path="/seller" element={<LazyRoute component={LazyPages.SellerPortal} />} />
            <Route path="/seller/portal" element={<LazyRoute component={LazyPages.SellerPortal} />} />
            <Route path="/seller/bookings" element={<LazyRoute component={LazyPages.SellerBookings} />} />
            <Route path="/seller/services" element={<LazyRoute component={LazyPages.SellerServices} />} />
            <Route path="/seller/analytics" element={<LazyRoute component={LazyPages.SellerAnalytics} />} />
            <Route path="/seller/messages" element={<LazyRoute component={LazyPages.SellerMessages} />} />
            <Route path="/seller/settings" element={<LazyRoute component={LazyPages.SellerSettings} />} />
            <Route path="/seller/reviews" element={<LazyRoute component={LazyPages.SellerReviews} />} />
            <Route path="/seller/payouts" element={<LazyRoute component={LazyPages.SellerPayouts} />} />
            <Route path="/seller/subscription" element={<LazyRoute component={LazyPages.SellerSubscription} />} />
            <Route path="/seller/settlements" element={<LazyRoute component={LazyPages.SellerSettlements} />} />
            <Route path="/chatr-plus/seller/bookings" element={<LazyRoute component={LazyPages.SellerBookings} />} />
            <Route path="/chatr-plus/seller/services" element={<LazyRoute component={LazyPages.SellerServices} />} />
            <Route path="/chatr-plus/seller/analytics" element={<LazyRoute component={LazyPages.SellerAnalytics} />} />
            <Route path="/chatr-plus/seller/messages" element={<LazyRoute component={LazyPages.SellerMessages} />} />
            <Route path="/chatr-plus/seller/settings" element={<LazyRoute component={LazyPages.SellerSettings} />} />
            
            {/* Provider Dashboard Routes */}
            <Route path="/provider/appointments" element={<LazyRoute component={LazyPages.ProviderAppointments} />} />
            <Route path="/provider/services" element={<LazyRoute component={LazyPages.ProviderServices} />} />
            <Route path="/provider/payments" element={<LazyRoute component={LazyPages.ProviderPayments} />} />
            
            {/* Business Routes */}
            <Route path="/business" element={<LazyRoute component={LazyPages.BusinessDashboard} />} />
            <Route path="/business/onboard" element={<LazyRoute component={LazyPages.BusinessOnboarding} />} />
            <Route path="/business/inbox" element={<LazyRoute component={LazyPages.BusinessInbox} />} />
            <Route path="/business/crm" element={<LazyRoute component={LazyPages.CRMPage} />} />
            <Route path="/business/analytics" element={<LazyRoute component={LazyPages.BusinessAnalytics} />} />
            <Route path="/business/team" element={<LazyRoute component={LazyPages.BusinessTeam} />} />
            <Route path="/business/settings" element={<LazyRoute component={LazyPages.BusinessSettings} />} />
            <Route path="/business/catalog" element={<LazyRoute component={LazyPages.BusinessCatalog} />} />
            <Route path="/business/broadcasts" element={<LazyRoute component={LazyPages.BusinessBroadcasts} />} />
            <Route path="/business/groups" element={<LazyRoute component={LazyPages.BusinessGroups} />} />
            
            {/* Vendor Portal Routes */}
            <Route path="/vendor/login" element={<LazyRoute component={LazyPages.VendorLogin} />} />
            <Route path="/vendor/register" element={<LazyRoute component={LazyPages.VendorRegister} />} />
            <Route path="/vendor/dashboard" element={<ProtectedLazyRoute component={LazyPages.VendorDashboard} />} />
            <Route path="/vendor/menu" element={<ProtectedLazyRoute component={LazyPages.RestaurantMenu} />} />
            <Route path="/vendor/orders" element={<ProtectedLazyRoute component={LazyPages.RestaurantOrders} />} />
            <Route path="/vendor/deals" element={<ProtectedLazyRoute component={LazyPages.DealsManagement} />} />
            <Route path="/vendor/deals/new" element={<ProtectedLazyRoute component={LazyPages.DealsManagement} />} />
            <Route path="/vendor/settings" element={<ProtectedLazyRoute component={LazyPages.VendorSettings} />} />
            <Route path="/vendor/appointments" element={<ProtectedLazyRoute component={LazyPages.DoctorAppointments} />} />
            <Route path="/vendor/patients" element={<ProtectedLazyRoute component={LazyPages.DoctorPatients} />} />
            <Route path="/vendor/analytics" element={<ProtectedLazyRoute component={LazyPages.DoctorAnalytics} />} />
            <Route path="/vendor/availability" element={<ProtectedLazyRoute component={LazyPages.DoctorAvailability} />} />
            
            {/* Ecosystem Routes */}
            <Route path="/referrals" element={<ProtectedLazyRoute component={LazyPages.Referrals} />} />
            
            {/* Growth System Routes */}
            <Route path="/leaderboard" element={<LazyRoute component={LazyPages.ChatrPoints} />} />
            
            {/* FameCam Routes */}
            <Route path="/fame-cam" element={<ProtectedLazyRoute component={LazyPages.FameCam} />} />
            <Route path="/fame-leaderboard" element={<ProtectedLazyRoute component={LazyPages.FameLeaderboard} />} />
            
            {/* Mini Apps */}
            <Route path="/mini-apps" element={<LazyRoute component={LazyPages.MiniAppsStore} />} />
            
            {/* 404 Route */}
            <Route path="*" element={<LazyRoute component={LazyPages.NotFound} />} />
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
