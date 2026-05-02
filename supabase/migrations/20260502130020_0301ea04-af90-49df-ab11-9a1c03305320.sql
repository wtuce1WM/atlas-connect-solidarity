ALTER TABLE public.business_documents
  ADD COLUMN IF NOT EXISTS business_is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.business_youtube_videos
  ADD COLUMN IF NOT EXISTS business_is_active boolean NOT NULL DEFAULT true;

UPDATE public.business_documents bd
SET business_is_active = b.is_active
FROM public.businesses b
WHERE bd.business_id = b.id
  AND bd.business_is_active IS DISTINCT FROM b.is_active;

UPDATE public.business_youtube_videos byv
SET business_is_active = b.is_active
FROM public.businesses b
WHERE byv.business_id = b.id
  AND byv.business_is_active IS DISTINCT FROM b.is_active;

CREATE INDEX IF NOT EXISTS idx_business_documents_is_active
  ON public.business_documents (business_is_active);
CREATE INDEX IF NOT EXISTS idx_business_youtube_videos_is_active
  ON public.business_youtube_videos (business_is_active);

CREATE OR REPLACE FUNCTION public.propagate_business_is_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    UPDATE public.business_documents
    SET business_is_active = NEW.is_active
    WHERE business_id = NEW.id;

    UPDATE public.business_youtube_videos
    SET business_is_active = NEW.is_active
    WHERE business_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_business_is_active ON public.businesses;
CREATE TRIGGER trg_propagate_business_is_active
AFTER UPDATE OF is_active ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.propagate_business_is_active();

CREATE OR REPLACE FUNCTION public.set_business_is_active_on_doc_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.business_id IS NOT NULL THEN
    SELECT b.is_active INTO NEW.business_is_active
    FROM public.businesses b
    WHERE b.id = NEW.business_id;
    IF NEW.business_is_active IS NULL THEN
      NEW.business_is_active := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_business_is_active_on_doc_insert ON public.business_documents;
CREATE TRIGGER trg_set_business_is_active_on_doc_insert
BEFORE INSERT ON public.business_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_business_is_active_on_doc_insert();

DROP TRIGGER IF EXISTS trg_set_business_is_active_on_yt_insert ON public.business_youtube_videos;
CREATE TRIGGER trg_set_business_is_active_on_yt_insert
BEFORE INSERT ON public.business_youtube_videos
FOR EACH ROW
EXECUTE FUNCTION public.set_business_is_active_on_doc_insert();
