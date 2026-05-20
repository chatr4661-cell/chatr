
CREATE POLICY "Published designs are public"
  ON public.studio_user_designs FOR SELECT
  USING (is_published = true);
