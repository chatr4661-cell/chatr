-- Fix CRITICAL Security Issues - Using correct column names

-- 1. Fix payments table - uses patient_id not user_id
DROP POLICY IF EXISTS "Users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;
DROP POLICY IF EXISTS "Users can only view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;

CREATE POLICY "Users can only view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = patient_id OR auth.uid() = provider_id);

CREATE POLICY "Users can insert their own payments"
ON public.payments FOR INSERT
WITH CHECK (auth.uid() = patient_id);

-- 2. Fix upi_payments - uses user_id and seller_id
DROP POLICY IF EXISTS "Users can view upi payments" ON public.upi_payments;
DROP POLICY IF EXISTS "Anyone can view upi payments" ON public.upi_payments;
DROP POLICY IF EXISTS "Users can only view their own upi payments" ON public.upi_payments;
DROP POLICY IF EXISTS "Users can insert upi payments" ON public.upi_payments;

CREATE POLICY "Users can only view their own upi payments"
ON public.upi_payments FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = seller_id);

CREATE POLICY "Users can insert upi payments"
ON public.upi_payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Fix search_logs - already has user_id
DROP POLICY IF EXISTS "Users can view search logs" ON public.search_logs;
DROP POLICY IF EXISTS "Anyone can view search logs" ON public.search_logs;
DROP POLICY IF EXISTS "Users can view their own or anonymous searches" ON public.search_logs;
DROP POLICY IF EXISTS "Users can only view their own search history" ON public.search_logs;
DROP POLICY IF EXISTS "Users can insert their own searches" ON public.search_logs;

CREATE POLICY "Users can only view their own search history"
ON public.search_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches"
ON public.search_logs FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);