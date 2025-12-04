
-- Real-time message translations table
CREATE TABLE IF NOT EXISTS public.message_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  source_language VARCHAR(10),
  target_language VARCHAR(10) NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Voice message transcriptions table
CREATE TABLE IF NOT EXISTS public.voice_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  transcription TEXT NOT NULL,
  language VARCHAR(10),
  confidence DECIMAL(3,2),
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Call recordings table
CREATE TABLE IF NOT EXISTS public.call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL,
  user_id UUID NOT NULL,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Voicemail table
CREATE TABLE IF NOT EXISTS public.voicemails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  transcription TEXT,
  duration_seconds INTEGER,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Link previews cache table
CREATE TABLE IF NOT EXISTS public.link_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  favicon_url TEXT,
  site_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days'
);

-- Photo albums table
CREATE TABLE IF NOT EXISTS public.photo_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Album photos table
CREATE TABLE IF NOT EXISTS public.album_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.photo_albums(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User verification badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_type VARCHAR(50) NOT NULL, -- 'verified', 'creator', 'business', 'celebrity'
  verified_at TIMESTAMPTZ DEFAULT now(),
  verified_by UUID,
  verification_details JSONB
);

-- Profile music/anthem table
CREATE TABLE IF NOT EXISTS public.profile_music (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  track_name TEXT NOT NULL,
  artist_name TEXT,
  preview_url TEXT,
  spotify_uri TEXT,
  album_art_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Smart notification bundles table
CREATE TABLE IF NOT EXISTS public.notification_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bundle_type VARCHAR(50) NOT NULL,
  notification_ids UUID[] NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quick reply templates table
CREATE TABLE IF NOT EXISTS public.quick_reply_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_text TEXT NOT NULL,
  category VARCHAR(50),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI generated stickers table
CREATE TABLE IF NOT EXISTS public.ai_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_photo_url TEXT NOT NULL,
  sticker_url TEXT NOT NULL,
  style VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mutual friends tracking
CREATE TABLE IF NOT EXISTS public.mutual_friends (
  user_a UUID NOT NULL,
  user_b UUID NOT NULL,
  mutual_friend_ids UUID[] NOT NULL,
  mutual_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_a, user_b)
);

-- Enable RLS
ALTER TABLE public.message_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voicemails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_music ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_reply_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutual_friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own translations" ON public.message_translations FOR SELECT USING (true);
CREATE POLICY "Users can insert translations" ON public.message_translations FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own transcriptions" ON public.voice_transcriptions FOR SELECT USING (true);
CREATE POLICY "Users can insert transcriptions" ON public.voice_transcriptions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own recordings" ON public.call_recordings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recordings" ON public.call_recordings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recordings" ON public.call_recordings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their voicemails" ON public.voicemails FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = caller_id);
CREATE POLICY "Users can leave voicemails" ON public.voicemails FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update their voicemails" ON public.voicemails FOR UPDATE USING (auth.uid() = receiver_id);

CREATE POLICY "Anyone can read link previews" ON public.link_previews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert link previews" ON public.link_previews FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view public albums or own albums" ON public.photo_albums FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own albums" ON public.photo_albums FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view photos in accessible albums" ON public.album_photos FOR SELECT USING (true);
CREATE POLICY "Users can manage photos in their albums" ON public.album_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.photo_albums WHERE id = album_photos.album_id AND user_id = auth.uid())
);

CREATE POLICY "Anyone can view badges" ON public.user_badges FOR SELECT USING (true);

CREATE POLICY "Users can manage their profile music" ON public.profile_music FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view profile music" ON public.profile_music FOR SELECT USING (true);

CREATE POLICY "Users can manage their notification bundles" ON public.notification_bundles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their templates" ON public.quick_reply_templates FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their stickers" ON public.ai_stickers FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view mutual friends" ON public.mutual_friends FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Indexes
CREATE INDEX idx_message_translations_message ON public.message_translations(message_id);
CREATE INDEX idx_voice_transcriptions_message ON public.voice_transcriptions(message_id);
CREATE INDEX idx_call_recordings_call ON public.call_recordings(call_id);
CREATE INDEX idx_voicemails_receiver ON public.voicemails(receiver_id);
CREATE INDEX idx_link_previews_url ON public.link_previews(url);
CREATE INDEX idx_photo_albums_user ON public.photo_albums(user_id);
CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);
