-- Multi-party group call rooms
CREATE TABLE public.session_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_goal text NOT NULL,
  room_name text,
  max_participants int DEFAULT 10,
  status text DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE public.session_room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.session_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  call_id uuid REFERENCES public.calls(id) ON DELETE SET NULL,
  UNIQUE(room_id, user_id)
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_rooms TO authenticated;
GRANT ALL ON public.session_rooms TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_room_participants TO authenticated;
GRANT ALL ON public.session_room_participants TO service_role;

-- Enable RLS
ALTER TABLE public.session_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_room_participants ENABLE ROW LEVEL SECURITY;

-- Recursion-safe membership helpers (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_session_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.session_room_participants
    WHERE room_id = _room_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_session_room_host(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.session_rooms
    WHERE id = _room_id AND host_id = _user_id
  );
$$;

-- Policies: session_rooms
CREATE POLICY "Users can read rooms they are part of or host"
  ON public.session_rooms FOR SELECT
  USING (host_id = auth.uid() OR public.is_session_room_member(id, auth.uid()));

CREATE POLICY "Users can create rooms"
  ON public.session_rooms FOR INSERT
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Host can update room"
  ON public.session_rooms FOR UPDATE
  USING (host_id = auth.uid());

-- Policies: session_room_participants
CREATE POLICY "Users can read participants of their rooms"
  ON public.session_room_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_session_room_member(room_id, auth.uid())
    OR public.is_session_room_host(room_id, auth.uid())
  );

CREATE POLICY "Users can insert themselves"
  ON public.session_room_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participant status"
  ON public.session_room_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Realtime
ALTER TABLE public.session_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.session_room_participants REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_room_participants;