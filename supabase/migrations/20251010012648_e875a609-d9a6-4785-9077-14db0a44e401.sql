-- Phase 2: Core Feature Stability Tables

-- Error logging for production monitoring
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  message text NOT NULL,
  stack text,
  component text,
  metadata jsonb DEFAULT '{}',
  user_agent text,
  url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all error logs"
ON error_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert error logs"
ON error_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Message delivery tracking
CREATE TABLE IF NOT EXISTS message_delivery_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES profiles(id) NOT NULL,
  status text NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'read'
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_delivery_message_id ON message_delivery_status(message_id);
CREATE INDEX idx_delivery_recipient_id ON message_delivery_status(recipient_id);

ALTER TABLE message_delivery_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery status for their messages"
ON message_delivery_status FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages
    WHERE messages.id = message_delivery_status.message_id
    AND (messages.sender_id = auth.uid() OR recipient_id = auth.uid())
  )
);

CREATE POLICY "System can update delivery status"
ON message_delivery_status FOR ALL
TO authenticated
USING (true);

-- Call quality metrics storage
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS quality_metrics jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_participants integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS reconnection_count integer DEFAULT 0;

-- Network diagnostics
CREATE TABLE IF NOT EXISTS network_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  connection_type text, -- '4g', 'wifi', 'ethernet', etc.
  downlink_speed numeric, -- Mbps
  uplink_speed numeric, -- Mbps
  latency numeric, -- ms
  diagnostics_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_network_user_id ON network_diagnostics(user_id);
CREATE INDEX idx_network_created_at ON network_diagnostics(created_at DESC);

ALTER TABLE network_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own diagnostics"
ON network_diagnostics FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diagnostics"
ON network_diagnostics FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Message retry tracking
CREATE TABLE IF NOT EXISTS message_retry_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  retry_count integer DEFAULT 0,
  last_retry_at timestamptz,
  error_message text,
  succeeded boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_retry_message_id ON message_retry_log(message_id);

ALTER TABLE message_retry_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view retry logs for their messages"
ON message_retry_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages
    WHERE messages.id = message_retry_log.message_id
    AND messages.sender_id = auth.uid()
  )
);

CREATE POLICY "System can insert retry logs"
ON message_retry_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to auto-update delivery status
CREATE OR REPLACE FUNCTION update_message_delivery()
RETURNS trigger AS $$
BEGIN
  -- When a message is read, update delivery status
  IF NEW.read_at IS NOT NULL AND (OLD.read_at IS NULL OR OLD.read_at IS DISTINCT FROM NEW.read_at) THEN
    UPDATE message_delivery_status
    SET 
      status = 'read',
      read_at = NEW.read_at
    WHERE message_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_delivery_status
AFTER UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION update_message_delivery();
