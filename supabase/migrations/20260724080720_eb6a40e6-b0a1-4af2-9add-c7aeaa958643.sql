UPDATE public.blog_posts
SET tldr_fr = replace(tldr_fr, '13 galeries et ateliers', '12 galeries et ateliers'),
    tldr_en = replace(tldr_en, '13 handpicked art galleries', '12 handpicked art galleries'),
    tldr_ar = replace(tldr_ar, '13 معرضًا', '12 معرضًا')
WHERE slug = 'galeries-art-essaouira';