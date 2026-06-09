-- 1. Skip temp-* slugs on INSERT and also handle slug rename on UPDATE
CREATE OR REPLACE FUNCTION public.auto_create_business_vanity_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slug text;
BEGIN
  v_slug := NEW.slug;
  IF v_slug IS NULL OR v_slug = '' THEN
    v_slug := public.generate_slug(NEW.name);
  END IF;
  IF v_slug IS NULL OR v_slug = '' OR v_slug LIKE 'temp-%' THEN
    RETURN NEW;
  END IF;

  -- On UPDATE: remove old temp-* vanity URLs that point to this business
  IF TG_OP = 'UPDATE' AND OLD.slug IS DISTINCT FROM NEW.slug THEN
    DELETE FROM public.vanity_urls
    WHERE target_type = 'business'
      AND target_id = NEW.id
      AND slug LIKE 'temp-%';
  END IF;

  INSERT INTO public.vanity_urls (slug, target_type, target_id)
  VALUES (v_slug, 'business', NEW.id)
  ON CONFLICT (slug) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2. Re-run trigger on slug update too
DROP TRIGGER IF EXISTS trg_auto_create_business_vanity_url ON public.businesses;
CREATE TRIGGER trg_auto_create_business_vanity_url
AFTER INSERT OR UPDATE OF slug, name ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.auto_create_business_vanity_url();

-- 3. Cleanup: fix DIFFERENT. Essaouira and any other business with a temp-* vanity URL
DELETE FROM public.vanity_urls
WHERE target_type = 'business'
  AND slug LIKE 'temp-%';

INSERT INTO public.vanity_urls (slug, target_type, target_id)
SELECT b.slug, 'business', b.id
FROM public.businesses b
WHERE b.slug IS NOT NULL
  AND b.slug <> ''
  AND b.slug NOT LIKE 'temp-%'
  AND NOT EXISTS (
    SELECT 1 FROM public.vanity_urls v
    WHERE v.target_type = 'business' AND v.target_id = b.id
  )
ON CONFLICT (slug) DO NOTHING;