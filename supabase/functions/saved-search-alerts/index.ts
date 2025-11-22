import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running Saved Search Alerts Check...');

    // Get all active saved searches that need notifications
    const now = new Date();
    const { data: savedSearches, error } = await supabase
      .from('saved_searches')
      .select('*, profiles(username, email)')
      .eq('is_active', true)
      .eq('notification_enabled', true);

    if (error) {
      console.error('Error fetching saved searches:', error);
      throw error;
    }

    console.log(`Found ${savedSearches?.length || 0} active saved searches`);

    let notificationsSent = 0;

    for (const search of savedSearches || []) {
      // Check if notification is due
      const shouldNotify = checkNotificationDue(search);

      if (!shouldNotify) continue;

      // Run the search
      const searchResults = await runSearch(supabase, search);

      // Check if there are new results
      const hasNewResults = searchResults.length > 0;

      if (hasNewResults) {
        // Send notification
        await sendNotification(supabase, search, searchResults);
        notificationsSent++;

        // Update last_notified_at
        await supabase
          .from('saved_searches')
          .update({ last_notified_at: now.toISOString() })
          .eq('id', search.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Checked ${savedSearches?.length || 0} saved searches, sent ${notificationsSent} notifications`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Saved Search Alerts Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function checkNotificationDue(search: any): boolean {
  if (!search.last_notified_at) return true;

  const lastNotified = new Date(search.last_notified_at);
  const now = new Date();
  const hoursSince = (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60);

  switch (search.notification_frequency) {
    case 'instant':
      return hoursSince >= 1; // Check every hour for instant
    case 'daily':
      return hoursSince >= 24;
    case 'weekly':
      return hoursSince >= 168; // 7 days
    default:
      return false;
  }
}

async function runSearch(supabase: any, search: any) {
  const { query_text, search_type, filters } = search;

  let results: any[] = [];

  // Search based on type
  if (search_type === 'local' || search_type === 'all') {
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .or(`name.ilike.%${query_text}%,description.ilike.%${query_text}%`)
      .eq('is_active', true)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .limit(5);

    results.push(...(services || []));
  }

  if (search_type === 'jobs' || search_type === 'all') {
    const { data: jobs } = await supabase
      .from('jobs_clean_master')
      .select('*')
      .or(`title.ilike.%${query_text}%,description.ilike.%${query_text}%`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(5);

    results.push(...(jobs || []));
  }

  return results;
}

async function sendNotification(supabase: any, search: any, results: any[]) {
  const { user_id, query_text } = search;

  await supabase
    .from('notifications')
    .insert({
      user_id,
      title: '🔔 New Results for Your Saved Search',
      message: `We found ${results.length} new result(s) for "${query_text}"`,
      type: 'saved_search_alert',
      data: {
        search_id: search.id,
        query: query_text,
        result_count: results.length,
        results: results.slice(0, 3) // Include top 3 results
      },
      read: false
    });

  console.log(`Sent notification for search: ${query_text}`);
}