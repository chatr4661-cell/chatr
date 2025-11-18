import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Users,
  Settings,
  Plus,
  Phone,
  MapPin
} from "lucide-react";

interface Provider {
  id: string;
  business_name: string;
  description?: string;
  address?: string;
  rating_average: number;
  rating_count: number;
}

const ProviderPortal = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalRevenue: 0,
    totalPatients: 0
  });

  useEffect(() => {
    loadProviderData();
  }, []);

  const loadProviderData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Get provider profile
    const { data: providerData } = await supabase
      .from("service_providers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!providerData) {
      toast.error("Provider profile not found");
      navigate("/");
      return;
    }

    setProvider(providerData);

    // Load stats
    const today = new Date().toISOString().split("T")[0];
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("provider_id", providerData.id)
      .gte("appointment_date", today);

    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("provider_id", providerData.id);

    const { data: allAppointments } = await supabase
      .from("appointments")
      .select("patient_id")
      .eq("provider_id", providerData.id);

    setStats({
      todayAppointments: appointments?.length || 0,
      totalRevenue: payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
      totalPatients: new Set(allAppointments?.map(a => a.patient_id)).size || 0
    });

    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xs">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="flex items-center justify-between p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="h-7"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            <span className="text-xs">Back</span>
          </Button>
          <h1 className="text-sm font-bold">{provider?.business_name}</h1>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="p-3 pb-20">
        {/* Provider Info Card */}
        <Card className="p-3 mb-3 backdrop-blur-xl bg-gradient-to-br from-background/90 to-primary/5 border-border/30">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {provider?.business_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-semibold mb-0.5">{provider?.business_name}</h2>
              <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1">
                {provider?.description}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="line-clamp-1">{provider?.address}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="p-2 backdrop-blur-xl bg-gradient-to-br from-background/90 to-blue-500/5 border-blue-500/20">
            <div className="text-center">
              <Calendar className="h-3.5 w-3.5 text-blue-500 mx-auto mb-1" />
              <p className="text-sm font-bold">{stats.todayAppointments}</p>
              <p className="text-[9px] text-muted-foreground">Today</p>
            </div>
          </Card>

          <Card className="p-2 backdrop-blur-xl bg-gradient-to-br from-background/90 to-green-500/5 border-green-500/20">
            <div className="text-center">
              <DollarSign className="h-3.5 w-3.5 text-green-500 mx-auto mb-1" />
              <p className="text-sm font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground">Revenue</p>
            </div>
          </Card>

          <Card className="p-2 backdrop-blur-xl bg-gradient-to-br from-background/90 to-purple-500/5 border-purple-500/20">
            <div className="text-center">
              <Users className="h-3.5 w-3.5 text-purple-500 mx-auto mb-1" />
              <p className="text-sm font-bold">{stats.totalPatients}</p>
              <p className="text-[9px] text-muted-foreground">Patients</p>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold mb-2">Quick Actions</h3>
          
          <Card 
            className="p-3 backdrop-blur-xl bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:scale-[1.01] transition-all"
            onClick={() => navigate("/provider/appointments")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <h4 className="text-xs font-semibold">View Appointments</h4>
                  <p className="text-[10px] text-muted-foreground">Manage your schedule</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                Open
              </Button>
            </div>
          </Card>

          <Card 
            className="p-3 backdrop-blur-xl bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/20 cursor-pointer hover:scale-[1.01] transition-all"
            onClick={() => navigate("/provider/services")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-500" />
                <div>
                  <h4 className="text-xs font-semibold">Manage Services</h4>
                  <p className="text-[10px] text-muted-foreground">Add or edit services & fees</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                Open
              </Button>
            </div>
          </Card>

          <Card 
            className="p-3 backdrop-blur-xl bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-orange-500/20 cursor-pointer hover:scale-[1.01] transition-all"
            onClick={() => navigate("/provider/payments")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-orange-500" />
                <div>
                  <h4 className="text-xs font-semibold">Payment History</h4>
                  <p className="text-[10px] text-muted-foreground">View earnings & transactions</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                Open
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProviderPortal;
