import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import React from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import { useNativeOptimizations } from "./hooks/useNativeOptimizations";
import { useNativePerformance } from "./hooks/useNativePerformance";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Contacts from "./pages/Contacts";
import GlobalContacts from "./pages/GlobalContacts";
import CallHistory from "./pages/CallHistory";
import ContactsPage from "./pages/ContactsPage";
import SmartInbox from "./pages/SmartInbox";
import Stories from "./pages/Stories";
import Communities from "./pages/Communities";
import CreateCommunity from "./pages/CreateCommunity";
import WellnessTracking from "./pages/WellnessTracking";
import HealthPassport from "./pages/HealthPassport";
import LabReports from "./pages/LabReports";
import MedicineReminders from "./pages/MedicineReminders";
import BookingPage from "./pages/BookingPage";
import ProviderPortal from "./pages/ProviderPortal";
import ProviderRegister from "./pages/ProviderRegister";
import AlliedHealthcare from "./pages/AlliedHealthcare";
import Marketplace from "./pages/Marketplace";
import YouthEngagement from "./pages/YouthEngagement";
import YouthFeed from "./pages/YouthFeed";
import MiniAppsStore from "./pages/MiniAppsStore";
import DeveloperPortal from "./pages/DeveloperPortal";
import OfficialAccounts from "./pages/OfficialAccounts";
import OfficialAccountsManager from "./pages/admin/OfficialAccountsManager";
import BroadcastManager from "./pages/admin/BroadcastManager";
import ChatrTutors from "./pages/ChatrTutors";
import ChatrPoints from "./pages/ChatrPoints";
import RewardShop from "./pages/RewardShop";
import ChatrGrowth from "./pages/ChatrGrowth";
import AmbassadorProgram from "./pages/AmbassadorProgram";
import DoctorOnboarding from "./pages/DoctorOnboarding";
import QRPayment from "./pages/QRPayment";
import HomeServices from "./pages/HomeServices";
import QRLogin from "./pages/QRLogin";
import AIAssistant from "./pages/AIAssistant";
import Account from "./pages/Account";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Refund from "./pages/Refund";
import Disclaimer from "./pages/Disclaimer";
import NotificationSettings from "./pages/NotificationSettings";
import Notifications from "./pages/Notifications";
import DeviceManagement from "./pages/DeviceManagement";
import Download from "./pages/Download";
import Install from "./pages/Install";
import Onboarding from "./pages/Onboarding";
import EmergencyButton from "./pages/EmergencyButton";
import EmergencyServices from "./pages/EmergencyServices";
import WellnessCircles from "./pages/WellnessCircles";
import ExpertSessions from "./pages/ExpertSessions";
import AdminDashboard from "./pages/AdminDashboard";
import About from "./pages/About";
import Help from "./pages/Help";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/AdminLayout";
import BrandPartnerships from "./pages/admin/BrandPartnerships";

// Consolidated Hub Pages
import HealthHub from "./pages/HealthHub";
import CareAccess from "./pages/CareAccess";
import CommunitySpace from "./pages/CommunitySpace";
import AIBrowserHome from "./pages/AIBrowserHome";
import AIBrowserView from "./pages/AIBrowserView";

// New Feature Pages
import SymptomCheckerPage from "./pages/SymptomCheckerPage";
import HealthWalletPage from "./pages/HealthWalletPage";
import TeleconsultationPage from "./pages/TeleconsultationPage";

// Admin Pages
import AdminUsers from "./pages/admin/Users";
import AdminProviders from "./pages/admin/Providers";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminPayments from "./pages/admin/Payments";
import AdminPoints from "./pages/admin/Points";
import AdminSettings from "./pages/admin/Settings";
import AdminAnnouncements from "./pages/admin/Announcements";
import AdminDocuments from "./pages/admin/Documents";
import AdminDoctorApplications from "./pages/admin/DoctorApplications";
import FeatureBuilder from "./pages/admin/FeatureBuilder";
import SchemaManager from "./pages/admin/SchemaManager";

