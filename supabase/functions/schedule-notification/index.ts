import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleRequest {
  userId: string;
  type: string;
  title: string;
  body: string;
  scheduledAt: string; // ISO timestamp
  data?: Record<string, string>;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    endDate?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, type, title, body, scheduledAt, data, recurring } = await req.json() as ScheduleRequest;

    if (!userId || !type || !title || !body || !scheduledAt) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store scheduled notification
    const { data: scheduled, error } = await supabase
      .from('scheduled_notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message: body,
        data: data || {},
        scheduled_at: scheduledAt,
        recurring_frequency: recurring?.frequency || null,
        recurring_end_date: recurring?.endDate || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('[schedule-notification] Error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[schedule-notification] Scheduled notification ${scheduled.id} for ${scheduledAt}`);

    return new Response(
      JSON.stringify({ success: true, id: scheduled.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[schedule-notification] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
