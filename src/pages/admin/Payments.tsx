import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminPayments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const loadPayments = async () => {
    try {
      let query = supabase
        .from("payments")
        .select(`
          *,
          appointments (
            appointment_date,
            notes
          ),
          service_providers (
            business_name
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("payment_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayments(data || []);
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

  const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("payments")
        .update({ payment_status: newStatus })
        .eq("id", paymentId);

      if (error) throw error;
      toast({ title: "Payment status updated" });
      loadPayments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
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

  const totalRevenue = payments
    .filter(p => p.payment_status === "completed")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

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
          <h1 className="text-sm font-bold">Payment Management</h1>
        </div>

        <Card className="p-3 backdrop-blur-xl bg-white/5 border-white/10 mb-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Total Revenue</p>
              <p className="text-lg font-bold">₹{totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Total Payments</p>
              <p className="text-lg font-bold">{payments.length}</p>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {payments.map((payment) => (
            <Card key={payment.id} className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xs font-semibold">₹{parseFloat(payment.amount).toFixed(2)}</h3>
                      <Badge variant={getStatusColor(payment.payment_status)} className="h-4 px-1.5 text-[10px]">
                        {payment.payment_status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {payment.service_providers?.business_name || "N/A"}
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
                  <div className="flex gap-1">
                    {payment.payment_status === "pending" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => updatePaymentStatus(payment.id, "completed")}
                          className="h-6 px-2 text-[10px]"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => updatePaymentStatus(payment.id, "failed")}
                          className="h-6 px-2 text-[10px]"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
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