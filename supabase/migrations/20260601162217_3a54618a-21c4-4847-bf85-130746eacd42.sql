-- Evidence-only telemetry columns for call proof (read-only WebRTC stats capture)
ALTER TABLE public.call_telemetry
  ADD COLUMN IF NOT EXISTS turn_fetch_success boolean,
  ADD COLUMN IF NOT EXISTS turn_server_count integer,
  ADD COLUMN IF NOT EXISTS turn_urls jsonb,
  ADD COLUMN IF NOT EXISTS local_candidate_type text,
  ADD COLUMN IF NOT EXISTS remote_candidate_type text,
  ADD COLUMN IF NOT EXISTS selected_candidate_pair jsonb,
  ADD COLUMN IF NOT EXISTS ice_connected_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS ice_completed_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS audio_packets_sent bigint,
  ADD COLUMN IF NOT EXISTS audio_packets_received bigint,
  ADD COLUMN IF NOT EXISTS audio_bytes_sent bigint,
  ADD COLUMN IF NOT EXISTS audio_bytes_received bigint,
  ADD COLUMN IF NOT EXISTS video_packets_sent bigint,
  ADD COLUMN IF NOT EXISTS video_packets_received bigint,
  ADD COLUMN IF NOT EXISTS video_bytes_sent bigint,
  ADD COLUMN IF NOT EXISTS video_bytes_received bigint,
  ADD COLUMN IF NOT EXISTS audio_active_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS end_reason text;

-- Table previously had NO grants, so no row could ever be written. Fix that.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_telemetry TO authenticated;
GRANT ALL ON public.call_telemetry TO service_role;