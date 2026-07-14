
-- =====================================================================
-- Security hardening batch
-- =====================================================================

-- 1) Fix search_path on 4 SECURITY DEFINER functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

-- 2) Revoke EXECUTE from anon/authenticated on internal email queue SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;

-- 3) Convert businesses_public view to SECURITY INVOKER (fixes SUPA_security_definer_view)
ALTER VIEW public.businesses_public SET (security_invoker = true);

-- 4) blocked_domains, broken_links, hotel_api_mappings: staff-only SELECT + public RPCs
DROP POLICY IF EXISTS blocked_domains_select ON public.blocked_domains;
CREATE POLICY blocked_domains_select_staff ON public.blocked_domains
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS broken_links_select ON public.broken_links;
CREATE POLICY broken_links_select_staff ON public.broken_links
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS hotel_api_mappings_select ON public.hotel_api_mappings;
CREATE POLICY hotel_api_mappings_select_staff ON public.hotel_api_mappings
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Public RPCs returning only the minimal data the front needs
CREATE OR REPLACE FUNCTION public.get_blocked_domains_list()
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT domain FROM public.blocked_domains WHERE is_active = true $$;
GRANT EXECUTE ON FUNCTION public.get_blocked_domains_list() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_broken_urls_list()
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT url FROM public.broken_links WHERE is_active = true $$;
GRANT EXECUTE ON FUNCTION public.get_broken_urls_list() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_hotel_mapping_for_business(_business_id uuid)
RETURNS TABLE(liteapi_hotel_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT liteapi_hotel_id FROM public.hotel_api_mappings WHERE business_id = _business_id $$;
GRANT EXECUTE ON FUNCTION public.get_hotel_mapping_for_business(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_hotel_mappings_by_liteapi_ids(_ids text[])
RETURNS TABLE(liteapi_hotel_id text, business_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT liteapi_hotel_id, business_id FROM public.hotel_api_mappings WHERE liteapi_hotel_id = ANY(_ids) $$;
GRANT EXECUTE ON FUNCTION public.get_hotel_mappings_by_liteapi_ids(text[]) TO anon, authenticated;

-- 5) video_jobs: tighten policies (fixes SUPA_rls_policy_always_true + video_jobs_public_read_write)
DROP POLICY IF EXISTS "Anyone can create video jobs" ON public.video_jobs;
DROP POLICY IF EXISTS "Anyone can read video jobs" ON public.video_jobs;
DROP POLICY IF EXISTS "Anyone can update video jobs" ON public.video_jobs;

CREATE POLICY video_jobs_insert_own ON public.video_jobs
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY video_jobs_select_own_or_staff ON public.video_jobs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY video_jobs_update_staff ON public.video_jobs
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY video_jobs_delete_own_or_staff ON public.video_jobs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- 6) storage.objects: fix public buckets that allow listing
--    Public buckets keep serving public URLs even without a broad SELECT policy on storage.objects.
--    Restrict listing to staff (or object owner where relevant).
DROP POLICY IF EXISTS "Anyone can view external link images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view web-only media" ON storage.objects;
DROP POLICY IF EXISTS "Business images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Business videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can read certification images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read club avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view studio videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read affiliate promo images" ON storage.objects;
DROP POLICY IF EXISTS "Sponsor assets are publicly accessible" ON storage.objects;

-- 7) studio-videos bucket: restrict writes (fixes studio_videos_bucket_unrestricted)
DROP POLICY IF EXISTS "Anyone can upload studio videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update studio videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete studio videos" ON storage.objects;

CREATE POLICY "Staff can manage studio videos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'studio-videos' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'studio-videos' AND public.is_staff(auth.uid()));

-- 8) Update trigger_video_render_workflow to authenticate against the edge function
--    with the service role key (fetched from vault). The edge function will accept
--    it as an internal call.
CREATE OR REPLACE FUNCTION public.trigger_video_render_workflow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  active_count integer;
  service_key text;
BEGIN
  SELECT count(*) INTO active_count
  FROM public.video_jobs
  WHERE status = 'rendering'
    AND id <> NEW.id
    AND updated_at > now() - interval '15 minutes';

  IF active_count > 0 THEN
    RAISE NOTICE 'Skip workflow dispatch — % job(s) already rendering', active_count;
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key';

  PERFORM net.http_post(
    url := 'https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/trigger-render-workflow',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, ''),
      'Lovable-Context', 'trigger'
    ),
    body := jsonb_build_object('job_id', NEW.id)
  );
  RETURN NEW;
END;
$function$;
