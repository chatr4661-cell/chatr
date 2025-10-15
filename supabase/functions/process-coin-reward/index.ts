import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoinRewardRequest {
  userId: string;
  actionType: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, actionType, referenceId, metadata = {} } = await req.json() as CoinRewardRequest;

    console.log(`Processing coin reward: ${actionType} for user ${userId}`);

    // Get reward definition
    const { data: reward, error: rewardError } = await supabase
      .from('chatr_coin_rewards')
      .select('*')
      .eq('action_type', actionType)
      .eq('is_active', true)
      .single();

    if (rewardError || !reward) {
      console.error('Reward not found:', actionType);
      return new Response(
        JSON.stringify({ error: 'Reward not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already claimed this reward (for one-time rewards)
    if (reward.max_total === 1) {
      const { data: existingTransaction } = await supabase
        .from('chatr_coin_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('source', actionType)
        .single();

      if (existingTransaction) {
        console.log('Reward already claimed:', actionType);
        return new Response(
          JSON.stringify({ error: 'Reward already claimed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check daily limit
    if (reward.max_per_day) {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('chatr_coin_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source', actionType)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (count && count >= reward.max_per_day) {
        console.log('Daily limit reached:', actionType);
        return new Response(
          JSON.stringify({ error: 'Daily limit reached' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create transaction
    const { error: transactionError } = await supabase
      .from('chatr_coin_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'earn',
        amount: reward.coin_amount,
        source: actionType,
        description: reward.description,
        reference_id: referenceId,
        metadata
      });

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      throw transactionError;
    }

    // Update user balance
    const { data: balance } = await supabase
      .from('chatr_coin_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (balance) {
      await supabase
        .from('chatr_coin_balances')
        .update({
          total_coins: balance.total_coins + reward.coin_amount,
          lifetime_earned: balance.lifetime_earned + reward.coin_amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      // Create new balance record
      await supabase
        .from('chatr_coin_balances')
        .insert({
          user_id: userId,
          total_coins: reward.coin_amount,
          lifetime_earned: reward.coin_amount
        });
    }

    // Check for badge achievements
    await checkBadgeAchievements(supabase, userId);

    console.log(`✅ Awarded ${reward.coin_amount} coins for ${actionType}`);

    return new Response(
      JSON.stringify({
        success: true,
        coinsAwarded: reward.coin_amount,
        newBalance: (balance?.total_coins || 0) + reward.coin_amount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing reward:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkBadgeAchievements(supabase: any, userId: string) {
  // Get user stats
  const { data: balance } = await supabase
    .from('chatr_coin_balances')
    .select('lifetime_earned, longest_streak')
    .eq('user_id', userId)
    .single();

  if (!balance) return;

  // Get referral count
  const { count: referralCount } = await supabase
    .from('chatr_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('status', 'active');

  // Check badges
  const { data: badges } = await supabase
    .from('chatr_badges')
    .select('*')
    .eq('is_active', true);

  for (const badge of badges || []) {
    let shouldAward = false;

    switch (badge.requirement_type) {
      case 'coins_earned':
        shouldAward = balance.lifetime_earned >= badge.requirement_value;
        break;
      case 'referrals':
        shouldAward = (referralCount || 0) >= badge.requirement_value;
        break;
      case 'streak':
        shouldAward = balance.longest_streak >= badge.requirement_value;
        break;
    }

    if (shouldAward) {
      // Check if already awarded
      const { data: existing } = await supabase
        .from('chatr_user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', badge.id)
        .single();

      if (!existing) {
        // Award badge
        await supabase
          .from('chatr_user_badges')
          .insert({ user_id: userId, badge_id: badge.id });

        // Award badge coins if any
        if (badge.coin_reward > 0) {
          await supabase
            .from('chatr_coin_transactions')
            .insert({
              user_id: userId,
              transaction_type: 'bonus',
              amount: badge.coin_reward,
              source: 'badge_earned',
              description: `Badge earned: ${badge.name}`,
              reference_id: badge.id
            });

          await supabase
            .from('chatr_coin_balances')
            .update({
              total_coins: balance.total_coins + badge.coin_reward,
              lifetime_earned: balance.lifetime_earned + badge.coin_reward
            })
            .eq('user_id', userId);
        }

        console.log(`🏆 Badge awarded: ${badge.name}`);
      }
    }
  }
}
