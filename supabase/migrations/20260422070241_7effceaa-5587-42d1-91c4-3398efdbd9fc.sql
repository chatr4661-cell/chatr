DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'earning_event_status') THEN
    CREATE TYPE public.earning_event_status AS ENUM ('pending', 'approved', 'paid', 'rejected', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'earning_event_type') THEN
    CREATE TYPE public.earning_event_type AS ENUM ('micro_task_reward', 'referral_referrer_bonus', 'referral_signup_bonus', 'manual_adjustment');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'referral_status') THEN
    CREATE TYPE public.referral_status AS ENUM ('pending', 'signed_up', 'verified', 'rewarded', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.earning_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type public.earning_event_type NOT NULL,
  source_table TEXT,
  source_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  status public.earning_event_status NOT NULL DEFAULT 'pending',
  reward_coins INTEGER NOT NULL DEFAULT 0,
  reward_rupees NUMERIC(10,2) NOT NULL DEFAULT 0,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT earning_events_nonnegative_rewards CHECK (reward_coins >= 0 AND reward_rupees >= 0)
);

CREATE INDEX IF NOT EXISTS idx_earning_events_user_occurred_at
  ON public.earning_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_earning_events_status
  ON public.earning_events (status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_earning_events_source
  ON public.earning_events (user_id, event_type, source_table, source_id)
  WHERE source_table IS NOT NULL AND source_id IS NOT NULL;

ALTER TABLE public.earning_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'earning_events' AND policyname = 'Users can view their own earning events'
  ) THEN
    CREATE POLICY "Users can view their own earning events"
    ON public.earning_events
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'earning_events' AND policyname = 'Admins can manage all earning events'
  ) THEN
    CREATE POLICY "Admins can manage all earning events"
    ON public.earning_events
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_earning_events_updated_at'
  ) THEN
    CREATE TRIGGER update_earning_events_updated_at
    BEFORE UPDATE ON public.earning_events
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS status public.referral_status,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rewarded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.referrals
  ALTER COLUMN status SET DEFAULT 'signed_up';

UPDATE public.referrals
SET
  status = CASE WHEN COALESCE(reward_claimed, false) THEN 'rewarded'::public.referral_status ELSE 'signed_up'::public.referral_status END,
  verified_at = COALESCE(verified_at, created_at),
  rewarded_at = CASE WHEN COALESCE(reward_claimed, false) THEN COALESCE(rewarded_at, created_at) ELSE rewarded_at END
WHERE status IS NULL OR verified_at IS NULL OR (COALESCE(reward_claimed, false) AND rewarded_at IS NULL);

