import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { source, vitals } = await req.json();

    if (!source || !vitals || !Array.isArray(vitals)) {
      throw new Error('Invalid data format. Expected { source, vitals: [] }');
    }

    // Validate source
    const validSources = ['apple_health', 'google_fit', 'device', 'manual'];
    if (!validSources.includes(source)) {
      throw new Error(`Invalid source. Must be one of: ${validSources.join(', ')}`);
    }

    // Process and insert vitals
    const vitalRecords = vitals.map((vital: any) => ({
      user_id: user.id,
      vital_type: vital.type,
      value: vital.value,
      recorded_at: vital.recorded_at || new Date().toISOString(),
      source,
      notes: vital.notes
    }));

    const { data: insertedVitals, error: insertError } = await supabase
      .from('health_vitals')
      .insert(vitalRecords)
      .select();

    if (insertError) throw insertError;

    // Update health goals based on new vitals
    for (const vital of vitals) {
      if (vital.type === 'steps' || vital.type === 'weight' || vital.type === 'sleep') {
        await supabase
          .from('health_goals')
          .update({
            current_value: vital.value.value || vital.value,
          })
          .eq('user_id', user.id)
          .eq('goal_type', vital.type)
          .eq('status', 'active');
      }
    }

    // Award health coins for syncing data
    const coinsEarned = Math.min(vitals.length * 2, 20); // Max 20 coins per sync
    
    try {
      await supabase.rpc('process_coin_payment', {
        p_user_id: user.id,
        p_amount: coinsEarned,
        p_merchant_id: null,
        p_payment_type: 'health_sync',
        p_description: `Health data sync reward (${vitals.length} vitals)`
      });
      console.log(`Awarded ${coinsEarned} coins for health sync`);
    } catch (coinError) {
      console.error('Failed to award coins:', coinError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        synced_count: insertedVitals.length,
        coins_earned: coinsEarned
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Health data sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});