-- Drop existing INSERT policy for conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create new INSERT policy that allows authenticated users to create conversations
CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Also ensure the UPDATE policy allows conversation participants to update
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

CREATE POLICY "Users can update their conversations" 
ON public.conversations 
FOR UPDATE 
TO authenticated
USING (
  (auth.uid() = created_by) OR 
  (EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id 
    AND conversation_participants.user_id = auth.uid()
  ))
);