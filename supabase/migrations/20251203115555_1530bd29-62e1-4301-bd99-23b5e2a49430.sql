-- Fix remaining security issues for beta launch

-- 1. Fix the view - explicitly set as SECURITY INVOKER (not DEFINER)
DROP VIEW IF EXISTS public.missed_calls_view CASCADE;

CREATE OR REPLACE VIEW public.missed_calls_view 
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.caller_id,
  c.receiver_id,
  c.call_type,
  c.created_at,
  p.username as caller_username,
  p.avatar_url as caller_avatar
FROM calls c
JOIN profiles p ON p.id = c.caller_id
WHERE c.missed = true;

-- 2. Add RLS policy to provider_access_consents table
CREATE POLICY "Users can view their own consents"
ON public.provider_access_consents
FOR SELECT
USING (
  auth.uid() = patient_id OR 
  auth.uid() = provider_id OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Patients can create consents"
ON public.provider_access_consents
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can revoke their consents"
ON public.provider_access_consents
FOR UPDATE
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can delete their consents"
ON public.provider_access_consents
FOR DELETE
USING (auth.uid() = patient_id);

-- 3. Fix handle_updated_at function with search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. Fix update_review_replies_updated_at
CREATE OR REPLACE FUNCTION public.update_review_replies_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5. Fix update_chatr_updated_at
CREATE OR REPLACE FUNCTION public.update_chatr_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;