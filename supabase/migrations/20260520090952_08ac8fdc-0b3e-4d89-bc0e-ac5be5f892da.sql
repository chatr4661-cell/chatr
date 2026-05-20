
-- community_posts
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_community_posts_community ON public.community_posts(community_id, is_pinned DESC, created_at DESC);
CREATE INDEX idx_community_posts_author ON public.community_posts(author_id);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View posts in public communities or as member"
ON public.community_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = community_id
      AND (c.is_public = true OR EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = c.id AND cp.user_id = auth.uid()
      ))
  )
);
CREATE POLICY "Members can create posts"
ON public.community_posts FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = community_id AND cp.user_id = auth.uid()
  )
);
CREATE POLICY "Authors can update own posts"
ON public.community_posts FOR UPDATE
USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own posts"
ON public.community_posts FOR DELETE
USING (auth.uid() = author_id);

-- community_post_reactions
CREATE TABLE public.community_post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);
CREATE INDEX idx_community_post_reactions_post ON public.community_post_reactions(post_id);
ALTER TABLE public.community_post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reactions"
ON public.community_post_reactions FOR SELECT USING (true);
CREATE POLICY "Users manage own reactions ins"
ON public.community_post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own reactions del"
ON public.community_post_reactions FOR DELETE USING (auth.uid() = user_id);

-- community_post_comments
CREATE TABLE public.community_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_community_post_comments_post ON public.community_post_comments(post_id, created_at);
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view community comments"
ON public.community_post_comments FOR SELECT USING (true);
CREATE POLICY "Users create own community comments"
ON public.community_post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own community comments"
ON public.community_post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own community comments"
ON public.community_post_comments FOR DELETE USING (auth.uid() = user_id);

-- Counter triggers
CREATE OR REPLACE FUNCTION public.community_post_likes_counter()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER community_post_likes_counter_t
AFTER INSERT OR DELETE ON public.community_post_reactions
FOR EACH ROW EXECUTE FUNCTION public.community_post_likes_counter();

CREATE OR REPLACE FUNCTION public.community_post_comments_counter()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER community_post_comments_counter_t
AFTER INSERT OR DELETE ON public.community_post_comments
FOR EACH ROW EXECUTE FUNCTION public.community_post_comments_counter();

CREATE TRIGGER update_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_post_comments_updated_at
BEFORE UPDATE ON public.community_post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
