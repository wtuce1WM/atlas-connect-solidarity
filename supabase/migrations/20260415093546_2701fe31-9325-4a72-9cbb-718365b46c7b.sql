-- Add computed_rating and total_review_count to destinations table
ALTER TABLE public.destinations 
ADD COLUMN IF NOT EXISTS computed_rating numeric,
ADD COLUMN IF NOT EXISTS total_review_count integer;

-- Create trigger function to compute rating on /20 scale for destinations
CREATE OR REPLACE FUNCTION public.update_destination_computed_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  total_count integer := 0;
  weighted_sum numeric := 0;
BEGIN
  -- Google
  IF NEW.google_rating IS NOT NULL AND NEW.google_review_count IS NOT NULL AND NEW.google_review_count > 0 THEN
    total_count := total_count + NEW.google_review_count;
    weighted_sum := weighted_sum + (NEW.google_rating / 5.0) * 20.0 * NEW.google_review_count;
  END IF;

  IF total_count > 0 THEN
    NEW.computed_rating := ROUND(weighted_sum / total_count, 2);
  ELSE
    NEW.computed_rating := NULL;
  END IF;
  NEW.total_review_count := total_count;

  RETURN NEW;
END;
$function$;

-- Create trigger for destinations
DROP TRIGGER IF EXISTS update_destination_rating ON public.destinations;
CREATE TRIGGER update_destination_rating
  BEFORE INSERT OR UPDATE ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_destination_computed_rating();