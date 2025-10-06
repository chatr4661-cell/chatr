import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const today = new Date().toISOString().split('T')[0];

    // Get or create user streak
    let { data: streak, error: streakError } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (streakError && streakError.code !== 'PGRST116') {
      throw streakError;
    }

    let currentStreak = 0;
    let pointsEarned = 10; // Base daily login bonus

    if (!streak) {
      // First time login
      await supabase.from('user_streaks').insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_login_date: today,
        total_logins: 1
      });
      currentStreak = 1;
    } else {
      const lastLogin = new Date(streak.last_login_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already logged in today
        return new Response(
          JSON.stringify({ 
            message: "Already logged in today", 
            streak: streak.current_streak,
            pointsEarned: 0
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (diffDays === 1) {
        // Consecutive day
        currentStreak = streak.current_streak + 1;
      } else {
        // Streak broken
        currentStreak = 1;
      }

      // Check for streak bonuses
      if (currentStreak % 5 === 0) {
        pointsEarned += 25; // 5-day streak bonus
      }

      const longestStreak = Math.max(currentStreak, streak.longest_streak);

      await supabase
        .from('user_streaks')
        .update({
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_login_date: today,
          total_logins: (streak.total_logins || 0) + 1
        })
        .eq('user_id', user.id);
    }

    // Award points for daily login
    const { data: currentPoints } = await supabase
      .from('user_points')
      .select('balance, lifetime_earned')
      .eq('user_id', user.id)
      .single();

    if (currentPoints) {
      await supabase
        .from('user_points')
        .update({
          balance: currentPoints.balance + pointsEarned,
          lifetime_earned: currentPoints.lifetime_earned + pointsEarned
        })
        .eq('user_id', user.id);

      // Create transaction record
      await supabase.from('point_transactions').insert({
        user_id: user.id,
        amount: pointsEarned,
        transaction_type: 'earn',
        source: currentStreak % 5 === 0 ? 'login_streak_bonus' : 'daily_login',
        description: currentStreak % 5 === 0 
          ? `${currentStreak}-day streak bonus! 🔥` 
          : `Daily login bonus (${currentStreak} day streak)`
      });
    }

    // Update profile streak count
    await supabase
      .from('profiles')
      .update({ streak_count: currentStreak })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pointsEarned,
        streak: currentStreak,
        message: currentStreak % 5 === 0 
          ? `🔥 ${currentStreak} days! Bonus points awarded!` 
          : `Day ${currentStreak} streak!`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});