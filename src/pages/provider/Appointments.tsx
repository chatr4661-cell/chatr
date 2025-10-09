import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, X, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProviderAppointments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadAppointments();

    // Real-time subscription
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          loadAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const loadAppointments = async () => {
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

      let query = supabase
        .from("appointments")
        .select(`
          *,
          profiles!appointments_patient_id_fkey (
            username,
            phone_number
          ),
          services (
            name,
            price
          )
        `)
        .eq("provider_id", provider.id)
        .order("appointment_date", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setAppointments(data || []);
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

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;
      toast({ title: `Appointment ${newStatus}` });
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
      case "confirmed": return "default";
      case "pending": return "secondary";
      case "completed": return "outline";
      case "cancelled": return "destructive";
      default: return "secondary";
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
          <h1 className="text-sm font-bold">My Appointments</h1>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xs font-semibold">
                        {appointment.profiles?.username || "Patient"}
                      </h3>
                      <Badge variant={getStatusColor(appointment.status)} className="h-4 px-1.5 text-[10px]">
                        {appointment.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {appointment.services?.name || "General Consultation"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      📅 {new Date(appointment.appointment_date).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ⏱️ {appointment.duration_minutes} mins
                    </p>
                    {appointment.profiles?.phone_number && (
                      <p className="text-[10px] text-muted-foreground">
                        📞 {appointment.profiles.phone_number}
                      </p>
                    )}
                    {appointment.notes && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Note: {appointment.notes}
                      </p>
                    )}
                    {appointment.services?.price && (
                      <p className="text-[10px] font-semibold mt-1">
                        ₹{appointment.services.price}
                      </p>
                    )}
                  </div>
                  {appointment.status === "pending" && (
                    <div className="flex gap-1">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => updateStatus(appointment.id, "confirmed")}
                        className="h-6 px-2"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => updateStatus(appointment.id, "cancelled")}
                        className="h-6 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {appointment.status === "confirmed" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => updateStatus(appointment.id, "completed")}
                      className="h-6 px-2 text-[10px]"
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {appointments.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No appointments found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}