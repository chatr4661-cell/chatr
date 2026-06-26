-- Channels
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;
GRANT SELECT ON public.channels TO anon;
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Channel members
CREATE TABLE IF NOT EXISTS public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'admin', 'owner')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_members TO authenticated;
GRANT SELECT ON public.channel_members TO anon;
GRANT ALL ON public.channel_members TO service_role;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- Channel messages
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_messages TO authenticated;
GRANT SELECT ON public.channel_messages TO anon;
GRANT ALL ON public.channel_messages TO service_role;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- Security-definer helper to avoid recursive RLS on channel_members
CREATE OR REPLACE FUNCTION public.is_channel_admin(_channel_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = _channel_id
      AND cm.user_id = _user_id
      AND cm.role IN ('admin', 'owner')
  );
$$;

-- channels policies
CREATE POLICY "Channels are viewable by everyone."
  ON public.channels FOR SELECT USING (true);

CREATE POLICY "Owners can manage channels."
  ON public.channels FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- channel_members policies
CREATE POLICY "Members are viewable by everyone."
  ON public.channel_members FOR SELECT USING (true);

CREATE POLICY "Users can join channels."
  ON public.channel_members FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'subscriber');

CREATE POLICY "Admins can manage members."
  ON public.channel_members FOR ALL
  USING (public.is_channel_admin(channel_id, auth.uid()))
  WITH CHECK (public.is_channel_admin(channel_id, auth.uid()));

CREATE POLICY "Users can leave channels."
  ON public.channel_members FOR DELETE USING (auth.uid() = user_id);

-- channel_messages policies
CREATE POLICY "Messages are viewable by everyone."
  ON public.channel_messages FOR SELECT USING (true);

CREATE POLICY "Admins can insert messages."
  ON public.channel_messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND public.is_channel_admin(channel_id, auth.uid())
  );

-- updated_at trigger for channels
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_channels_updated_at ON public.channels;
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();