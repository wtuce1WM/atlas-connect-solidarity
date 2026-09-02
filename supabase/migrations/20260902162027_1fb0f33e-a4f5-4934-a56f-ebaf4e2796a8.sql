-- 1) Jeton interne partagé (jamais exposé au client)
CREATE TABLE IF NOT EXISTS public.internal_service_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_service_tokens TO service_role;
ALTER TABLE public.internal_service_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_service_tokens (name) VALUES ('video_orientation')
ON CONFLICT (name) DO NOTHING;

-- 2) BEFORE : toute vidéo ajoutée / fichier changé repart sans orientation
CREATE OR REPLACE FUNCTION public.queue_video_orientation_measure()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'business_documents' AND COALESCE(NEW.type, '') <> 'video' THEN
    RETURN NEW;
  END IF;
  IF NEW.url IS NULL OR NEW.url !~* '\.(mp4|m4v|mov)($|\?)' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.url IS DISTINCT FROM OLD.url THEN
    NEW.orientation := NULL;
    NEW.media_width := NULL;
    NEW.media_height := NULL;
    NEW.orientation_checked_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_orientation ON public.business_documents;
CREATE TRIGGER trg_queue_orientation
  BEFORE INSERT OR UPDATE OF url, type ON public.business_documents
  FOR EACH ROW EXECUTE FUNCTION public.queue_video_orientation_measure();

DROP TRIGGER IF EXISTS trg_queue_orientation ON public.generic_videos;
CREATE TRIGGER trg_queue_orientation
  BEFORE INSERT OR UPDATE OF url ON public.generic_videos
  FOR EACH ROW EXECUTE FUNCTION public.queue_video_orientation_measure();

-- 3) AFTER (par instruction) : une seule mesure asynchrone pour tout le lot
CREATE OR REPLACE FUNCTION public.notify_video_orientation_measure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE tok text; ids uuid[];
BEGIN
  IF TG_TABLE_NAME = 'business_documents' THEN
    SELECT array_agg(n.id) INTO ids FROM new_rows n
     WHERE COALESCE(n.type, '') = 'video' AND n.orientation_checked_at IS NULL
       AND n.url ~* '\.(mp4|m4v|mov)($|\?)';
  ELSE
    SELECT array_agg(n.id) INTO ids FROM new_rows n
     WHERE n.orientation_checked_at IS NULL AND n.url ~* '\.(mp4|m4v|mov)($|\?)';
  END IF;
  IF ids IS NULL OR array_length(ids, 1) = 0 THEN RETURN NULL; END IF;

  SELECT token INTO tok FROM public.internal_service_tokens WHERE name = 'video_orientation';
  IF tok IS NULL THEN RETURN NULL; END IF;

  PERFORM net.http_post(
    url := 'https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/backfill-video-orientation',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', tok),
    body := jsonb_build_object('table', TG_TABLE_NAME, 'concurrency', 8,
                               'limit', LEAST(array_length(ids, 1), 300),
                               'ids', to_jsonb(ids)));
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_video_orientation_measure() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_orientation_ins ON public.business_documents;
CREATE TRIGGER trg_notify_orientation_ins
  AFTER INSERT ON public.business_documents
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.notify_video_orientation_measure();

DROP TRIGGER IF EXISTS trg_notify_orientation_upd ON public.business_documents;
CREATE TRIGGER trg_notify_orientation_upd
  AFTER UPDATE ON public.business_documents
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.notify_video_orientation_measure();

DROP TRIGGER IF EXISTS trg_notify_orientation_ins ON public.generic_videos;
CREATE TRIGGER trg_notify_orientation_ins
  AFTER INSERT ON public.generic_videos
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.notify_video_orientation_measure();

DROP TRIGGER IF EXISTS trg_notify_orientation_upd ON public.generic_videos;
CREATE TRIGGER trg_notify_orientation_upd
  AFTER UPDATE ON public.generic_videos
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.notify_video_orientation_measure();