
-- Las.Kitchen: assigner #Recettes + villes Marrakech & Essaouira à toutes ses vidéos YouTube,
-- et pousser le sort_order pour qu'elles arrivent en fin de liste sur le front.

WITH videos AS (
  SELECT id FROM public.business_youtube_videos
  WHERE business_id = '53869a46-d452-492b-b923-9031324e7189'
)
INSERT INTO public.business_youtube_video_badges (youtube_video_id, badge_id)
SELECT v.id, '3454814c-df50-414e-b5e1-70fc3976cb30'
FROM videos v
ON CONFLICT (youtube_video_id, badge_id) DO NOTHING;

WITH videos AS (
  SELECT id FROM public.business_youtube_videos
  WHERE business_id = '53869a46-d452-492b-b923-9031324e7189'
),
city_list(city_id) AS (
  VALUES ('41545fd3-2c2c-4609-8d55-842fd7e2edde'::uuid),
         ('3f96c12a-0635-4f70-8de0-2578a66bcc07'::uuid)
)
INSERT INTO public.business_youtube_video_cities (youtube_video_id, city_id)
SELECT v.id, c.city_id
FROM videos v CROSS JOIN city_list c
ON CONFLICT (youtube_video_id, city_id) DO NOTHING;

-- Push to end of list: high sort_order, preserving relative order
UPDATE public.business_youtube_videos
SET sort_order = 9000 + sort_order
WHERE business_id = '53869a46-d452-492b-b923-9031324e7189';
