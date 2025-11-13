// Search Alerts Notifier - Checks saved searches and sends notifications
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all saved searches with notifications enabled
    const { data: savedSearches, error: fetchError } = await supabaseClient
      .from('saved_searches')
      .select('*')
      .eq('notification_enabled', true)
      .or('notification_frequency.eq.instant,last_notification_sent.lt.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}'); // Daily or instant

    if (fetchError) throw fetchError;

    if (!savedSearches || savedSearches.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active saved searches with notifications' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notifications: any[] = [];

    for (const savedSearch of savedSearches) {
      // Search for new results
      const { data: searchData } = await supabaseClient.functions.invoke('universal-search-engine', {
        body: {
          query: savedSearch.query,
          userId: savedSearch.user_id
        }
      });

      if (searchData && searchData.results) {
        const newResultsCount = searchData.results.length;
        const previousCount = savedSearch.results_count || 0;

        if (newResultsCount > previousCount) {
          // New results found!
          const newCount = newResultsCount - previousCount;

          // Create alert
          const { data: alertData } = await supabaseClient
            .from('search_alerts')
            .insert({
              user_id: savedSearch.user_id,
              saved_search_id: savedSearch.id,
              new_results_count: newCount,
              alert_type: 'new_results',
              alert_data: {
                query: savedSearch.query,
                new_results: searchData.results.slice(0, newCount)
              }
            })
            .select()
            .single();

          // Update saved search
          await supabaseClient
            .from('saved_searches')
            .update({
              results_count: newResultsCount,
              last_notification_sent: new Date().toISOString()
            })
            .eq('id', savedSearch.id);

          // Send push notification (if configured)
          try {
            await supabaseClient.functions.invoke('send-push-notification', {
              body: {
                userId: savedSearch.user_id,
                title: '🔔 New Search Results',
                body: `${newCount} new results for "${savedSearch.query}"`,
                data: {
                  type: 'search_alert',
                  search_id: savedSearch.id,
                  alert_id: alertData?.id
                }
              }
            });
          } catch (notifError) {
            console.error('Push notification error:', notifError);
          }

          notifications.push({
            search: savedSearch.query,
            new_results: newCount,
            alert_created: true
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        processed: savedSearches.length,
        notifications_sent: notifications.length,
        notifications
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search alerts error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
