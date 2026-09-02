CREATE OR REPLACE FUNCTION public.queue_video_orientation_measure()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'business_documents' THEN
    IF COALESCE(NEW.type, '') <> 'video' THEN
      RETURN NEW;
    END IF;
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