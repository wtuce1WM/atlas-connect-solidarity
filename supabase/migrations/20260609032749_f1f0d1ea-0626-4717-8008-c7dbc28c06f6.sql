
CREATE OR REPLACE FUNCTION public.auto_create_business_vanity_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slug text;
BEGIN
  v_slug := NEW.slug;
  IF v_slug IS NULL OR v_slug = '' THEN
    v_slug := public.generate_slug(NEW.name);
  END IF;
  IF v_slug IS NULL OR v_slug = '' THEN
    RETURN NEW;
  END IF;

  -- Insert vanity URL if slug not already taken
  INSERT INTO public.vanity_urls (slug, target_type, target_id)
  VALUES (v_slug, 'business', NEW.id)
  ON CONFLICT (slug) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_business_vanity_url ON public.businesses;
CREATE TRIGGER trg_auto_create_business_vanity_url
AFTER INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_business_vanity_url();
