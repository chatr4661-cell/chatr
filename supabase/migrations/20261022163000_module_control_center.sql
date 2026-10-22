-- CHATR OS — Module Control Center & Lifecycle Management Schema
-- Migration: 20261022163000_module_control_center.sql

-- 1. Create Module Registry Table
CREATE TABLE IF NOT EXISTS public.module_registry (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  route text NOT NULL,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('hidden', 'development', 'testing', 'published', 'disabled')) DEFAULT 'hidden',
  is_public boolean NOT NULL DEFAULT false,
  required_permissions text[] NOT NULL DEFAULT '{}'::text[],
  admin_notes text DEFAULT '',
  icon_name text DEFAULT '',
  category text DEFAULT 'ecosystem',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by_phone text DEFAULT ''
);

-- 2. Create Module Lifecycle Audit Table (Append-Only)
CREATE TABLE IF NOT EXISTS public.module_lifecycle_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id text NOT NULL REFERENCES public.module_registry(id) ON DELETE CASCADE,
  previous_state text NOT NULL,
  new_state text NOT NULL,
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_identifier text NOT NULL DEFAULT '',
  action_result text NOT NULL DEFAULT 'SUCCESS',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.module_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_lifecycle_audit ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for module_registry
-- Public / non-admin users may ONLY view published modules
DROP POLICY IF EXISTS "Public can view published modules" ON public.module_registry;
CREATE POLICY "Public can view published modules"
ON public.module_registry FOR SELECT
USING (lifecycle_state = 'published');

-- Admins and CEOs have full visibility of all modules regardless of lifecycle state
DROP POLICY IF EXISTS "Admins can view all modules" ON public.module_registry;
CREATE POLICY "Admins can view all modules"
ON public.module_registry FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR
  public.has_role(auth.uid(), 'ceo'::public.app_role)
);

-- Admins can insert/update module registry
DROP POLICY IF EXISTS "Admins can manage module registry" ON public.module_registry;
CREATE POLICY "Admins can manage module registry"
ON public.module_registry FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR
  public.has_role(auth.uid(), 'ceo'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR
  public.has_role(auth.uid(), 'ceo'::public.app_role)
);

-- 5. RLS Policies for module_lifecycle_audit
-- Only admins can read the audit log
DROP POLICY IF EXISTS "Admins can view module audit logs" ON public.module_lifecycle_audit;
CREATE POLICY "Admins can view module audit logs"
ON public.module_lifecycle_audit FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR
  public.has_role(auth.uid(), 'ceo'::public.app_role)
);

-- Only admins can insert audit logs
DROP POLICY IF EXISTS "Admins can insert module audit logs" ON public.module_lifecycle_audit;
CREATE POLICY "Admins can insert module audit logs"
ON public.module_lifecycle_audit FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR
  public.has_role(auth.uid(), 'ceo'::public.app_role)
);

