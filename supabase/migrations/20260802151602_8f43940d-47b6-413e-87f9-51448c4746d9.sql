UPDATE public.blog_posts
SET intro_fr = replace(intro_fr, '''''', ''''),
    faq_fr = COALESCE(faq_fr, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'question', 'Quelles sont les villes couvertes ?',
      'answer', 'Le widget Marées ONE WORLD MOROCCO couvre 19 villes et spots du littoral marocain : Essaouira, Sidi Kaouki, Agadir, Taghazout, Tamraght, Imsouane, Mirleft, Sidi Ifni, Tan-Tan, Dakhla, Laâyoune, Safi, Oualidia, El Jadida, Casablanca, Mohammedia, Rabat, Kénitra et Tanger. Vous pouvez changer de ville directement dans le widget pour comparer les horaires de marées, la houle et la température de l''eau.'
    ))
WHERE slug = 'surf-essaouira-sidi-kaouki-marees-saisons';