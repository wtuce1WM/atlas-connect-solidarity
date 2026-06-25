CREATE OR REPLACE FUNCTION public.trigger_video_render_workflow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  active_count integer;
BEGIN
  -- Skip dispatch if another job is already rendering — the existing worker
  -- run will pick up this new pending job in its loop (MAX_JOBS=5).
  SELECT count(*) INTO active_count
  FROM public.video_jobs
  WHERE status = 'rendering'
    AND id <> NEW.id
    AND updated_at > now() - interval '15 minutes';

  IF active_count > 0 THEN
    RAISE NOTICE 'Skip workflow dispatch — % job(s) already rendering', active_count;
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/trigger-render-workflow',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbnBoZ2RyYXdwc251bW5lanpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA5ODcsImV4cCI6MjA4NTgzNjk4N30.RwHKmL6E0Gd2LTVvDkfYx5RkZ-k7LKKp4iUoCS34pW4'
    ),
    body := jsonb_build_object('job_id', NEW.id)
  );
  RETURN NEW;
END;
$function$;