-- Enable REPLICA IDENTITY FULL for reliable realtime updates on calls table
ALTER TABLE public.calls REPLICA IDENTITY FULL;