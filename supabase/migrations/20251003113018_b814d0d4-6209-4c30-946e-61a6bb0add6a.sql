-- Fix RLS policy for conversations to allow authenticated users to create conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a simpler, more permissive policy for conversation creation
-- This allows any authenticated user to create a conversation
CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Update the existing SELECT policy to be more permissive
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations 
FOR SELECT 
TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id 
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Ensure conversation_participants policies allow users to add participants
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;

CREATE POLICY "Users can add participants to conversations" 
ON public.conversation_participants 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = conversation_id 
    AND conversations.created_by = auth.uid()
  )
  OR user_id = auth.uid()
);