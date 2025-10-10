-- Circle AI Matching: Connect users with similar emotions
CREATE TABLE IF NOT EXISTS emotion_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_emotion VARCHAR(50) NOT NULL,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5),
  looking_for_connection BOOLEAN DEFAULT true,
  active_until TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Live Rooms: Public conversations
CREATE TABLE IF NOT EXISTS live_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT,
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  participant_count INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 50,
  room_type VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_speaking BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);

-- Viral AI Moments: Shareable snippets
CREATE TABLE IF NOT EXISTS ai_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_snippet TEXT NOT NULL,
  emotion_captured VARCHAR(50),
  share_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moment_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID NOT NULL REFERENCES ai_moments(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_to_platform VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE emotion_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their emotion circle status"
  ON emotion_circles FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view active circles for matching"
  ON emotion_circles FOR SELECT
  USING (looking_for_connection = true AND active_until > now());

CREATE POLICY "Anyone can view active public rooms"
  ON live_rooms FOR SELECT
  USING (is_public = true AND is_active = true);

CREATE POLICY "Room hosts can manage their rooms"
  ON live_rooms FOR ALL
  USING (auth.uid() = host_id);

CREATE POLICY "Users can join rooms"
  ON room_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view room participants"
  ON room_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_rooms 
      WHERE live_rooms.id = room_participants.room_id 
      AND (live_rooms.is_public = true OR live_rooms.host_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their AI moments"
  ON ai_moments FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public moments"
  ON ai_moments FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can share moments"
  ON moment_shares FOR ALL
  USING (auth.uid() = shared_by);

-- Indexes
CREATE INDEX idx_emotion_circles_active ON emotion_circles(current_emotion, active_until) WHERE looking_for_connection = true;
CREATE INDEX idx_live_rooms_active ON live_rooms(is_active, created_at DESC) WHERE is_public = true;
CREATE INDEX idx_ai_moments_public ON ai_moments(created_at DESC, like_count DESC) WHERE is_public = true;

-- Function to find emotion matches
CREATE OR REPLACE FUNCTION find_emotion_matches(
  p_user_id UUID,
  p_emotion VARCHAR(50)
) RETURNS TABLE(
  match_user_id UUID,
  username TEXT,
  avatar_url TEXT,
  emotion VARCHAR(50),
  intensity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.user_id,
    p.username,
    p.avatar_url,
    ec.current_emotion,
    ec.intensity
  FROM emotion_circles ec
  JOIN profiles p ON p.id = ec.user_id
  WHERE ec.current_emotion = p_emotion
    AND ec.user_id != p_user_id
    AND ec.looking_for_connection = true
    AND ec.active_until > now()
  ORDER BY ec.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;