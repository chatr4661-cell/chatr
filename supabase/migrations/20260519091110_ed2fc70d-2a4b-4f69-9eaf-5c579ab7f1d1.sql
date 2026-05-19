
-- System-managed: service_role-only writes
DO $$
DECLARE t TEXT; pol RECORD;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'chatr_coin_balances','chatr_leaderboards','chatr_referral_codes',
    'chatr_referral_network','chatr_referrals','message_delivery_status',
    'search_cache','trending_searches','user_push_health',
    'chatr_coin_transactions','admin_action_logs','micro_task_fraud_flags',
    'micro_task_user_scores','medical_access_audit','voice_transcriptions'
  ])
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t
        AND cmd IN ('ALL','INSERT','UPDATE','DELETE')
        AND (COALESCE(qual,'true')='true' OR COALESCE(with_check,'true')='true')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY "service_role manages %I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t, t
    );
  END LOOP;
END $$;

-- chatr_login_streaks — owner writes + service_role
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='chatr_login_streaks'
      AND cmd IN ('ALL','INSERT','UPDATE','DELETE')
      AND (COALESCE(qual,'true')='true' OR COALESCE(with_check,'true')='true')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.chatr_login_streaks', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "service_role manages login_streaks"
  ON public.chatr_login_streaks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "users can insert own login_streak"
  ON public.chatr_login_streaks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can update own login_streak"
  ON public.chatr_login_streaks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- chatr_shares — owner insert + service_role
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='chatr_shares'
      AND cmd IN ('ALL','INSERT','UPDATE','DELETE')
      AND (COALESCE(qual,'true')='true' OR COALESCE(with_check,'true')='true')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.chatr_shares', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "service_role manages shares"
  ON public.chatr_shares FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "users can insert own share"
  ON public.chatr_shares FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- app_analytics — owner insert + service_role
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='app_analytics'
      AND cmd IN ('ALL','INSERT','UPDATE','DELETE')
      AND (COALESCE(qual,'true')='true' OR COALESCE(with_check,'true')='true')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_analytics', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "service_role manages app_analytics"
  ON public.app_analytics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "users can insert own app_analytics"
  ON public.app_analytics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
