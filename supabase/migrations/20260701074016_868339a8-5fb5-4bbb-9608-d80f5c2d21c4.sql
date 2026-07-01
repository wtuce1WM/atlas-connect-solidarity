
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS video_section_config JSONB;

UPDATE public.blog_posts
SET template = 'article_template',
    video_section_config = jsonb_build_object(
      'badge_id', '6a1b0b32-e325-4468-a0f6-e6da61e28c97',
      'city_ids', jsonb_build_array('41545fd3-2c2c-4609-8d55-842fd7e2edde','e615a53d-568d-4cc1-85ea-7286571de35b'),
      'price_type', 'location',
      'copy', jsonb_build_object(
        'fr', jsonb_build_object('title','Les offres du moment','intro','Une sélection de vidéos issues de notre base : villas mises en location par leurs propriétaires et agences spécialisées. Cliquez sur une vignette pour ouvrir la vidéo et faire défiler les offres verticalement.'),
        'en', jsonb_build_object('title','Current offers','intro','A video selection from our database: villas rented by their owners and specialist agencies. Tap a thumbnail to open the video and browse offers vertically.'),
        'ar', jsonb_build_object('title','العروض الحالية','intro','مجموعة مختارة من الفيديوهات من قاعدة بياناتنا: فيلات يؤجرها أصحابها ووكالات متخصصة. اضغط على الصورة المصغرة لفتح الفيديو وتصفح العروض عموديًا.')
      )
    )
WHERE slug = 'louer-villa-vacances-marrakech';
