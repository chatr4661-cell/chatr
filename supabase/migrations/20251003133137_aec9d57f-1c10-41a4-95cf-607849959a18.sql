-- Create table for WebRTC signaling
CREATE TABLE IF NOT EXISTS public.webrtc_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL,
  signal_type TEXT NOT NULL,
  signal_data JSONB NOT NULL,
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- Users can send signals
CREATE POLICY "Users can send signals"
  ON public.webrtc_signals
  FOR INSERT
  WITH CHECK (auth.uid() = from_user);

-- Users can receive signals
CREATE POLICY "Users can view their signals"
  ON public.webrtc_signals
  FOR SELECT
  USING (auth.uid() = to_user);

-- Users can delete their received signals
CREATE POLICY "Users can delete their signals"
  ON public.webrtc_signals
  FOR DELETE
  USING (auth.uid() = to_user);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;

-- Add index for performance
CREATE INDEX webrtc_signals_call_id_idx ON public.webrtc_signals(call_id);
CREATE INDEX webrtc_signals_to_user_idx ON public.webrtc_signals(to_user);