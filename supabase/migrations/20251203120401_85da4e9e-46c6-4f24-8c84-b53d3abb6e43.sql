-- Create story_reactions table
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Create story_highlights table
CREATE TABLE IF NOT EXISTS public.story_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_url TEXT,
  stories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;

-- RLS policies for story_reactions
CREATE POLICY "Users can view all reactions" ON public.story_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add their own reactions" ON public.story_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reactions" ON public.story_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reactions" ON public.story_reactions FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for story_highlights
CREATE POLICY "Users can view all highlights" ON public.story_highlights FOR SELECT USING (true);
CREATE POLICY "Users can create their own highlights" ON public.story_highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own highlights" ON public.story_highlights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own highlights" ON public.story_highlights FOR DELETE USING (auth.uid() = user_id);