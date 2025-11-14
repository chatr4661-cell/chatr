-- Add unique constraint to saved_searches table
ALTER TABLE public.saved_searches 
ADD CONSTRAINT saved_searches_user_id_query_key UNIQUE (user_id, query);