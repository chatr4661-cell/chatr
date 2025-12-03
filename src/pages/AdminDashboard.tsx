import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Users, 
  Building2, 
  DollarSign, 
  Calendar,
  BarChart3,
  CreditCard,
  Coins,
  Settings,
  Megaphone,
  UserCog,
  MessageCircle,
  Upload,
  CheckSquare
} from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProviders: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    newUsersToday: 0,
    pendingAppointments: 0,
    successfulPayments: 0,
    totalMessages: 0,
    totalConversations: 0
  });

  useEffect(() => {
    checkAdminAccess();
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
    await loadStats();
    setLoading(false);
  };

  const loadStats = async () => {
    const [users, providers, appointments, payments, messages, conversations] = await Promise.all([
      supabase.from("profiles").select("id, created_at", { count: "exact" }),
      supabase.from("service_providers").select("id", { count: "exact", head: true }),
      supabase.from("appointments").select("id, status", { count: "exact" }),
      supabase.from("payments").select("amount, payment_status"),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("conversations").select("id", { count: "exact", head: true })
    ]);

    const today = new Date().toISOString().split('T')[0];
    const newUsersToday = users.data?.filter(u => u.created_at?.startsWith(today)).length || 0;
    const pendingAppointments = appointments.data?.filter((a: any) => a.status === 'pending').length || 0;
    const totalRevenue = payments.data?.filter((p: any) => p.payment_status === 'completed')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    const successfulPayments = payments.data?.filter((p: any) => p.payment_status === 'completed').length || 0;

    setStats({
      totalUsers: users.count || 0,
      totalProviders: providers.count || 0,
      totalAppointments: appointments.count || 0,
      totalRevenue,
      newUsersToday,
      pendingAppointments,
      successfulPayments,
      totalMessages: messages.count || 0,
      totalConversations: conversations.count || 0
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Manage and monitor your platform</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
              <p className="text-xs text-primary mt-1">+{stats.newUsersToday} today</p>
            </div>
            <Users className="h-10 w-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Providers</p>
              <p className="text-3xl font-bold mt-1">{stats.totalProviders}</p>
            </div>
            <Building2 className="h-10 w-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Appointments</p>
              <p className="text-3xl font-bold mt-1">{stats.totalAppointments}</p>
              <p className="text-xs text-orange-500 mt-1">{stats.pendingAppointments} pending</p>
            </div>
            <Calendar className="h-10 w-10 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-3xl font-bold mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-green-500 mt-1">{stats.successfulPayments} payments</p>
            </div>
            <DollarSign className="h-10 w-10 text-primary opacity-20" />
          </div>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Messages</p>
              <p className="text-2xl font-bold mt-1">{stats.totalMessages.toLocaleString()}</p>
            </div>
            <MessageCircle className="h-8 w-8 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Conversations</p>
              <p className="text-2xl font-bold mt-1">{stats.totalConversations.toLocaleString()}</p>
            </div>
            <Users className="h-8 w-8 text-primary opacity-20" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
            onClick={() => navigate("/admin/users")}
          >
            <Users className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">User Management</h3>
            <p className="text-sm text-muted-foreground">View and manage all users</p>
          </Card>

          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
            onClick={() => navigate("/admin/announcements")}
          >
            <Megaphone className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Announcements</h3>
            <p className="text-sm text-muted-foreground">Create platform announcements</p>
          </Card>

          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
            onClick={() => navigate("/admin/payments")}
          >
            <CreditCard className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Payment Management</h3>
            <p className="text-sm text-muted-foreground">Review and process payments</p>
          </Card>

          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
            onClick={() => navigate("/admin/analytics")}
          >
            <BarChart3 className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Analytics</h3>
            <p className="text-sm text-muted-foreground">View detailed analytics</p>
          </Card>

          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
            onClick={() => navigate("/admin/providers")}
          >
            <Building2 className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Service Providers</h3>
            <p className="text-sm text-muted-foreground">Manage healthcare providers</p>
          </Card>

          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
            onClick={() => navigate("/admin/points")}
          >
            <Coins className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Points System</h3>
            <p className="text-sm text-muted-foreground">Manage Chatr Coins</p>
          </Card>

          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
            onClick={() => navigate("/admin/documents")}
          >
            <Upload className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Documents</h3>
            <p className="text-sm text-muted-foreground">Upload provider certificates</p>
          </Card>

          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
            onClick={() => navigate("/admin/doctor-applications")}
          >
            <UserCog className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Doctor Applications</h3>
            <p className="text-sm text-muted-foreground">Review doctor applications</p>
          </Card>

          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
            onClick={() => navigate("/admin/settings")}
          >
            <Settings className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Settings</h3>
            <p className="text-sm text-muted-foreground">Configure admin settings</p>
          </Card>

          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
            onClick={() => navigate("/admin/app-approvals")}
          >
            <CheckSquare className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">App Approvals</h3>
            <p className="text-sm text-muted-foreground">Review mini-app submissions</p>
          </Card>

          <Card 
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary"
            onClick={() => navigate("/admin/kyc-approvals")}
          >
            <UserCog className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">KYC Approvals</h3>
            <p className="text-sm text-muted-foreground">Review identity verification</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
