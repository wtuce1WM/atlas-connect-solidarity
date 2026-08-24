-- Badge "Guide" (226a6dcd-f53b-4408-ac97-16d083cb4f98) sur toutes les vidéos Tarik Belasri (business 08f848fc-83ee-48c5-9636-fb80e68f0218)

-- 1) Vidéos internes (business_documents type=video)
INSERT INTO public.business_document_badges (document_id, badge_id)
SELECT d.id, '226a6dcd-f53b-4408-ac97-16d083cb4f98'
FROM public.business_documents d
WHERE d.business_id = '08f848fc-83ee-48c5-9636-fb80e68f0218'
  AND d.type = 'video'
  AND NOT EXISTS (
    SELECT 1 FROM public.business_document_badges b
    WHERE b.document_id = d.id AND b.badge_id = '226a6dcd-f53b-4408-ac97-16d083cb4f98'
  );

-- 2) Vidéos YouTube (business_youtube_videos) — backfill ; la règle existante couvre déjà les futures
INSERT INTO public.business_youtube_video_badges (youtube_video_id, badge_id)
SELECT y.id, '226a6dcd-f53b-4408-ac97-16d083cb4f98'
FROM public.business_youtube_videos y
WHERE y.business_id = '08f848fc-83ee-48c5-9636-fb80e68f0218'
  AND NOT EXISTS (
    SELECT 1 FROM public.business_youtube_video_badges yb
    WHERE yb.youtube_video_id = y.id AND yb.badge_id = '226a6dcd-f53b-4408-ac97-16d083cb4f98'
  );

-- 3) Vidéos génériques (compte social TarikBelasri)
INSERT INTO public.generic_video_badges (generic_video_id, badge_id)
SELECT g.id, '226a6dcd-f53b-4408-ac97-16d083cb4f98'
FROM public.generic_videos g
WHERE (
  coalesce(g.youtube_account, '') ILIKE '%belasri%'
  OR coalesce(g.instagram_account, '') ILIKE '%belasri%'
  OR coalesce(g.tiktok_account, '') ILIKE '%belasri%'
)
AND NOT EXISTS (
  SELECT 1 FROM public.generic_video_badges gb
  WHERE gb.generic_video_id = g.id AND gb.badge_id = '226a6dcd-f53b-4408-ac97-16d083cb4f98'
);