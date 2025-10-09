-- Fix RLS policy to allow users to see other participants in their conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversation_participants;

CREATE POLICY "Users can view participants in their conversations"
ON conversation_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);