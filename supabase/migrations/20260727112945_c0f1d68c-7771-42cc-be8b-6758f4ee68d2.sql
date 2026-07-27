UPDATE public.blog_posts 
SET content_fr = REPLACE(content_fr, '(Google + Tripadvisor)', '(Google + Tripadvisor + Restaurant Guru)') 
WHERE slug = 'top-10-street-food-a-deux-pas-riad-dar-najat-marrakech';