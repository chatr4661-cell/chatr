-- Add created_at timestamp to calls table if not exists
ALTER TABLE calls ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add group call support and enhanced call tracking
ALTER TABLE calls ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS missed BOOLEAN DEFAULT false;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS quality_rating INTEGER;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS connection_quality VARCHAR(20) DEFAULT 'good';
ALTER TABLE calls ADD COLUMN IF NOT EXISTS average_bitrate INTEGER;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS packet_loss_percentage DECIMAL(5,2);

-- Create call_participants table for group calls
CREATE TABLE IF NOT EXISTS call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  audio_enabled BOOLEAN DEFAULT true,
  video_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(call_id, user_id)
);

-- Create missed_calls view for easy querying
CREATE OR REPLACE VIEW missed_calls_view AS
SELECT 
  c.id,
  c.receiver_id,
  c.caller_id,
  c.caller_name,
  c.call_type,
  c.created_at,
  c.missed,
  p.avatar_url as caller_avatar
FROM calls c
LEFT JOIN profiles p ON p.id = c.caller_id
WHERE c.missed = true AND c.status = 'ended';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calls_receiver_missed ON calls(receiver_id, missed) WHERE missed = true;
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON call_participants(user_id);

-- Enable RLS on call_participants
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_participants
CREATE POLICY "Users can view their own call participations"
  ON call_participants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own participations"
  ON call_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations"
  ON call_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to mark call as missed
CREATE OR REPLACE FUNCTION mark_call_as_missed()
RETURNS TRIGGER AS $$
BEGIN
  -- If call ended while ringing, mark as missed
  IF NEW.status = 'ended' AND OLD.status = 'ringing' AND NEW.started_at IS NULL THEN
    NEW.missed = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for missed calls
DROP TRIGGER IF EXISTS trigger_mark_missed_call ON calls;
CREATE TRIGGER trigger_mark_missed_call
  BEFORE UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION mark_call_as_missed();

-- Add realtime for call_participants
ALTER PUBLICATION supabase_realtime ADD TABLE call_participants;