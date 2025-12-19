import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    
    // Accept multiple field name variants (camelCase and snake_case)
    const token = body.token || body.fcm_token || body.device_token || body.fcmToken || body.deviceToken;
    const platform = body.platform || 'android';
    const userId = body.userId || body.user_id;

    console.log('Received body:', JSON.stringify(body));

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required. Send as: token, fcm_token, or device_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required. Send as: userId or user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Registering device token for user ${userId}, platform: ${platform}`);

    // Upsert the device token (only using columns that exist in the table)
    const { data, error } = await supabase
      .from('device_tokens')
      .upsert({
        user_id: userId,
        device_token: token,
        platform: platform,
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,device_token'
      });

    if (error) {
      console.error('Error saving device token:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Device token registered successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Device token registered' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Register device token error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
