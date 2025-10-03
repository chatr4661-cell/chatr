import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, DollarSign, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ProviderPayments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayments: 0,
    completedPayments: 0,
    chartData: [] as any[]
  });

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: provider } = await supabase
        .from("service_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!provider) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          appointments (
            appointment_date
          ),
          services (
            name
          )
        `)
        .eq("provider_id", provider.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);

      // Calculate stats
      const total = data
        ?.filter(p => p.payment_status === "completed")
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

      const pending = data
        ?.filter(p => p.payment_status === "pending")
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

      const completed = data?.filter(p => p.payment_status === "completed").length || 0;

      // Chart data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const chartData = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        earnings: data
          ?.filter(p => p.created_at.startsWith(date) && p.payment_status === "completed")
          .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0
      }));

      setStats({
        totalEarnings: total,
        pendingPayments: pending,
        completedPayments: completed,
        chartData
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-xs text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/provider-portal")}
            className="h-6 px-2"
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <h1 className="text-sm font-bold">Payment History</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-green-500" />
              <span className="text-[10px] text-muted-foreground">Total Earnings</span>
            </div>
            <p className="text-lg font-bold">₹{stats.totalEarnings.toFixed(2)}</p>
          </Card>
          <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-[10px] text-muted-foreground">Pending</span>
            </div>
            <p className="text-lg font-bold">₹{stats.pendingPayments.toFixed(2)}</p>
          </Card>
        </div>

        {/* Earnings Chart */}
        <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10 mb-3">
          <h3 className="text-xs font-semibold mb-2">Earnings (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#888" />
              <YAxis tick={{ fontSize: 9 }} stroke="#888" />
              <Tooltip contentStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment List */}
        <h2 className="text-xs font-semibold mb-2">Recent Payments</h2>
        <div className="space-y-2">
          {payments.map((payment) => (
            <Card key={payment.id} className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xs font-semibold">₹{parseFloat(payment.amount.toString()).toFixed(2)}</h3>
                    <Badge variant={getStatusColor(payment.payment_status)} className="h-4 px-1.5 text-[10px]">
                      {payment.payment_status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {payment.services?.name || "Service"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {payment.payment_method || "N/A"}
                  </p>
                  {payment.transaction_id && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      Txn: {payment.transaction_id}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
          {payments.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No payments found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}