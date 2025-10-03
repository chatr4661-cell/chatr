-- Fix conversation creation RLS policy
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

CREATE POLICY "Users can create conversations" 
ON conversations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add message types and features
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'video', 'document', 'location', 'contact', 'poll', 'sticker'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size bigint;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration integer; -- for voice/video in seconds
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_id uuid REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS location_latitude numeric;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS location_longitude numeric;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS location_name text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS poll_question text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS poll_options jsonb; -- array of {text, votes}

-- Message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can add reactions"
ON message_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view reactions in their conversations"
ON message_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own reactions"
ON message_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Status/Stories table
CREATE TABLE IF NOT EXISTS user_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url text,
  media_type text CHECK (media_type IN ('image', 'video', 'text')),
  content text,
  background_color text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours'),
  views_count integer DEFAULT 0
);

ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own status"
ON user_status FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view status from their contacts"
ON user_status FOR SELECT
TO authenticated
USING (
  expires_at > now() AND (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM contacts WHERE contacts.user_id = auth.uid() AND contacts.contact_user_id = user_status.user_id)
  )
);

CREATE POLICY "Users can update their own status"
ON user_status FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status"
ON user_status FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Status views table
CREATE TABLE IF NOT EXISTS status_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES user_status(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone DEFAULT now(),
  UNIQUE(status_id, viewer_id)
);

ALTER TABLE status_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record status views"
ON status_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Status owners can see who viewed"
ON status_views FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_status WHERE user_status.id = status_views.status_id AND user_status.user_id = auth.uid())
);

-- Conversation settings
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_name text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_description text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_icon_url text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS disappearing_messages_duration integer; -- in seconds, null = off
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS custom_wallpaper text;

-- Conversation participants role
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS role text DEFAULT 'member' CHECK (role IN ('admin', 'member'));
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false;

-- Typing indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can set typing status"
ON typing_indicators FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = typing_indicators.conversation_id AND user_id = auth.uid())
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type text NOT NULL CHECK (call_type IN ('voice', 'video')),
  status text DEFAULT 'ringing' CHECK (status IN ('ringing', 'ongoing', 'ended', 'missed', 'declined')),
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  duration integer -- in seconds
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create calls in their conversations"
ON calls FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = caller_id AND
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = calls.conversation_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view calls in their conversations"
ON calls FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = calls.conversation_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update their calls"
ON calls FOR UPDATE
TO authenticated
USING (auth.uid() = caller_id);

-- Broadcast lists
CREATE TABLE IF NOT EXISTS broadcast_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE broadcast_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their broadcast lists"
ON broadcast_lists FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Broadcast list recipients
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  broadcast_id uuid NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (broadcast_id, recipient_id)
);

ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage recipients of their broadcasts"
ON broadcast_recipients FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM broadcast_lists WHERE broadcast_lists.id = broadcast_recipients.broadcast_id AND broadcast_lists.user_id = auth.uid())
);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE user_status;
ALTER PUBLICATION supabase_realtime ADD TABLE calls;

-- Update profiles table for last seen
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- Function to auto-update last_seen
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles SET last_seen = now(), is_online = true WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;