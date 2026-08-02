CREATE TABLE public.business_ai_texts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  hook text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  source_mode text NOT NULL DEFAULT 'reviews_suggestions',
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  model text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_ai_texts_business ON public.business_ai_texts(business_id, position);

GRANT SELECT ON public.business_ai_texts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_ai_texts TO authenticated;
GRANT ALL ON public.business_ai_texts TO service_role;

ALTER TABLE public.business_ai_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active ai texts"
ON public.business_ai_texts FOR SELECT
USING (
  is_active = true
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.is_active = true)
);

CREATE POLICY "Staff can manage ai texts"
ON public.business_ai_texts FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Affiliates can manage their business ai texts"
ON public.business_ai_texts FOR ALL
TO authenticated
USING (public.is_own_affiliate_business(auth.uid(), business_id))
WITH CHECK (public.is_own_affiliate_business(auth.uid(), business_id));

CREATE OR REPLACE FUNCTION public.enforce_business_ai_texts_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM public.business_ai_texts WHERE business_id = NEW.business_id;
  IF cnt >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 textes IA par établissement';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_business_ai_texts_limit
BEFORE INSERT ON public.business_ai_texts
FOR EACH ROW EXECUTE FUNCTION public.enforce_business_ai_texts_limit();

CREATE OR REPLACE FUNCTION public.trim_business_ai_texts_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.content := left(coalesce(NEW.content, ''), 2000);
  NEW.title := left(coalesce(NEW.title, ''), 200);
  NEW.hook := left(coalesce(NEW.hook, ''), 200);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_business_ai_texts_trim
BEFORE INSERT OR UPDATE ON public.business_ai_texts
FOR EACH ROW EXECUTE FUNCTION public.trim_business_ai_texts_content();