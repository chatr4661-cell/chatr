import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClickLogRequest {
  searchId: string;
  sessionId: string;
  userId?: string;
  resultUrl: string;
  resultRank: number;
  resultType: string;
  timeToClickMs?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      searchId,
      sessionId,
      userId,
      resultUrl,
      resultRank,
      resultType,
      timeToClickMs,
    }: ClickLogRequest = await req.json();

    if (!searchId || !sessionId || !resultUrl) {
      return new Response(
        JSON.stringify({ error: 'searchId, sessionId, and resultUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('click_logs').insert({
      search_id: searchId,
      user_id: userId || null,
      session_id: sessionId,
      result_rank: resultRank,
      result_url: resultUrl,
      result_type: resultType,
      time_to_click_ms: timeToClickMs || null,
    });

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Click log error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
