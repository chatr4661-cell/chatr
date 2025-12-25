-- Fix remaining RLS policies (continuation)

-- 6. FIX: chatr_referrals - Only own referral data
DROP POLICY IF EXISTS "Allow read access for all users" ON public.chatr_referrals;
DROP POLICY IF EXISTS "Users can view all referrals" ON public.chatr_referrals;
DROP POLICY IF EXISTS "Users can view own referrals" ON public.chatr_referrals;

CREATE POLICY "Users can only view own referrals"
ON public.chatr_referrals
FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- 7. FIX: chatr_referral_network - Only own network
DROP POLICY IF EXISTS "Allow read access for all users" ON public.chatr_referral_network;
DROP POLICY IF EXISTS "Users can view referral network" ON public.chatr_referral_network;

CREATE POLICY "Users can only view own referral network"
ON public.chatr_referral_network
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = root_user_id);

-- 8. FIX: click_logs - Only own click data
DROP POLICY IF EXISTS "Allow read access for all users" ON public.click_logs;
DROP POLICY IF EXISTS "Users can view click logs" ON public.click_logs;

CREATE POLICY "Users can only view own click logs"
ON public.click_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own click logs"
ON public.click_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 9. FIX: chatr_login_streaks - Only own streaks
DROP POLICY IF EXISTS "Allow read access for all users" ON public.chatr_login_streaks;
DROP POLICY IF EXISTS "Users can view login streaks" ON public.chatr_login_streaks;

CREATE POLICY "Users can only view own login streaks"
ON public.chatr_login_streaks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only update own login streaks"
ON public.chatr_login_streaks
FOR UPDATE
USING (auth.uid() = user_id);