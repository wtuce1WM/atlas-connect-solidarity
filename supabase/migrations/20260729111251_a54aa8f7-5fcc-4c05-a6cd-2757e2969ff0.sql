CREATE OR REPLACE FUNCTION public.trigger_video_render_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  active_count integer;
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

  PERFORM net.http_post(
    url := 'https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/trigger-render-workflow',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'trigger'
    ),
    body := jsonb_build_object('job_id', NEW.id)
  );
  RETURN NEW;
END;
$function$;