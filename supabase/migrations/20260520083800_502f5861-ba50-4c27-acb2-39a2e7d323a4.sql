
-- =========================================================
-- Champions module
-- =========================================================

CREATE TABLE IF NOT EXISTS public.champions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'Bronze' CHECK (tier IN ('Bronze','Silver','Gold','Platinum')),
  rank integer,
  streak_days integer NOT NULL DEFAULT 0,
  referral_count integer NOT NULL DEFAULT 0,
  calls_made integer NOT NULL DEFAULT 0,
  badge_earned_at timestamptz,
  previous_rank integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_champions_rank ON public.champions(rank) WHERE rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_champions_points ON public.champions(points DESC);

ALTER TABLE public.champions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Champions are readable by authenticated users"
  ON public.champions FOR SELECT TO authenticated USING (true);

-- writes restricted to service_role only (cron + edge function)

-- Tier rewards catalog
CREATE TABLE IF NOT EXISTS public.champion_tier_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE CHECK (tier IN ('Bronze','Silver','Gold','Platinum')),
  min_points integer NOT NULL,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge_color text NOT NULL,
  badge_icon text NOT NULL DEFAULT 'medal',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.champion_tier_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tier rewards readable by all authenticated users"
  ON public.champion_tier_rewards FOR SELECT TO authenticated USING (true);

INSERT INTO public.champion_tier_rewards (tier, min_points, badge_color, badge_icon, perks) VALUES
  ('Bronze',   0,   '#cd7f32', 'medal',    '["Welcome champion badge","Profile flair"]'::jsonb),
  ('Silver',   100, '#c0c0c0', 'award',    '["Free profile boost","Priority support"]'::jsonb),
  ('Gold',     500, '#ffd700', 'trophy',   '["Free ChatrPay transfer fee","Exclusive Gold badge","Early feature access"]'::jsonb),
  ('Platinum', 2000,'#e5e4e2', 'crown',    '["All Gold perks","Founder circle access","Lifetime premium"]'::jsonb)
ON CONFLICT (tier) DO NOTHING;

-- Per-user notifications when rank/tier changes
CREATE TABLE IF NOT EXISTS public.champion_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('tier_up','rank_up','rank_down')),
  old_value text,
  new_value text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_champion_notif_user ON public.champion_notifications(user_id, created_at DESC);

ALTER TABLE public.champion_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own champion notifications"
  ON public.champion_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their own notifications read"
  ON public.champion_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- Recompute function
-- =========================================================
CREATE OR REPLACE FUNCTION public.recompute_champions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_points integer;
  v_tier text;
  v_streak integer;
  v_referrals integer;
  v_calls integer;
  v_prev_tier text;
  v_prev_rank integer;
  v_count integer := 0;
BEGIN
  FOR r IN SELECT id FROM auth.users LOOP
    SELECT COUNT(*) INTO v_referrals FROM public.referrals WHERE referrer_id = r.id;
    SELECT COALESCE(current_streak, 0) INTO v_streak FROM public.user_streaks WHERE user_id = r.id;
    v_streak := COALESCE(v_streak, 0);
    SELECT COUNT(*) INTO v_calls FROM public.calls WHERE caller_id = r.id AND status = 'completed';

    v_points := (v_referrals * 10) + (v_streak * 5) + (v_calls * 1);

    v_tier := CASE
      WHEN v_points >= 2000 THEN 'Platinum'
      WHEN v_points >= 500  THEN 'Gold'
      WHEN v_points >= 100  THEN 'Silver'
      ELSE 'Bronze'
    END;

    SELECT tier, rank INTO v_prev_tier, v_prev_rank FROM public.champions WHERE user_id = r.id;

    INSERT INTO public.champions (user_id, points, tier, streak_days, referral_count, calls_made, badge_earned_at, previous_rank, updated_at)
    VALUES (r.id, v_points, v_tier, v_streak, v_referrals, v_calls,
            CASE WHEN v_prev_tier IS DISTINCT FROM v_tier THEN now() ELSE NULL END,
            v_prev_rank, now())
    ON CONFLICT (user_id) DO UPDATE SET
      points = EXCLUDED.points,
      tier = EXCLUDED.tier,
      streak_days = EXCLUDED.streak_days,
      referral_count = EXCLUDED.referral_count,
      calls_made = EXCLUDED.calls_made,
      previous_rank = public.champions.rank,
      badge_earned_at = CASE WHEN public.champions.tier IS DISTINCT FROM EXCLUDED.tier THEN now() ELSE public.champions.badge_earned_at END,
      updated_at = now();

    IF v_prev_tier IS NOT NULL AND v_prev_tier <> v_tier THEN
      INSERT INTO public.champion_notifications (user_id, kind, old_value, new_value, message)
      VALUES (r.id, 'tier_up', v_prev_tier, v_tier,
              'You reached ' || v_tier || ' tier! New perks unlocked.');
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- Update ranks based on points
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY points DESC, updated_at ASC) AS rn
    FROM public.champions
    WHERE points > 0
  )
  UPDATE public.champions c
  SET rank = ranked.rn
  FROM ranked
  WHERE c.id = ranked.id;

  -- Notify rank changes for top 100
  INSERT INTO public.champion_notifications (user_id, kind, old_value, new_value, message)
  SELECT user_id, 'rank_up', previous_rank::text, rank::text,
         'Your rank jumped to #' || rank::text
  FROM public.champions
  WHERE rank IS NOT NULL AND rank <= 100
    AND previous_rank IS NOT NULL AND rank < previous_rank;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_champions() FROM public, anon, authenticated;

-- Realtime
ALTER TABLE public.champions REPLICA IDENTITY FULL;
ALTER TABLE public.champion_notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='champions';
  IF NOT FOUND THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.champions;
  END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='champion_notifications';
  IF NOT FOUND THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.champion_notifications;
  END IF;
END $$;
