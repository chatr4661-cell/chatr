
-- Add app_type and native fields to mini_apps
ALTER TABLE public.mini_apps 
  ADD COLUMN IF NOT EXISTS app_type VARCHAR(20) DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS apk_url TEXT,
  ADD COLUMN IF NOT EXISTS package_name TEXT,
  ADD COLUMN IF NOT EXISTS min_android_version TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS downloads_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS privacy_policy_url TEXT,
  ADD COLUMN IF NOT EXISTS support_email TEXT;

-- App versions table for OTA updates
CREATE TABLE IF NOT EXISTS public.app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES public.mini_apps(id) ON DELETE CASCADE,
  version_code INTEGER NOT NULL,
  version_name VARCHAR(50) NOT NULL,
  download_url TEXT,
  release_notes TEXT,
  is_force_update BOOLEAN DEFAULT false,
  file_size_bytes BIGINT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(app_id, version_code)
);

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active versions"
  ON public.app_versions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Developers can manage their app versions"
  ON public.app_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mini_apps ma
      JOIN developer_profiles dp ON dp.id = ma.developer_id
      WHERE ma.id = app_id AND dp.user_id = auth.uid()
    )
  );

CREATE INDEX idx_app_versions_app_id ON public.app_versions(app_id, version_code DESC);

-- App installs tracking table
CREATE TABLE IF NOT EXISTS public.app_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  app_id UUID NOT NULL REFERENCES public.mini_apps(id) ON DELETE CASCADE,
  installed_version VARCHAR(50),
  device_type VARCHAR(20) DEFAULT 'web',
  installed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, app_id)
);

ALTER TABLE public.app_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own installs"
  ON public.app_installs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can install apps"
  ON public.app_installs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their installs"
  ON public.app_installs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can uninstall apps"
  ON public.app_installs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_app_installs_user ON public.app_installs(user_id);
CREATE INDEX idx_app_installs_app ON public.app_installs(app_id);
