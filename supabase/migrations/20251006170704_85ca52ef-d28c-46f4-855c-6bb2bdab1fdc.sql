-- Create connection requests table
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Enable RLS
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- Users can send connection requests
CREATE POLICY "Users can send connection requests"
  ON public.connection_requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can view their sent and received requests
CREATE POLICY "Users can view their connection requests"
  ON public.connection_requests
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can update requests they received
CREATE POLICY "Users can update received requests"
  ON public.connection_requests
  FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Users can delete their sent requests
CREATE POLICY "Users can delete sent requests"
  ON public.connection_requests
  FOR DELETE
  USING (auth.uid() = sender_id);

-- Create index for faster lookups
CREATE INDEX idx_connection_requests_sender ON public.connection_requests(sender_id);
CREATE INDEX idx_connection_requests_receiver ON public.connection_requests(receiver_id);
CREATE INDEX idx_connection_requests_status ON public.connection_requests(status);