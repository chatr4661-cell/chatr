CREATE OR REPLACE FUNCTION public.get_public_profile(handle_input text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_handle text := lower(regexp_replace(coalesce(handle_input, ''), '^@', ''));
  profile_record RECORD;
  discovery_record jsonb;
  identities_record jsonb;
BEGIN
  IF clean_handle = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.id, p.username, p.avatar_url, p.primary_handle
  INTO profile_record
  FROM public.profiles p
  WHERE lower(coalesce(p.primary_handle, '')) = clean_handle
     OR lower(coalesce(p.username, '')) = clean_handle
  LIMIT 1;

  IF profile_record.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', ui.id,
        'handle', ui.handle,
        'suffix', ui.suffix,
        'full_handle', ui.full_handle,
        'display_name', ui.display_name,
        'bio', ui.bio,
        'avatar_url', ui.avatar_url,
        'identity_type', ui.identity_type,
        'is_active', ui.is_active,
        'visibility', ui.visibility,
        'auto_reply_enabled', ui.auto_reply_enabled,
        'ai_clone_enabled', ui.ai_clone_enabled,
        'ai_clone_personality', ui.ai_clone_personality,
        'ai_clone_boundaries', ui.ai_clone_boundaries,
        'created_at', ui.created_at
      )
      ORDER BY ui.created_at
    ),
    '[]'::jsonb
  )
  INTO identities_record
  FROM public.user_identities ui
  WHERE ui.user_id = profile_record.id
    AND ui.is_active = true
    AND ui.visibility = 'public';

  SELECT to_jsonb(d)
  INTO discovery_record
  FROM (
    SELECT
      udp.headline,
      udp.skills,
      udp.company,
      udp.job_title,
      udp.location,
      udp.city,
      udp.country,
      udp.industry,
      udp.website,
      udp.social_links,
      udp.is_searchable,
      udp.search_visibility,
      udp.allow_messages_from,
      udp.allow_calls_from,
      udp.show_phone_to,
      udp.anonymous_mode
    FROM public.user_discovery_profiles udp
    WHERE udp.user_id = profile_record.id
      AND udp.is_searchable = true
      AND COALESCE(udp.anonymous_mode, false) = false
    LIMIT 1
  ) d;

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'id', profile_record.id,
      'username', profile_record.username,
      'avatar_url', profile_record.avatar_url,
      'primary_handle', profile_record.primary_handle
    ),
    'identities', identities_record,
    'discovery', discovery_record
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO authenticated;