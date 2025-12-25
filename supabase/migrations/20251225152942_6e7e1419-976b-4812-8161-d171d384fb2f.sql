-- Complete remaining security fixes

-- 3. FIX qr_login_sessions - Restrict public access
DROP POLICY IF EXISTS "Anyone can create QR sessions" ON public.qr_login_sessions;
DROP POLICY IF EXISTS "Anyone can read pending sessions by token" ON public.qr_login_sessions;

CREATE POLICY "Only authenticated users can create QR sessions"
ON public.qr_login_sessions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read own QR sessions"
ON public.qr_login_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- 4. FIX contacts - Ensure users can only see their own contacts
DROP POLICY IF EXISTS "Users can view all contacts" ON public.contacts;

-- 5. FIX youth_posts - Add authentication requirement
DROP POLICY IF EXISTS "Anyone can view youth posts" ON public.youth_posts;

CREATE POLICY "Authenticated users can view youth posts"
ON public.youth_posts
FOR SELECT
USING (auth.role() = 'authenticated');

-- 6. FIX otp_verifications completely - no public access at all
DROP POLICY IF EXISTS "Anyone can request OTP" ON public.otp_verifications;
DROP POLICY IF EXISTS "Users can verify their OTP" ON public.otp_verifications;
DROP POLICY IF EXISTS "No public read access to OTP" ON public.otp_verifications;
DROP POLICY IF EXISTS "No public insert to OTP" ON public.otp_verifications;

-- OTP table should only be accessed via edge functions with service role
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OTP table is private"
ON public.otp_verifications
FOR ALL
USING (false);

-- 7. FIX rate_limits - Restrict manipulation
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

CREATE POLICY "Users can only view own rate limits"
ON public.rate_limits
FOR SELECT
USING (auth.uid()::text = identifier OR identifier LIKE '%' || auth.uid()::text || '%');

-- 8. FIX login_attempts - Restrict to own data
DROP POLICY IF EXISTS "System can insert login attempts" ON public.login_attempts;

CREATE POLICY "Login attempts are insert only by system"
ON public.login_attempts
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can view own login attempts"
ON public.login_attempts
FOR SELECT
USING (auth.uid() = user_id);