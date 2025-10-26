import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active chat brand triggers
    const { data: triggers, error } = await supabase
      .from('chat_brand_triggers')
      .select('*, brand_partnerships!inner(*)')
      .eq('brand_partnerships.status', 'active')
      .gte('brand_partnerships.budget_remaining', 10);

    if (error || !triggers) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const suggestions = [];
    const messageLower = message.toLowerCase();

    for (const trigger of triggers) {
      // Check if message contains any trigger keywords
      const matched = trigger.trigger_keywords.some((keyword: string) => 
        messageLower.includes(keyword.toLowerCase())
      );

      if (matched) {
        // Check daily limit
        const today = new Date().toISOString().split('T')[0];
        if (trigger.last_reset_date !== today) {
          // Reset counter for new day
          await supabase
            .from('chat_brand_triggers')
            .update({ current_daily_count: 0, last_reset_date: today })
            .eq('id', trigger.id);
          trigger.current_daily_count = 0;
        }

        if (trigger.current_daily_count < trigger.max_daily_triggers) {
          suggestions.push({
            brand_id: trigger.brand_id,
            brand_name: trigger.brand_partnerships.brand_name,
            response_type: trigger.response_type,
            response_asset_url: trigger.response_asset_url,
            trigger_id: trigger.id
          });

          // Increment counter
          await supabase
            .from('chat_brand_triggers')
            .update({ current_daily_count: trigger.current_daily_count + 1 })
            .eq('id', trigger.id);

          // Track impression
          await supabase.rpc('track_brand_impression', {
            p_brand_id: trigger.brand_id,
            p_placement_id: null,
            p_user_id: null,
            p_impression_type: 'view',
            p_detected_object: 'chat_mention',
            p_duration: 0
          });

          // Only return first match
          break;
        }
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-chat-brands:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