// Provider Pages
import ProviderAppointments from "./pages/provider/Appointments";
import ProviderServices from "./pages/provider/Services";
import ProviderPayments from "./pages/provider/Payments";

// Business Pages
import BusinessDashboard from "./pages/business/Dashboard";
import BusinessOnboarding from "./pages/business/Onboarding";
import BusinessInbox from "./pages/business/Inbox";
import CRMPage from "./pages/business/CRM";
import BusinessAnalytics from "./pages/business/Analytics";
import BusinessTeam from "./pages/business/Team";
import BusinessSettings from "./pages/business/Settings";
import BusinessCatalog from "./pages/business/Catalog";
import BusinessBroadcasts from "./pages/business/Broadcasts";
import BusinessGroups from "./pages/business/Groups";
import BluetoothTest from "./pages/BluetoothTest";
import Launcher from "./pages/Launcher";
import ChatrStudio from "./pages/ChatrStudio";
import FoodOrdering from "./pages/FoodOrdering";
import LocalDeals from "./pages/LocalDeals";
import Referrals from "./pages/Referrals";
import FameCam from "./pages/FameCam";
import FameLeaderboard from "./pages/FameLeaderboard";
import AIBrowser from "./pages/AIBrowser";
import AIChat from "./pages/AIChat";
import Capture from "./pages/Capture";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false, // Reduced battery drain
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchInterval: false, // Removed aggressive polling
    },
  },
});

