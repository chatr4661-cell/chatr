import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Users, 
  Building2, 
  DollarSign, 
  Calendar,
  ArrowLeft,
  Upload,
  Plus,
  BarChart3,
  CreditCard,
  Coins
} from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProviders: 0,
    totalAppointments: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    checkAdminAccess();
    loadStats();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAdminRole = roles?.some(r => r.role === "admin");
    if (!hasAdminRole) {
      toast.error("Access denied - Admin only");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  const loadStats = async () => {
    const [users, providers, appointments, payments] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("service_providers").select("id", { count: "exact", head: true }),
      supabase.from("appointments").select("id", { count: "exact", head: true }),
      supabase.from("payments").select("amount")
    ]);

    setStats({
      totalUsers: users.count || 0,
      totalProviders: providers.count || 0,
      totalAppointments: appointments.count || 0,
      totalRevenue: payments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xs">Loading...</div>;
  }

  if (!isAdmin) return null;

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
          <h1 className="text-sm font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="p-3 pb-20 max-w-6xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Card className="p-3 backdrop-blur-xl bg-gradient-to-br from-background/90 to-primary/5 border-border/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Users className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total Users</p>
                <p className="text-sm font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 backdrop-blur-xl bg-gradient-to-br from-background/90 to-primary/5 border-border/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <Building2 className="h-3.5 w-3.5 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Providers</p>
                <p className="text-sm font-bold">{stats.totalProviders}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 backdrop-blur-xl bg-gradient-to-br from-background/90 to-primary/5 border-border/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Calendar className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Appointments</p>
                <p className="text-sm font-bold">{stats.totalAppointments}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 backdrop-blur-xl bg-gradient-to-br from-background/90 to-primary/5 border-border/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <DollarSign className="h-3.5 w-3.5 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Revenue</p>
                <p className="text-sm font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="space-y-2">
          <Card 
            className="p-3 backdrop-blur-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/20 cursor-pointer hover:scale-[1.01] transition-all"
            onClick={() => navigate("/admin/providers")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-500" />
                <div>
                  <h3 className="text-xs font-semibold">Add Providers</h3>
                  <p className="text-[10px] text-muted-foreground">Manage service providers</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                Open
              </Button>
            </div>
          </Card>

          <Card 
            className="p-3 backdrop-blur-xl bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/20 cursor-pointer hover:scale-[1.01] transition-all"
            onClick={() => navigate("/admin/payments")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-green-500" />
                <div>
                  <h3 className="text-xs font-semibold">Payment Management</h3>
                  <p className="text-[10px] text-muted-foreground">Track and manage payments</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                Open
              </Button>
            </div>
          </Card>

          <Card 
            className="p-3 backdrop-blur-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-500/20 cursor-pointer hover:scale-[1.01] transition-all"
            onClick={() => navigate("/admin/analytics")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                <div>
                  <h3 className="text-xs font-semibold">Analytics & Reports</h3>
                  <p className="text-[10px] text-muted-foreground">View detailed analytics</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                Open
              </Button>
            </div>
          </Card>

          <Card 
            className="p-3 backdrop-blur-xl bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-500/20 cursor-pointer hover:scale-[1.01] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-orange-500" />
                <div>
                  <h3 className="text-xs font-semibold">Upload Documents</h3>
                  <p className="text-[10px] text-muted-foreground">Upload provider certificates</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]">
                Upload
              </Button>
            </div>
          </Card>

          <Card 
            className="p-3 backdrop-blur-xl bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/20 cursor-pointer hover:scale-[1.01] transition-all"
            onClick={() => navigate("/admin/points")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-500" />
                <div>
                  <h3 className="text-xs font-semibold">Chatr Points</h3>
                  <p className="text-[10px] text-muted-foreground">Manage points economy</p>
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

export default AdminDashboard;
