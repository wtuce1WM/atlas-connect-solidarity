
-- Switch business_youtube_video_pois to reference POI businesses (businesses with is_poi=true)
-- instead of points_of_interest, to mirror the BusinessForm UX (grouping by neighborhood).
ALTER TABLE public.business_youtube_video_pois
  DROP CONSTRAINT IF EXISTS business_youtube_video_pois_point_of_interest_id_fkey;

ALTER TABLE public.business_youtube_video_pois
  ADD CONSTRAINT business_youtube_video_pois_point_of_interest_id_fkey
  FOREIGN KEY (point_of_interest_id)
  REFERENCES public.businesses(id)
  ON DELETE CASCADE;
