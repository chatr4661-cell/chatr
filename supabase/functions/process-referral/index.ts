import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReferralRequest {
  referralCode: string;
  newUserId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { referralCode, newUserId } = await req.json() as ReferralRequest;

    console.log(`Processing referral: ${referralCode} for new user ${newUserId}`);

    // Get referrer by code
    const { data: referralCodeData, error: codeError } = await supabase
      .from('chatr_referral_codes')
      .select('*')
      .eq('code', referralCode)
      .eq('is_active', true)
      .single();

    if (codeError || !referralCodeData) {
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const referrerId = referralCodeData.user_id;

    // Check if this user was already referred
    const { data: existingReferral } = await supabase
      .from('chatr_referrals')
      .select('id')
      .eq('referred_user_id', newUserId)
      .single();

    if (existingReferral) {
      return new Response(
        JSON.stringify({ error: 'User already referred' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create referral record
    const { error: referralError } = await supabase
      .from('chatr_referrals')
      .insert({
        referrer_id: referrerId,
        referred_user_id: newUserId,
        referral_code: referralCode,
        status: 'active',
        level: 1,
        activated_at: new Date().toISOString()
      });

    if (referralError) throw referralError;

    // Update referral code stats
    await supabase
      .from('chatr_referral_codes')
      .update({
        total_uses: referralCodeData.total_uses + 1,
        total_rewards: referralCodeData.total_rewards + 500
      })
      .eq('id', referralCodeData.id);

    // Award coins to referrer (500 coins)
    const rewardResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-coin-reward`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          userId: referrerId,
          actionType: 'referral_signup',
          referenceId: newUserId,
          metadata: { referred_user: newUserId }
        })
      }
    );

    if (!rewardResponse.ok) {
      console.error('Failed to award referral coins');
    }

    // Build multi-level network (up to 4 levels)
    await buildReferralNetwork(supabase, newUserId, referrerId, 1);

    console.log(`✅ Referral processed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        referrerId,
        coinsAwarded: 500
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing referral:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function buildReferralNetwork(
  supabase: any, 
  newUserId: string, 
  directReferrerId: string, 
  currentLevel: number
) {
  const MAX_LEVELS = 4;

  // Add to direct referrer's network
  await supabase
    .from('chatr_referral_network')
    .insert({
      root_user_id: directReferrerId,
      user_id: newUserId,
      level: currentLevel,
      total_network_size: 1
    });

  // If we haven't reached max depth, find parent referrers
  if (currentLevel < MAX_LEVELS) {
    const { data: parentReferral } = await supabase
      .from('chatr_referrals')
      .select('referrer_id')
      .eq('referred_user_id', directReferrerId)
      .single();

    if (parentReferral) {
      // Recursively build network up the chain
      await buildReferralNetwork(
        supabase,
        newUserId,
        parentReferral.referrer_id,
        currentLevel + 1
      );

      // Award reduced coins based on level
      const levelRewards = [0, 500, 150, 75, 25]; // Level 0 (unused), 1, 2, 3, 4
      const reward = levelRewards[currentLevel] || 0;

      if (reward > 0) {
        await supabase
          .from('chatr_coin_transactions')
          .insert({
            user_id: parentReferral.referrer_id,
            transaction_type: 'earn',
            amount: reward,
            source: 'network_referral',
            description: `Level ${currentLevel} network referral bonus`,
            reference_id: newUserId
          });

        // Update balance
        const { data: balance } = await supabase
          .from('chatr_coin_balances')
          .select('total_coins, lifetime_earned')
          .eq('user_id', parentReferral.referrer_id)
          .single();

        if (balance) {
          await supabase
            .from('chatr_coin_balances')
            .update({
              total_coins: balance.total_coins + reward,
              lifetime_earned: balance.lifetime_earned + reward
            })
            .eq('user_id', parentReferral.referrer_id);
        }
      }
    }
  }
}