ALTER TABLE public.referrals
  ALTER COLUMN status SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_referrals_referred_user
  ON public.referrals (referred_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_referrals_pair
  ON public.referrals (referrer_id, referred_id);

ALTER TABLE public.referral_rewards
  ADD COLUMN IF NOT EXISTS reward_rupees NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS earning_event_id UUID;

ALTER TABLE public.referral_rewards
  ALTER COLUMN status DROP DEFAULT;

UPDATE public.referral_rewards
SET status = COALESCE(status, 'pending')
WHERE status IS NULL;

ALTER TABLE public.referral_rewards
  ALTER COLUMN status TYPE public.earning_event_status
  USING (
    CASE COALESCE(status, 'pending')
      WHEN 'paid' THEN 'paid'::public.earning_event_status
      WHEN 'approved' THEN 'approved'::public.earning_event_status
      WHEN 'rejected' THEN 'rejected'::public.earning_event_status
      WHEN 'cancelled' THEN 'cancelled'::public.earning_event_status
      ELSE 'pending'::public.earning_event_status
    END
  );

ALTER TABLE public.referral_rewards
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'referral_rewards'
      AND constraint_name = 'referral_rewards_earning_event_id_fkey'
  ) THEN
    ALTER TABLE public.referral_rewards
      ADD CONSTRAINT referral_rewards_earning_event_id_fkey
      FOREIGN KEY (earning_event_id)
      REFERENCES public.earning_events(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_rewards_pair
  ON public.referral_rewards (referrer_id, referred_user_id);

CREATE OR REPLACE FUNCTION public.ensure_user_points_exists(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_points (user_id, balance, lifetime_earned, lifetime_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_micro_task_earning_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_status public.earning_event_status;
  v_approved_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT id, title, task_type, reward_coins, reward_rupees
  INTO v_task
  FROM public.micro_tasks
  WHERE id = NEW.task_id;

  IF v_task.id IS NULL THEN
    RETURN NEW;
  END IF;

  v_status := CASE NEW.status
    WHEN 'approved' THEN 'approved'::public.earning_event_status
    WHEN 'auto_approved' THEN 'approved'::public.earning_event_status
    WHEN 'rejected' THEN 'rejected'::public.earning_event_status
    WHEN 'auto_rejected' THEN 'rejected'::public.earning_event_status
    ELSE 'pending'::public.earning_event_status
  END;

  v_approved_at := CASE WHEN v_status = 'approved' THEN COALESCE(NEW.created_at, now()) ELSE NULL END;

  UPDATE public.earning_events
  SET
    title = v_task.title,
    description = 'Mission reward',
    status = v_status,
    reward_coins = COALESCE(v_task.reward_coins, 0),
    reward_rupees = COALESCE(v_task.reward_rupees, 0),
    approved_at = v_approved_at,
    metadata = jsonb_build_object(
      'task_id', NEW.task_id,
      'task_type', v_task.task_type,
      'submission_status', NEW.status,
      'assignment_id', NEW.assignment_id
    ),
    updated_at = now()
  WHERE user_id = NEW.user_id
    AND event_type = 'micro_task_reward'::public.earning_event_type
    AND source_table = 'micro_task_submissions'
    AND source_id = NEW.id;

  IF NOT FOUND THEN
    INSERT INTO public.earning_events (
      user_id,
      event_type,
      source_table,
      source_id,
      title,
      description,
      status,
      reward_coins,
      reward_rupees,
      occurred_at,
      approved_at,
      metadata
    )
    VALUES (
      NEW.user_id,
      'micro_task_reward'::public.earning_event_type,
      'micro_task_submissions',
      NEW.id,
      v_task.title,
      'Mission reward',
      v_status,
      COALESCE(v_task.reward_coins, 0),
      COALESCE(v_task.reward_rupees, 0),
      COALESCE(NEW.created_at, now()),
      v_approved_at,
      jsonb_build_object(
        'task_id', NEW.task_id,
        'task_type', v_task.task_type,
        'submission_status', NEW.status,
        'assignment_id', NEW.assignment_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_micro_task_earning_event_on_submission ON public.micro_task_submissions;

CREATE TRIGGER sync_micro_task_earning_event_on_submission
AFTER INSERT OR UPDATE OF status ON public.micro_task_submissions
FOR EACH ROW
EXECUTE FUNCTION public.sync_micro_task_earning_event();

CREATE OR REPLACE FUNCTION public.process_referral_reward(referral_code_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_user_id UUID;
  v_referred_user_id UUID;
  v_normalized_code TEXT;
  v_referral_id UUID;
  v_referrer_event_id UUID;
BEGIN
  v_referred_user_id := auth.uid();
  v_normalized_code := upper(trim(referral_code_param));

  IF v_referred_user_id IS NULL OR v_normalized_code IS NULL OR v_normalized_code = '' THEN
    RETURN FALSE;
  END IF;

  SELECT user_id
  INTO v_referrer_user_id
  FROM public.referral_codes
  WHERE upper(code) = v_normalized_code
  LIMIT 1;

  IF v_referrer_user_id IS NULL OR v_referrer_user_id = v_referred_user_id THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.referrals WHERE referred_id = v_referred_user_id
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.referrals WHERE referred_id = v_referred_user_id AND referrer_id = v_referrer_user_id
    );
  END IF;

  PERFORM public.ensure_user_points_exists(v_referrer_user_id);
  PERFORM public.ensure_user_points_exists(v_referred_user_id);

  INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    reward_claimed,
    referral_code,
    status,
    verified_at,
    rewarded_at
  )
  VALUES (
    v_referrer_user_id,
    v_referred_user_id,
    true,
    v_normalized_code,
    'rewarded'::public.referral_status,
    now(),
    now()
  )
  RETURNING id INTO v_referral_id;

  INSERT INTO public.earning_events (
    user_id,
    event_type,
    source_table,
    source_id,
    title,
    description,
    status,
    reward_coins,
    reward_rupees,
    occurred_at,
    approved_at,
    paid_at,
    metadata
  )
  VALUES (
    v_referrer_user_id,
    'referral_referrer_bonus'::public.earning_event_type,
    'referrals',
    v_referral_id,
    'Referral reward',
    'Friend signed up and completed verification',
    'paid'::public.earning_event_status,
    50,
    0,
    now(),
    now(),
    now(),
    jsonb_build_object('referred_user_id', v_referred_user_id, 'referral_code', v_normalized_code)
  ) RETURNING id INTO v_referrer_event_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.earning_events
    WHERE user_id = v_referred_user_id
      AND event_type = 'referral_signup_bonus'::public.earning_event_type
      AND source_table = 'referrals'
      AND source_id = v_referral_id
  ) THEN
    INSERT INTO public.earning_events (
      user_id,
      event_type,
      source_table,
      source_id,
      title,
      description,
      status,
      reward_coins,
      reward_rupees,
      occurred_at,
      approved_at,
      paid_at,
      metadata
    )
    VALUES (
      v_referred_user_id,
      'referral_signup_bonus'::public.earning_event_type,
      'referrals',
      v_referral_id,
      'Welcome referral bonus',
      'Bonus for joining with a valid invite code',
      'paid'::public.earning_event_status,
      25,
      0,
      now(),
      now(),
      now(),
      jsonb_build_object('referrer_id', v_referrer_user_id, 'referral_code', v_normalized_code)
    );
  END IF;

  INSERT INTO public.referral_rewards (
    referrer_id,
    referred_user_id,
    referral_code,
    points_awarded,
    reward_rupees,
    status,
    completed_at,
    approved_at,
    paid_at,
    earning_event_id
  )
  VALUES (
    v_referrer_user_id,
    v_referred_user_id,
    v_normalized_code,
    50,
    0,
    'paid'::public.earning_event_status,
    now(),
    now(),
    now(),
    v_referrer_event_id
  )
  ON CONFLICT (referrer_id, referred_user_id)
  DO UPDATE SET
    referral_code = EXCLUDED.referral_code,
    points_awarded = EXCLUDED.points_awarded,
    reward_rupees = EXCLUDED.reward_rupees,
    status = EXCLUDED.status,
    completed_at = EXCLUDED.completed_at,
    approved_at = EXCLUDED.approved_at,
    paid_at = EXCLUDED.paid_at,
    earning_event_id = EXCLUDED.earning_event_id;

  UPDATE public.user_points
  SET balance = balance + 50,
      lifetime_earned = lifetime_earned + 50,
      updated_at = now()
  WHERE user_id = v_referrer_user_id;

  INSERT INTO public.point_transactions (user_id, amount, transaction_type, source, description)
  VALUES (v_referrer_user_id, 50, 'earn', 'referral', 'Referral reward: friend signed up and verified');

  UPDATE public.user_points
  SET balance = balance + 25,
      lifetime_earned = lifetime_earned + 25,
      updated_at = now()
  WHERE user_id = v_referred_user_id;

  INSERT INTO public.point_transactions (user_id, amount, transaction_type, source, description)
  VALUES (v_referred_user_id, 25, 'earn', 'referral_bonus', 'Welcome bonus for joining with a referral code');

  UPDATE public.referral_codes
  SET uses = COALESCE(uses, 0) + 1
  WHERE upper(code) = v_normalized_code;

  RETURN TRUE;
END;
$$;

INSERT INTO public.earning_events (
  user_id,
  event_type,
  source_table,
  source_id,
  title,
  description,
  status,
  reward_coins,
  reward_rupees,
  occurred_at,
  approved_at,
  metadata
)
SELECT
  mts.user_id,
  'micro_task_reward'::public.earning_event_type,
  'micro_task_submissions',
  mts.id,
  mt.title,
  'Mission reward',
  CASE mts.status
    WHEN 'approved' THEN 'approved'::public.earning_event_status
    WHEN 'auto_approved' THEN 'approved'::public.earning_event_status
    WHEN 'rejected' THEN 'rejected'::public.earning_event_status
    WHEN 'auto_rejected' THEN 'rejected'::public.earning_event_status
    ELSE 'pending'::public.earning_event_status
  END,
  COALESCE(mt.reward_coins, 0),
  COALESCE(mt.reward_rupees, 0),
  COALESCE(mts.created_at, now()),
  CASE WHEN mts.status IN ('approved', 'auto_approved') THEN COALESCE(mts.created_at, now()) ELSE NULL END,
  jsonb_build_object(
    'task_id', mts.task_id,
    'task_type', mt.task_type,
    'submission_status', mts.status,
    'assignment_id', mts.assignment_id
  )
FROM public.micro_task_submissions mts
JOIN public.micro_tasks mt ON mt.id = mts.task_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.earning_events ee
  WHERE ee.user_id = mts.user_id
    AND ee.event_type = 'micro_task_reward'::public.earning_event_type
    AND ee.source_table = 'micro_task_submissions'
    AND ee.source_id = mts.id
);