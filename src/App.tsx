// Full Chatr App - Restored: 2025-10-10T18:01:00Z
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

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
import ChatrPoints from "./pages/ChatrPoints";
import QRPayment from "./pages/QRPayment";
import QRLogin from "./pages/QRLogin";
import AIAssistant from "./pages/AIAssistant";
import Account from "./pages/Account";
import Privacy from "./pages/Privacy";
import NotificationSettings from "./pages/NotificationSettings";
import Notifications from "./pages/Notifications";
import DeviceManagement from "./pages/DeviceManagement";
import Download from "./pages/Download";
import Onboarding from "./pages/Onboarding";
import EmergencyButton from "./pages/EmergencyButton";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

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
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/download" element={<Download />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/privacy" element={<Privacy />} />
            
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
            
            {/* Provider Dashboard Routes */}
            <Route path="/provider/appointments" element={<ProviderAppointments />} />
            <Route path="/provider/services" element={<ProviderServices />} />
            <Route path="/provider/payments" element={<ProviderPayments />} />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          <Toaster />
          <Sonner />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
