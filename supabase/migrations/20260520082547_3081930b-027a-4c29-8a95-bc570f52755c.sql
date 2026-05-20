
CREATE TABLE IF NOT EXISTS public.official_account_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.official_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'article' CHECK (post_type IN ('article','video','image','announcement')),
  media_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oap_account ON public.official_account_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_oap_published ON public.official_account_posts(is_published, created_at DESC);

ALTER TABLE public.official_account_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published posts"
ON public.official_account_posts FOR SELECT
USING (
  is_published = true
  OR EXISTS (
    SELECT 1 FROM public.official_accounts oa
    WHERE oa.id = account_id AND oa.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can insert posts"
ON public.official_account_posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.official_accounts oa
    WHERE oa.id = account_id AND oa.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update posts"
ON public.official_account_posts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.official_accounts oa
    WHERE oa.id = account_id AND oa.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can delete posts"
ON public.official_account_posts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.official_accounts oa
    WHERE oa.id = account_id AND oa.user_id = auth.uid()
  )
);

CREATE TRIGGER trg_oap_updated_at
BEFORE UPDATE ON public.official_account_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Likes counter trigger
CREATE OR REPLACE FUNCTION public.bump_post_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.official_account_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.official_account_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_post_likes_count ON public.post_likes;
CREATE TRIGGER trg_post_likes_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_post_likes();

ALTER PUBLICATION supabase_realtime ADD TABLE public.official_account_posts;
