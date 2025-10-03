import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, Users, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProviders: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    revenueData: [] as any[],
    appointmentData: [] as any[],
    topProviders: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get total providers
      const { count: providerCount } = await supabase
        .from("service_providers")
        .select("*", { count: "exact", head: true });

      // Get total appointments
      const { count: appointmentCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true });

      // Get total revenue
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, created_at, payment_status");

      const totalRevenue = payments
        ?.filter(p => p.payment_status === "completed")
        .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0) || 0;

      // Revenue by day (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const revenueByDay = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: payments
          ?.filter(p => p.created_at.startsWith(date) && p.payment_status === "completed")
          .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0
      }));

      // Appointments by day
      const { data: appointments } = await supabase
        .from("appointments")
        .select("appointment_date, status");

      const appointmentsByDay = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: appointments?.filter(a => a.appointment_date.startsWith(date)).length || 0
      }));

      // Top providers by revenue
      const { data: topProvidersData } = await supabase
        .from("payments")
        .select(`
          provider_id,
          amount,
          payment_status,
          service_providers (
            business_name
          )
        `)
        .eq("payment_status", "completed");

      const providerRevenue = topProvidersData?.reduce((acc: any, payment: any) => {
        const providerId = payment.provider_id;
        if (!acc[providerId]) {
          acc[providerId] = {
            name: payment.service_providers?.business_name || "Unknown",
            revenue: 0
          };
        }
        acc[providerId].revenue += parseFloat(payment.amount.toString());
        return acc;
      }, {});

      const topProviders = Object.values(providerRevenue || {})
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        totalUsers: userCount || 0,
        totalProviders: providerCount || 0,
        totalAppointments: appointmentCount || 0,
        totalRevenue,
        revenueData: revenueByDay,
        appointmentData: appointmentsByDay,
        topProviders
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-xs text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin")}
            className="h-6 px-2"
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <h1 className="text-sm font-bold">Analytics & Reports</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">Total Users</span>
            </div>
            <p className="text-lg font-bold">{stats.totalUsers}</p>
          </Card>
          <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              <span className="text-[10px] text-muted-foreground">Providers</span>
            </div>
            <p className="text-lg font-bold">{stats.totalProviders}</p>
          </Card>
          <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[10px] text-muted-foreground">Appointments</span>
            </div>
            <p className="text-lg font-bold">{stats.totalAppointments}</p>
          </Card>
          <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-[10px] text-muted-foreground">Revenue</span>
            </div>
            <p className="text-lg font-bold">₹{stats.totalRevenue.toFixed(2)}</p>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10 mb-3">
          <h3 className="text-xs font-semibold mb-2">Revenue (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={stats.revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#888" />
              <YAxis tick={{ fontSize: 9 }} stroke="#888" />
              <Tooltip contentStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Appointments Chart */}
        <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10 mb-3">
          <h3 className="text-xs font-semibold mb-2">Appointments (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={stats.appointmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#888" />
              <YAxis tick={{ fontSize: 9 }} stroke="#888" />
              <Tooltip contentStyle={{ fontSize: 10 }} />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Providers */}
        <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
          <h3 className="text-xs font-semibold mb-2">Top Providers by Revenue</h3>
          <div className="space-y-2">
            {stats.topProviders.map((provider: any, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-[10px]">{provider.name}</span>
                </div>
                <span className="text-[10px] font-semibold">₹{provider.revenue.toFixed(2)}</span>
              </div>
            ))}
            {stats.topProviders.length === 0 && (
              <div className="text-center text-[10px] text-muted-foreground py-4">
                No data available
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}