const App = () => {
  // Enable native optimizations
  useNativeOptimizations();
  useNativePerformance();
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            
            <Route path="/launcher" element={<ProtectedRoute><Launcher /></ProtectedRoute>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/download" element={<Download />} />
            <Route path="/install" element={<Install />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<Help />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            
            {/* Consolidated Hub Routes */}
            <Route path="/health" element={<HealthHub />} />
            <Route path="/care" element={<CareAccess />} />
            <Route path="/community" element={<CommunitySpace />} />
            
            {/* New Feature Routes */}
            <Route path="/symptom-checker" element={<SymptomCheckerPage />} />
            <Route path="/health-wallet" element={<HealthWalletPage />} />
            <Route path="/teleconsultation" element={<TeleconsultationPage />} />
            
            {/* Main App Routes */}
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:conversationId" element={<Chat />} />
            <Route path="/chat/:conversationId/media" 
              Component={React.lazy(() => import('@/components/chat/MediaViewer').then(m => ({ default: m.MediaViewer })))} 
            />
            <Route path="/profile" element={<Profile />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/global-contacts" element={<GlobalContacts />} />
          <Route path="/call-history" element={<CallHistory />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/smart-inbox" element={<SmartInbox />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/communities" element={<Communities />} />
            <Route path="/create-community" element={<CreateCommunity />} />
            
            {/* Health & Wellness Routes */}
            <Route path="/wellness" element={<WellnessTracking />} />
            <Route path="/health-passport" element={<HealthPassport />} />
            <Route path="/lab-reports" element={<LabReports />} />
            <Route path="/medicine-reminders" element={<MedicineReminders />} />
            <Route path="/emergency" element={<EmergencyButton />} />
            <Route path="/emergency-services" element={<EmergencyServices />} />
            
            {/* Provider & Booking Routes */}
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/provider-portal" element={<ProviderPortal />} />
            <Route path="/provider-register" element={<ProviderRegister />} />
            <Route path="/allied-healthcare" element={<AlliedHealthcare />} />
            
            {/* Marketplace & Engagement */}
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/youth-engagement" element={<YouthEngagement />} />
            <Route path="/youth-feed" element={<YouthFeed />} />
            <Route path="/mini-apps" element={<MiniAppsStore />} />
            <Route path="/developer-portal" element={<DeveloperPortal />} />
            <Route path="/official-accounts" element={<OfficialAccounts />} />
            <Route path="/chatr-studio" element={<ChatrStudio />} />
            <Route path="/food-ordering" element={<FoodOrdering />} />
            <Route path="/local-deals" element={<LocalDeals />} />
            
            {/* Points & Payment Routes */}
            <Route path="/chatr-points" element={<ChatrPoints />} />
          <Route path="/reward-shop" element={<RewardShop />} />
          <Route path="/growth" element={<ChatrGrowth />} />
          <Route path="/ambassador-program" element={<AmbassadorProgram />} />
          <Route path="/doctor-onboarding" element={<DoctorOnboarding />} />
          <Route path="/qr-payment" element={<QRPayment />} />
            
            {/* AI & Settings Routes */}
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/home" element={<AIBrowser />} />
            <Route path="/ai-browser-home" element={<AIBrowserHome />} />
            <Route path="/ai-browser" element={<AIBrowserView />} />
            <Route path="/chat-ai" element={<AIChat />} />
            <Route path="/capture" element={<Capture />} />
            <Route path="/account" element={<Account />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/notifications/settings" element={<NotificationSettings />} />
            <Route path="/device-management" element={<DeviceManagement />} />
            <Route path="/bluetooth-test" element={<BluetoothTest />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="feature-builder" element={<FeatureBuilder />} />
              <Route path="schema-manager" element={<SchemaManager />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="providers" element={<AdminProviders />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="points" element={<AdminPoints />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="documents" element={<AdminDocuments />} />
              <Route path="doctor-applications" element={<AdminDoctorApplications />} />
              <Route path="official-accounts" element={<OfficialAccountsManager />} />
              <Route path="broadcast" element={<BroadcastManager />} />
              <Route path="brand-partnerships" element={<BrandPartnerships />} />
            </Route>
            <Route path="/chatr-tutors" element={<ChatrTutors />} />
            <Route path="/tutors" element={<ChatrTutors />} />
            <Route path="/home-services" element={<HomeServices />} />
            <Route path="/wellness-circles" element={<WellnessCircles />} />
            <Route path="/wellness-circles/:circleId" element={<WellnessCircles />} />
            <Route path="/expert-sessions" element={<ExpertSessions />} />
            
            {/* Provider Dashboard Routes */}
            <Route path="/provider/appointments" element={<ProviderAppointments />} />
            <Route path="/provider/services" element={<ProviderServices />} />
            <Route path="/provider/payments" element={<ProviderPayments />} />
            
            {/* Business Routes */}
            <Route path="/business" element={<BusinessDashboard />} />
            <Route path="/business/onboard" element={<BusinessOnboarding />} />
            <Route path="/business/inbox" element={<BusinessInbox />} />
            <Route path="/business/crm" element={<CRMPage />} />
            <Route path="/business/analytics" element={<BusinessAnalytics />} />
            <Route path="/business/team" element={<BusinessTeam />} />
            <Route path="/business/settings" element={<BusinessSettings />} />
            <Route path="/business/catalog" element={<BusinessCatalog />} />
            <Route path="/business/broadcasts" element={<BusinessBroadcasts />} />
            <Route path="/business/groups" element={<BusinessGroups />} />
            
            {/* Ecosystem Routes */}
            <Route path="/chatr-studio" element={<ProtectedRoute><ChatrStudio /></ProtectedRoute>} />
            <Route path="/food-ordering" element={<ProtectedRoute><FoodOrdering /></ProtectedRoute>} />
            <Route path="/local-deals" element={<ProtectedRoute><LocalDeals /></ProtectedRoute>} />
            <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
            
            {/* Growth System Routes */}
            <Route path="/leaderboard" element={<ChatrPoints />} />
            
            {/* FameCam Routes */}
            <Route path="/fame-cam" element={<ProtectedRoute><FameCam /></ProtectedRoute>} />
            <Route path="/fame-leaderboard" element={<ProtectedRoute><FameLeaderboard /></ProtectedRoute>} />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
