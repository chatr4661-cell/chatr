import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { ChatProvider } from "@/contexts/ChatContext";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import QRPayment from "./pages/QRPayment";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Onboarding from "./pages/Onboarding";
import LabReports from "./pages/LabReports";
import MedicineReminders from "./pages/MedicineReminders";
import YouthFeed from "./pages/YouthFeed";
import ProviderRegister from "./pages/ProviderRegister";
import AIAssistant from "./pages/AIAssistant";
import BookingPage from "./pages/BookingPage";
import EmergencyButton from "./pages/EmergencyButton";
import WellnessTracking from "./pages/WellnessTracking";
import YouthEngagement from "./pages/YouthEngagement";
import Marketplace from "./pages/Marketplace";
import AlliedHealthcare from "./pages/AlliedHealthcare";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProviders from "./pages/admin/Providers";
import AdminPayments from "./pages/admin/Payments";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminDocuments from "./pages/admin/Documents";
import AdminPoints from "./pages/admin/Points";
import AdminSettings from "./pages/admin/Settings";
import AdminUsers from "./pages/admin/Users";
import AdminAnnouncements from "./pages/admin/Announcements";
import ProviderPortal from "./pages/ProviderPortal";
import ProviderAppointments from "./pages/provider/Appointments";
import ProviderServices from "./pages/provider/Services";
import ProviderPayments from "./pages/provider/Payments";
import ChatrPoints from "./pages/ChatrPoints";
import QRLogin from "./pages/QRLogin";
import HealthPassport from "./pages/HealthPassport";
import Contacts from "./pages/Contacts";
import Download from "./pages/Download";
import CallHistory from "./pages/CallHistory";
import GlobalContacts from "./pages/GlobalContacts";
import Stories from "./pages/Stories";
import DeviceManagement from "./pages/DeviceManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = React.useState<any>(null);
  const [profile, setProfile] = React.useState<any>(null);

  React.useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      
      if (user) {
        // Get user profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BrowserRouter>
          <ChatProvider>
            <AppLayout user={user} profile={profile}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/lab-reports" element={<LabReports />} />
              <Route path="/medicine-reminders" element={<MedicineReminders />} />
              <Route path="/youth-feed" element={<YouthFeed />} />
              <Route path="/qr-payment" element={<QRPayment />} />
              <Route path="/provider-register" element={<ProviderRegister />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/emergency" element={<EmergencyButton />} />
              <Route path="/wellness" element={<WellnessTracking />} />
              <Route path="/youth" element={<YouthEngagement />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/allied-healthcare" element={<AlliedHealthcare />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/announcements" element={<AdminAnnouncements />} />
              <Route path="/admin/providers" element={<AdminProviders />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/documents" element={<AdminDocuments />} />
              <Route path="/admin/points" element={<AdminPoints />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/provider-portal" element={<ProviderPortal />} />
              <Route path="/provider/appointments" element={<ProviderAppointments />} />
              <Route path="/provider/services" element={<ProviderServices />} />
              <Route path="/provider/payments" element={<ProviderPayments />} />
              <Route path="/chatr-points" element={<ChatrPoints />} />
              <Route path="/qr-login" element={<QRLogin />} />
              <Route path="/health-passport" element={<HealthPassport />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/global-contacts" element={<GlobalContacts />} />
              <Route path="/stories" element={<Stories />} />
              <Route path="/call-history" element={<CallHistory />} />
              <Route path="/device-management" element={<DeviceManagement />} />
              <Route path="/download" element={<Download />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
          </ChatProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
