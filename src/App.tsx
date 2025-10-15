import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import React from "react";

const GlobalCallListener = React.lazy(() => 
  import("@/components/calling/GlobalCallListener").then(module => ({ 
    default: module.GlobalCallListener 
  }))
);

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Contacts from "./pages/Contacts";
import GlobalContacts from "./pages/GlobalContacts";
import CallHistory from "./pages/CallHistory";
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
import QRPayment from "./pages/QRPayment";
import HomeServices from "./pages/HomeServices";
import QRLogin from "./pages/QRLogin";
import AIAssistant from "./pages/AIAssistant";
import Account from "./pages/Account";
import Privacy from "./pages/Privacy";
import NotificationSettings from "./pages/NotificationSettings";
import Notifications from "./pages/Notifications";
import DeviceManagement from "./pages/DeviceManagement";
import Download from "./pages/Download";
import Install from "./pages/Install";
import Onboarding from "./pages/Onboarding";
import EmergencyButton from "./pages/EmergencyButton";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

// Consolidated Hub Pages
import HealthHub from "./pages/HealthHub";
import CareAccess from "./pages/CareAccess";
import CommunitySpace from "./pages/CommunitySpace";

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

// Provider Pages
import ProviderAppointments from "./pages/provider/Appointments";
import ProviderServices from "./pages/provider/Services";
import ProviderPayments from "./pages/provider/Payments";

// Business Pages
import BusinessDashboard from "./pages/business/Dashboard";
import BusinessOnboarding from "./pages/business/Onboarding";
import BusinessInbox from "./pages/business/Inbox";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BrowserRouter>
          <React.Suspense fallback={null}>
            <GlobalCallListener />
          </React.Suspense>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/download" element={<Download />} />
            <Route path="/install" element={<Install />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/privacy" element={<Privacy />} />
            
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
            <Route path="/profile" element={<Profile />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/global-contacts" element={<GlobalContacts />} />
            <Route path="/call-history" element={<CallHistory />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/communities" element={<Communities />} />
            <Route path="/create-community" element={<CreateCommunity />} />
            
            {/* Health & Wellness Routes */}
            <Route path="/wellness" element={<WellnessTracking />} />
            <Route path="/health-passport" element={<HealthPassport />} />
            <Route path="/lab-reports" element={<LabReports />} />
            <Route path="/medicine-reminders" element={<MedicineReminders />} />
            <Route path="/emergency" element={<EmergencyButton />} />
            
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
            
            {/* Points & Payment Routes */}
            <Route path="/chatr-points" element={<ChatrPoints />} />
            <Route path="/qr-payment" element={<QRPayment />} />
            <Route path="/qr-login" element={<QRLogin />} />
            
            {/* AI & Settings Routes */}
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/account" element={<Account />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/device-management" element={<DeviceManagement />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/providers" element={<AdminProviders />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/points" element={<AdminPoints />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
            <Route path="/admin/documents" element={<AdminDocuments />} />
            <Route path="/admin/official-accounts" element={<OfficialAccountsManager />} />
            <Route path="/admin/broadcast" element={<BroadcastManager />} />
            <Route path="/chatr-tutors" element={<ChatrTutors />} />
            <Route path="/tutors" element={<ChatrTutors />} />
            <Route path="/home-services" element={<HomeServices />} />
            
            {/* Provider Dashboard Routes */}
            <Route path="/provider/appointments" element={<ProviderAppointments />} />
            <Route path="/provider/services" element={<ProviderServices />} />
            <Route path="/provider/payments" element={<ProviderPayments />} />
            
            {/* Business Routes */}
            <Route path="/business" element={<BusinessDashboard />} />
            <Route path="/business/onboard" element={<BusinessOnboarding />} />
            <Route path="/business/inbox" element={<BusinessInbox />} />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
