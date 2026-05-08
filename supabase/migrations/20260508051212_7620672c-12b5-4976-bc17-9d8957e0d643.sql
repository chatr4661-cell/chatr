ALTER TABLE public.chatr_referrals REPLICA IDENTITY FULL;
ALTER TABLE public.referrals REPLICA IDENTITY FULL;
ALTER TABLE public.referral_rewards REPLICA IDENTITY FULL;
ALTER TABLE public.contact_invites REPLICA IDENTITY FULL;
ALTER TABLE public.earning_events REPLICA IDENTITY FULL;
ALTER TABLE public.user_points REPLICA IDENTITY FULL;
ALTER TABLE public.seller_withdrawal_requests REPLICA IDENTITY FULL;
ALTER TABLE public.provider_payouts REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'chatr_referrals','referrals','referral_rewards','contact_invites',
    'earning_events','user_points','seller_withdrawal_requests','provider_payouts'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;