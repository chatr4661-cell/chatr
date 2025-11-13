-- Function to increment cache hit count
CREATE OR REPLACE FUNCTION increment_cache_hit(cache_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.search_cache
  SET 
    hit_count = hit_count + 1,
    last_updated = now()
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;