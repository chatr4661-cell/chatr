import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
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
import ProviderPortal from "./pages/ProviderPortal";
import ProviderAppointments from "./pages/provider/Appointments";
import ProviderServices from "./pages/provider/Services";
import ProviderPayments from "./pages/provider/Payments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/emergency" element={<EmergencyButton />} />
          <Route path="/wellness" element={<WellnessTracking />} />
          <Route path="/youth" element={<YouthEngagement />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/allied-healthcare" element={<AlliedHealthcare />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/providers" element={<AdminProviders />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/documents" element={<AdminDocuments />} />
          <Route path="/provider-portal" element={<ProviderPortal />} />
          <Route path="/provider/appointments" element={<ProviderAppointments />} />
          <Route path="/provider/services" element={<ProviderServices />} />
          <Route path="/provider/payments" element={<ProviderPayments />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
