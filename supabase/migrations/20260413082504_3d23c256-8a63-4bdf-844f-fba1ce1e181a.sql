ALTER TABLE public.generic_video_pois DROP CONSTRAINT generic_video_pois_poi_id_fkey;

ALTER TABLE public.generic_video_pois ADD CONSTRAINT generic_video_pois_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.businesses(id) ON DELETE CASCADE;