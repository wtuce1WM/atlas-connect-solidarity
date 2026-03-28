
-- Add computed columns
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS computed_rating numeric,
  ADD COLUMN IF NOT EXISTS total_review_count integer DEFAULT 0;

-- Create trigger function to auto-recalculate
CREATE OR REPLACE FUNCTION public.update_computed_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  total_count integer := 0;
  weighted_sum numeric := 0;
BEGIN
  -- Google
  IF NEW.google_rating IS NOT NULL AND NEW.google_review_count IS NOT NULL AND NEW.google_review_count > 0 THEN
    total_count := total_count + NEW.google_review_count;
    weighted_sum := weighted_sum + (NEW.google_rating / 5.0) * 20.0 * NEW.google_review_count;
  END IF;
  -- TripAdvisor
  IF NEW.tripadvisor_rating IS NOT NULL AND NEW.tripadvisor_review_count IS NOT NULL AND NEW.tripadvisor_review_count > 0 THEN
    total_count := total_count + NEW.tripadvisor_review_count;
    weighted_sum := weighted_sum + (NEW.tripadvisor_rating / 5.0) * 20.0 * NEW.tripadvisor_review_count;
  END IF;
  -- Restaurant Guru
  IF NEW.restaurant_guru_rating IS NOT NULL AND NEW.restaurant_guru_review_count IS NOT NULL AND NEW.restaurant_guru_review_count > 0 THEN
    total_count := total_count + NEW.restaurant_guru_review_count;
    weighted_sum := weighted_sum + (NEW.restaurant_guru_rating / 5.0) * 20.0 * NEW.restaurant_guru_review_count;
  END IF;
  -- GetYourGuide
  IF NEW.getyourguide_rating IS NOT NULL AND NEW.getyourguide_review_count IS NOT NULL AND NEW.getyourguide_review_count > 0 THEN
    total_count := total_count + NEW.getyourguide_review_count;
    weighted_sum := weighted_sum + (NEW.getyourguide_rating / 5.0) * 20.0 * NEW.getyourguide_review_count;
  END IF;
  -- Viator
  IF NEW.viator_rating IS NOT NULL AND NEW.viator_review_count IS NOT NULL AND NEW.viator_review_count > 0 THEN
    total_count := total_count + NEW.viator_review_count;
    weighted_sum := weighted_sum + (NEW.viator_rating / 5.0) * 20.0 * NEW.viator_review_count;
  END IF;
  -- Avis Vérifiés
  IF NEW.avis_verifies_rating IS NOT NULL AND NEW.avis_verifies_review_count IS NOT NULL AND NEW.avis_verifies_review_count > 0 THEN
    total_count := total_count + NEW.avis_verifies_review_count;
    weighted_sum := weighted_sum + (NEW.avis_verifies_rating / 5.0) * 20.0 * NEW.avis_verifies_review_count;
  END IF;
  -- Trustpilot
  IF NEW.trustpilot_rating IS NOT NULL AND NEW.trustpilot_review_count IS NOT NULL AND NEW.trustpilot_review_count > 0 THEN
    total_count := total_count + NEW.trustpilot_review_count;
    weighted_sum := weighted_sum + (NEW.trustpilot_rating / 5.0) * 20.0 * NEW.trustpilot_review_count;
  END IF;
  -- TourRadar
  IF NEW.tourradar_rating IS NOT NULL AND NEW.tourradar_review_count IS NOT NULL AND NEW.tourradar_review_count > 0 THEN
    total_count := total_count + NEW.tourradar_review_count;
    weighted_sum := weighted_sum + (NEW.tourradar_rating / 5.0) * 20.0 * NEW.tourradar_review_count;
  END IF;

  IF total_count > 0 THEN
    NEW.computed_rating := ROUND(weighted_sum / total_count, 2);
  ELSE
    NEW.computed_rating := NULL;
  END IF;
  NEW.total_review_count := total_count;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_update_computed_rating ON public.businesses;
CREATE TRIGGER trg_update_computed_rating
  BEFORE INSERT OR UPDATE OF google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count, avis_verifies_rating, avis_verifies_review_count, trustpilot_rating, trustpilot_review_count, tourradar_rating, tourradar_review_count
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_computed_rating();
