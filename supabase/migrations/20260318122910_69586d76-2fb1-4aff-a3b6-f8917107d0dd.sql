
-- Add slug column
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS slug text;

-- Create a function to generate slugs from names
CREATE OR REPLACE FUNCTION public.generate_slug(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  result text;
BEGIN
  -- Lowercase, unaccent, replace non-alphanumeric with hyphens, trim hyphens
  result := lower(unaccent(input_text));
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  result := trim(both '-' from result);
  RETURN result;
END;
$$;

-- Populate slugs for all existing businesses
UPDATE public.businesses SET slug = generate_slug(name) WHERE slug IS NULL;

-- Handle duplicates by appending city
UPDATE public.businesses b1
SET slug = b1.slug || '-' || generate_slug(COALESCE(b1.city, b1.id::text))
WHERE EXISTS (
  SELECT 1 FROM public.businesses b2
  WHERE b2.slug = b1.slug AND b2.id != b1.id AND b2.ctid < b1.ctid
);

-- Handle any remaining duplicates by appending a suffix
DO $$
DECLARE
  rec RECORD;
  counter int;
BEGIN
  FOR rec IN
    SELECT slug, array_agg(id ORDER BY created_at) as ids
    FROM public.businesses
    GROUP BY slug
    HAVING count(*) > 1
  LOOP
    counter := 1;
    FOR i IN 2..array_length(rec.ids, 1) LOOP
      UPDATE public.businesses SET slug = rec.slug || '-' || counter WHERE id = rec.ids[i];
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Now make slug NOT NULL and UNIQUE
ALTER TABLE public.businesses ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_unique ON public.businesses (slug);

-- Auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION public.auto_generate_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := generate_slug(NEW.name);
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.businesses WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_generate_slug
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_slug();
