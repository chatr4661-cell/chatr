-- Create function to increment community member count
CREATE OR REPLACE FUNCTION increment_community_members(community_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET member_count = COALESCE(member_count, 0) + 1
  WHERE id = community_id;
END;
$$;