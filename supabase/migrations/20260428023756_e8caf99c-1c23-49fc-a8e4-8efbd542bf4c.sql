-- 1. Fix the one trigger function missing SET search_path
CREATE OR REPLACE FUNCTION public.update_micro_task_completion_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.micro_tasks 
    SET current_completions = current_completions + 1, updated_at = now()
    WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Same fix for stealth mode trigger (also missing SECURITY DEFINER hardening)
CREATE OR REPLACE FUNCTION public.update_stealth_mode_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Revoke EXECUTE from authenticated/anon on internal SECURITY DEFINER helpers.
-- These are invoked by triggers (running as table owner) or by service-role edge functions,
-- never directly by end users. Keeping EXECUTE open lets signed-in users call them directly,
-- which is the privilege-escalation surface flagged by the linter.

DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    -- trigger-only functions
    'create_default_crm_pipeline()',
    'sync_micro_task_earning_event()',
    'auto_delete_old_location_data()',
    'update_saved_searches_updated_at()',
    'update_review_replies_updated_at()',
    'set_message_expiry()',
    'notify_user_contact_joined()',
    'trg_telemetry_closed()',
    'generate_booking_number()',
    'update_nutrition_summary()',
    'grant_ceo_role_to_founder()',
    'update_caller_id_aggregate()',
    'update_chatr_plus_service_rating()',
    'update_app_rating()',
    'update_message_delivery()',
    'update_app_last_opened()',
    'calculate_app_session_duration()',
    'notify_call_fcm()',
    'create_default_notification_preferences()',
    'update_health_updated_at()',
    'handle_geofence_updated_at()',
    'update_micro_task_completion_count()',
    'normalize_phone_search()',
    'calculate_booking_earnings()',
    'calculate_session_duration()',
    'generate_order_number()',
    'update_stealth_mode_updated_at()',
    'update_provider_rating()',
    'update_follower_count()',
    'update_trending_searches()',
    'handle_updated_at()',
    'check_participant_limit()',
    'update_fame_score()',
    'create_default_identities()',
    'update_chatr_updated_at()',
    'update_last_seen()',
    'auto_approve_verified_developer()',
    'update_phone_hash()',
    'handle_new_user()',
    -- maintenance / cron-only functions
    'cleanup_old_webrtc_signals()',
    'backfill_phone_hashes()',
    'clean_expired_geo_cache()',
    'update_cache_hit_count()',
    'expire_old_inter_app_messages()',
    'cleanup_disappearing_messages()',
    'cleanup_expired_visual_search_cache()',
    'cleanup_expired_messages()',
    'cleanup_old_fcm_delivery_logs()',
    -- admin/service-only helpers
    'sync_user_contacts(uuid, jsonb)',
    'add_call_participant(uuid, uuid)',
    'increment_community_members(uuid)',
    'increment_job_views(uuid)',
    'increment_cache_hit(uuid)',
    'ensure_user_points_exists(uuid)',
    'get_brand_for_object(text, uuid)',
    'check_api_limit(text, integer)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM authenticated, anon, public', fn);
    EXCEPTION WHEN undefined_function THEN
      -- skip if signature drift; not fatal
      NULL;
    END;
  END LOOP;
END $$;