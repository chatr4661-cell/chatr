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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating referral code for user ${user.id}`);

    // Check if user already has a code
    const { data: existingCode } = await supabase
      .from('chatr_referral_codes')
      .select('code, qr_code_url')
      .eq('user_id', user.id)
      .single();

    if (existingCode) {
      return new Response(
        JSON.stringify({
          code: existingCode.code,
          qrCodeUrl: existingCode.qr_code_url,
          shareUrl: `https://chatr.app/join/${existingCode.code}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique code (6 characters)
    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let code = generateCode();
    let attempts = 0;
    let isUnique = false;

    // Ensure code is unique
    while (!isUnique && attempts < 10) {
      const { data } = await supabase
        .from('chatr_referral_codes')
        .select('id')
        .eq('code', code)
        .single();

      if (!data) {
        isUnique = true;
      } else {
        code = generateCode();
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique code');
    }

    // Create QR code URL (using a QR code service)
    const shareUrl = `https://chatr.app/join/${code}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

    // Insert code
    const { error: insertError } = await supabase
      .from('chatr_referral_codes')
      .insert({
        user_id: user.id,
        code,
        qr_code_url: qrCodeUrl
      });

    if (insertError) throw insertError;

    // Initialize coin balance if not exists
    const { data: balance } = await supabase
      .from('chatr_coin_balances')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!balance) {
      await supabase
        .from('chatr_coin_balances')
        .insert({
          user_id: user.id,
          total_coins: 0,
          lifetime_earned: 0
        });
    }

    console.log(`✅ Generated referral code: ${code}`);

    return new Response(
      JSON.stringify({
        code,
        qrCodeUrl,
        shareUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating referral code:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
