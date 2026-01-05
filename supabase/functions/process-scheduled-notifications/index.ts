import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Get pending scheduled notifications that are due
    const { data: pendingNotifications, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (error) {
      console.error('[process-scheduled] Error fetching:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingNotifications?.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-scheduled] Processing ${pendingNotifications.length} notifications`);

    let processedCount = 0;
    let errorCount = 0;

    for (const notification of pendingNotifications) {
      try {
        // Send the notification
        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-module-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            userId: notification.user_id,
            type: notification.type,
            title: notification.title,
            body: notification.message,
            data: notification.data
          })
        });

        if (sendResponse.ok) {
          processedCount++;

          // Handle recurring notifications
          if (notification.recurring_frequency) {
            const nextDate = calculateNextDate(
              notification.scheduled_at,
              notification.recurring_frequency
            );

            // Check if within end date
            if (!notification.recurring_end_date || new Date(nextDate) <= new Date(notification.recurring_end_date)) {
              // Create next scheduled notification
              await supabase
                .from('scheduled_notifications')
                .insert({
                  user_id: notification.user_id,
                  type: notification.type,
                  title: notification.title,
                  message: notification.message,
                  data: notification.data,
                  scheduled_at: nextDate,
                  recurring_frequency: notification.recurring_frequency,
                  recurring_end_date: notification.recurring_end_date,
                  status: 'pending'
                });
            }
          }

          // Mark as sent
          await supabase
            .from('scheduled_notifications')
            .update({ status: 'sent', sent_at: now })
            .eq('id', notification.id);
        } else {
          errorCount++;
          await supabase
            .from('scheduled_notifications')
            .update({ status: 'failed' })
            .eq('id', notification.id);
        }
      } catch (err) {
        errorCount++;
        console.error(`[process-scheduled] Error processing ${notification.id}:`, err);
      }
    }

    console.log(`[process-scheduled] Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ success: true, processed: processedCount, errors: errorCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[process-scheduled] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateNextDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
  }
  
  return date.toISOString();
}