-- 6. Server-side atomic state transition function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.update_module_lifecycle(
  p_module_id text,
  p_new_state text,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid uuid;
  v_is_admin boolean;
  v_old_state text;
  v_admin_phone text;
  v_updated record;
BEGIN
  v_caller_uid := auth.uid();
  
  -- Strict server-side authorization check
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to modify module lifecycle';
  END IF;

  v_is_admin := public.has_role(v_caller_uid, 'admin'::public.app_role) OR 
                public.has_role(v_caller_uid, 'ceo'::public.app_role);
                
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  -- Validate lifecycle state constraint
  IF p_new_state NOT IN ('hidden', 'development', 'testing', 'published', 'disabled') THEN
    RAISE EXCEPTION 'Invalid lifecycle state: %', p_new_state;
  END IF;

  -- Fetch current module state
  SELECT lifecycle_state INTO v_old_state
  FROM public.module_registry
  WHERE id = p_module_id;

  IF v_old_state IS NULL THEN
    RAISE EXCEPTION 'Module % not found in registry', p_module_id;
  END IF;

  -- Get admin phone identifier if present
  SELECT COALESCE(phone_number, email, v_caller_uid::text) INTO v_admin_phone
  FROM public.profiles
  WHERE id = v_caller_uid;

  IF v_admin_phone IS NULL THEN
    v_admin_phone := 'admin-user';
  END IF;

  -- Update module registry
  UPDATE public.module_registry
  SET
    lifecycle_state = p_new_state,
    is_public = (p_new_state = 'published'),
    admin_notes = CASE WHEN p_notes <> '' THEN p_notes ELSE admin_notes END,
    updated_at = now(),
    last_updated_by = v_caller_uid,
    last_updated_by_phone = v_admin_phone
  WHERE id = p_module_id
  RETURNING * INTO v_updated;

  -- Record append-only audit trail
  INSERT INTO public.module_lifecycle_audit (
    module_id,
    previous_state,
    new_state,
    admin_user_id,
    admin_identifier,
    action_result,
    notes
  ) VALUES (
    p_module_id,
    v_old_state,
    p_new_state,
    v_caller_uid,
    v_admin_phone,
    'SUCCESS',
    COALESCE(p_notes, 'Lifecycle transition')
  );

  RETURN to_jsonb(v_updated);
END;
$$;

-- 7. Ensure designated administrator (9717845477) has admin role
DO $$
DECLARE
  v_founder_id uuid;
BEGIN
  SELECT id INTO v_founder_id
  FROM public.profiles
  WHERE regexp_replace(COALESCE(phone_number, ''), '[^0-9]', '', 'g') IN ('919717845477', '9717845477')
  LIMIT 1;

  IF v_founder_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_founder_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_founder_id, 'ceo'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- 8. Idempotent Seed: Register all 12 required modules with safe default 'hidden'
INSERT INTO public.module_registry (id, display_name, route, lifecycle_state, is_public, category, admin_notes)
VALUES
  ('dhandha', 'Dhandha', '/dhandha', 'hidden', false, 'commerce', 'Business and vendor storefront management'),
  ('chatr-world', 'Chatr World', '/chatr-world', 'hidden', false, 'discovery', 'AI search and nearby location discovery'),
  ('food-ordering', 'Food Ordering', '/food-ordering', 'hidden', false, 'commerce', 'Food and dining ordering platform'),
  ('chat-ai', 'Chat AI', '/chat-ai', 'hidden', false, 'intelligence', 'Conversational AI chat interface'),
  ('chatr-intelligence', 'Chatr Intelligence', '/chat-ai', 'hidden', false, 'intelligence', 'Unified AI brain multi-agent system'),
  ('ai-agents', 'AI Agents', '/ai-agents', 'hidden', false, 'intelligence', 'Autonomous AI agent creator and management hub'),
  ('chatrpay', 'ChatrPay', '/chatr-wallet', 'hidden', false, 'fintech', 'Digital payments, UPI, and rewards wallet'),
  ('studio', 'Studio', '/chatr-studio', 'hidden', false, 'tools', 'Mini-app developer studio and UI generator'),
  ('ai-assistant', 'AI Assistant', '/ai-assistant', 'hidden', false, 'intelligence', '24/7 personal conversational health & utility assistant'),
  ('emergency', 'Emergency', '/emergency', 'hidden', false, 'safety', 'Emergency SOS and quick healthcare dispatch'),
  ('chatr-games', 'Chatr Games', '/chatr-games', 'hidden', false, 'entertainment', 'AI-native interactive mini-games'),
  ('native-apps', 'Native Apps', '/native-apps', 'hidden', false, 'platform', 'Chatr Store for discoverable native mini-apps')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  route = EXCLUDED.route,
  category = EXCLUDED.category;

-- 9. Register core operational modules as 'published' to preserve live features
INSERT INTO public.module_registry (id, display_name, route, lifecycle_state, is_public, category, admin_notes)
VALUES
  ('chat', 'Messaging', '/chat', 'published', true, 'core', 'Core end-to-end messaging'),
  ('calls', 'Voice & Video Calls', '/calls', 'published', true, 'core', 'WebRTC voice and video calling'),
  ('health', 'Health Hub', '/health', 'published', true, 'healthcare', 'Vitals, health records, and passports'),
  ('care', 'Care Access', '/care', 'published', true, 'healthcare', 'Doctor booking and appointments'),
  ('jobs', 'Jobs Portal', '/jobs', 'published', true, 'careers', 'Job search and verified opportunities'),
  ('community', 'Community', '/community', 'published', true, 'social', 'Groups and community channels'),
  ('discover', 'Discover', '/discover', 'published', true, 'discovery', 'People and talent discovery'),
  ('identity', 'Chatr++ Identity', '/identity', 'published', true, 'identity', 'Multi-layer identity defense')
ON CONFLICT (id) DO NOTHING;

-- Enable Supabase Realtime for instant UI sync across administrator tabs
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_registry;
