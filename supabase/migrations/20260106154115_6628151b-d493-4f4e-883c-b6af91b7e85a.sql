-- Allow authenticated users to search profiles globally (for dialer/contact discovery)
-- This is a business requirement for CHATR to work like a phone/messaging app
CREATE POLICY "Authenticated users can search profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);