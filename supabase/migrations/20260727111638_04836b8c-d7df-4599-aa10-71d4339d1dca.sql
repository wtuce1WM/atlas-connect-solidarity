UPDATE blog_posts
SET
  cover_image_url = 'https://oneworldmorocco.com/__l5e/assets-v1/e0e22763-70b8-4bbf-bba4-124259f16ff5/20-adresses-authentiques-hero.webp',
  custom_hero_image_url = 'https://oneworldmorocco.com/__l5e/assets-v1/e0e22763-70b8-4bbf-bba4-124259f16ff5/20-adresses-authentiques-hero.webp',
  entries_fr = jsonb_set(entries_fr, '{0,rank}', 'null'::jsonb)
WHERE slug = '10-adresses-authentiques-proche-riad-dar-najat-marrakech';