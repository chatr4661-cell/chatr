import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";

export function AppointmentBooking() {
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [appointmentType, setAppointmentType] = useState<"in-person" | "video" | "phone">("video");
  const [loading, setLoading] = useState(false);

  const { data: providers } = useQuery({
    queryKey: ["healthcare-providers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_providers")
        .select("id, business_name, user_id");
      return data || [];
    }
  });

  const handleBooking = async () => {
    if (!selectedProvider || !selectedDate) {
      toast.error("Please select a provider and date");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("healthcare-booking", {
        body: {
          patientId: user.id,
          providerId: selectedProvider,
          appointmentDate: selectedDate.toISOString(),
          appointmentType,
        }
      });

      if (error) throw error;

      toast.success("Appointment booked successfully!");
      setSelectedProvider("");
      setSelectedDate(undefined);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book Appointment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Provider</label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a healthcare provider" />
            </SelectTrigger>
            <SelectContent>
              {providers?.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.business_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Appointment Type</label>
          <Select value={appointmentType} onValueChange={(val: any) => setAppointmentType(val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video Call</SelectItem>
              <SelectItem value="phone">Phone Call</SelectItem>
              <SelectItem value="in-person">In-Person</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Select Date</label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date()}
            className="rounded-md border"
          />
        </div>

        <Button onClick={handleBooking} disabled={loading} className="w-full">
          {loading ? "Booking..." : "Book Appointment"}
        </Button>
      </CardContent>
    </Card>
  );
}
