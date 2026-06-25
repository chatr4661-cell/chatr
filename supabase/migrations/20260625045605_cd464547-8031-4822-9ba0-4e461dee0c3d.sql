-- 1. Unlimited pinning per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conversation_participants'
      AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE public.conversation_participants ADD COLUMN is_pinned boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- 2. chat_folders table
CREATE TABLE IF NOT EXISTS public.chat_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_folders TO authenticated;
GRANT ALL ON public.chat_folders TO service_role;

ALTER TABLE public.chat_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own chat folders" ON public.chat_folders;
CREATE POLICY "Users can manage their own chat folders"
ON public.chat_folders
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. chat_folder_items table
CREATE TABLE IF NOT EXISTS public.chat_folder_items (
  folder_id UUID NOT NULL REFERENCES public.chat_folders(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (folder_id, conversation_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_folder_items TO authenticated;
GRANT ALL ON public.chat_folder_items TO service_role;

ALTER TABLE public.chat_folder_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own chat folder items" ON public.chat_folder_items;
CREATE POLICY "Users can manage their own chat folder items"
ON public.chat_folder_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.chat_folders
    WHERE chat_folders.id = chat_folder_items.folder_id
      AND chat_folders.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_folders
    WHERE chat_folders.id = chat_folder_items.folder_id
      AND chat_folders.user_id = auth.uid()
  )
);

-- updated_at trigger for chat_folders
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_chat_folders_updated_at ON public.chat_folders;
CREATE TRIGGER update_chat_folders_updated_at
  BEFORE UPDATE ON public.chat_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Profile themes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_theme_color TEXT,
  ADD COLUMN IF NOT EXISTS profile_theme_style TEXT DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS profile_cover_url TEXT;

COMMENT ON COLUMN public.profiles.profile_theme_color IS 'Hex color or CSS variable for the custom profile background theme';
COMMENT ON COLUMN public.profiles.profile_theme_style IS 'Style type of the theme: solid, gradient, glass, mesh, etc.';
COMMENT ON COLUMN public.profiles.profile_cover_url IS 'Optional cover image URL for the top of the profile';

-- 5. Custom notification sounds
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS custom_notification_sound TEXT DEFAULT 'default';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_notification_sound TEXT DEFAULT 'default';

COMMENT ON COLUMN public.conversation_participants.custom_notification_sound IS 'Custom notification sound ID for this specific chat (e.g. glass_chime, minimal_pop, amoled_ping, synth_wave)';
COMMENT ON COLUMN public.profiles.default_notification_sound IS 'Global default notification sound ID for the user';