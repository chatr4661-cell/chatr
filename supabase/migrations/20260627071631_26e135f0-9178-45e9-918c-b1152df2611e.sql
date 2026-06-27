DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'timeline_item' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.timeline_item AS (
      id uuid,
      timeline_type text,
      created_at timestamptz,
      sender_id uuid,
      payload jsonb
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_universal_timeline(
  p_conversation_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.timeline_item
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the caller is part of the conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    -- 1. MESSAGES
    SELECT
      m.id,
      'message'::text AS timeline_type,
      m.created_at,
      m.sender_id,
      row_to_json(m)::jsonb AS payload
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id

    UNION ALL

    -- 2. CALLS
    SELECT
      c.id,
      'call'::text AS timeline_type,
      c.started_at AS created_at,
      c.caller_id AS sender_id,
      row_to_json(c)::jsonb AS payload
    FROM public.calls c
    WHERE c.conversation_id = p_conversation_id
  ) AS timeline
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_universal_timeline(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_universal_timeline(uuid, integer, integer) TO service_role;