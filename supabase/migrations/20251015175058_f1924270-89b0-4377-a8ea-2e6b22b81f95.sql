-- Clean up calls table schema
ALTER TABLE calls DROP COLUMN IF EXISTS caller_signal;
ALTER TABLE calls DROP COLUMN IF EXISTS receiver_signal;
ALTER TABLE calls DROP COLUMN IF EXISTS ice_servers;

-- Add webrtc_state tracking
ALTER TABLE calls ADD COLUMN IF NOT EXISTS webrtc_state text 
  CHECK (webrtc_state IN ('signaling', 'connecting', 'connected', 'failed', 'ended'))
  DEFAULT 'signaling';

-- Function to cleanup old webrtc signals (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_webrtc_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM webrtc_signals 
  WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Add index on created_at for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_created_at 
ON webrtc_signals(created_at);