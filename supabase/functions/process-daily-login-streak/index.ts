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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    console.log(`Processing daily login for user ${user.id}`);

    // Get or create streak record
    let { data: streak, error: streakError } = await supabase
      .from('chatr_login_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (streakError && streakError.code !== 'PGRST116') {
      throw streakError;
    }

    let currentStreak = 1;
    let longestStreak = 1;
    let coinsAwarded = 0;

    if (streak) {
      const lastLogin = streak.last_login_date;
      
      // Check if already logged in today
      if (lastLogin === today) {
        return new Response(
          JSON.stringify({
            success: true,
            alreadyLoggedIn: true,
            currentStreak: streak.current_streak,
            coinsAwarded: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate days difference
      const lastDate = new Date(lastLogin + 'T00:00:00Z');
      const todayDate = new Date(today + 'T00:00:00Z');
      const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        // Consecutive day
        currentStreak = streak.current_streak + 1;
      } else if (daysDiff > 1) {
        // Streak broken
        currentStreak = 1;
      }

      longestStreak = Math.max(currentStreak, streak.longest_streak);

      // Update streak
      await supabase
        .from('chatr_login_streaks')
        .update({
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_login_date: today,
          total_logins: streak.total_logins + 1
        })
        .eq('user_id', user.id);

    } else {
      // Create new streak
      await supabase
        .from('chatr_login_streaks')
        .insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_login_date: today,
          total_logins: 1
        });
    }

    // Award daily login coins
    const dailyResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-coin-reward`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization')!
        },
        body: JSON.stringify({
          userId: user.id,
          actionType: 'daily_login'
        })
      }
    );

    if (dailyResponse.ok) {
      coinsAwarded += 50;
    }

    // Check for streak bonuses
    if (currentStreak === 7) {
      const streakResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-coin-reward`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization')!
          },
          body: JSON.stringify({
            userId: user.id,
            actionType: 'streak_7days'
          })
        }
      );

      if (streakResponse.ok) {
        coinsAwarded += 200;
      }
    } else if (currentStreak === 30) {
      const streakResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-coin-reward`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization')!
          },
          body: JSON.stringify({
            userId: user.id,
            actionType: 'streak_30days'
          })
        }
      );

      if (streakResponse.ok) {
        coinsAwarded += 500;
      }
    }

    // Update coin balance streak info
    await supabase
      .from('chatr_coin_balances')
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_login_date: today
      })
      .eq('user_id', user.id);

    console.log(`✅ Login streak processed: ${currentStreak} days, ${coinsAwarded} coins awarded`);

    return new Response(
      JSON.stringify({
        success: true,
        currentStreak,
        longestStreak,
        coinsAwarded,
        nextMilestone: currentStreak < 7 ? 7 : currentStreak < 30 ? 30 : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing login streak:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
