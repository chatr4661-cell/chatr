import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { patientId, providerId, appointmentDate, appointmentType } = await req.json();

    // Check provider availability
    const { data: existingAppointments } = await supabase
      .from("healthcare_appointments")
      .select("*")
      .eq("provider_id", providerId)
      .eq("appointment_date", appointmentDate)
      .in("status", ["scheduled", "confirmed"]);

    if (existingAppointments && existingAppointments.length > 0) {
      return new Response(
        JSON.stringify({ error: "Time slot not available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create appointment
    const { data: appointment, error } = await supabase
      .from("healthcare_appointments")
      .insert({
        patient_id: patientId,
        provider_id: providerId,
        appointment_date: appointmentDate,
        appointment_type: appointmentType,
        status: "scheduled"
      })
      .select()
      .single();

    if (error) throw error;

    // Send notification to provider
    await supabase
      .from("notifications")
      .insert({
        user_id: providerId,
        title: "New Appointment Booking",
        message: `New ${appointmentType} appointment scheduled`,
        type: "appointment",
        data: { appointmentId: appointment.id }
      });

    return new Response(
      JSON.stringify({ success: true, appointment }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
