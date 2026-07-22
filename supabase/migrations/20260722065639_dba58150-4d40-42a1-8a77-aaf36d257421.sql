
WITH new_url AS (
  SELECT 'https://oneworldmorocco.com/__l5e/assets-v1/6b259e0f-1e21-49a0-99f7-72fb55fc8209/shopping-fashion-gueliz-hero.webp'::text AS u
),
fr_new AS (
  SELECT jsonb_agg(elem ORDER BY elem->>'title') AS arr FROM (
    SELECT elem FROM blog_posts, jsonb_array_elements(entries_fr) elem
      WHERE slug='shopping-fashion-gueliz'
        AND elem->>'id' <> 'effa57d8-b030-4219-a98e-aca34cf1df41'
    UNION ALL SELECT jsonb_build_object(
      'id','026a15c4-1cab-4456-baf3-6ea16ac4a2e6',
      'title','Atelier 44 Marrakech Gueliz — une adresse mode à Guéliz',
      'pretitle','Guéliz, Marrakech',
      'hours','du lundi au samedi : 10:00 – 20:00 · dimanche : fermé',
      'paragraphs', jsonb_build_array('À Guéliz, Atelier 44 Marrakech Gueliz se reconnaît à sa signature : « Un concept store d''exception où créateurs marocains, design et élégance contemporaine se rencontrent. ». Le quartier Guéliz est devenu l''épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu''on pousse sa porte. Horaires d''ouverture : du lundi au samedi : 10:00 – 20:00 · dimanche : fermé.')
    )
    UNION ALL SELECT jsonb_build_object(
      'id','f2cece13-04de-4b57-b701-e14b3cef8399',
      'title','Boutique 24 Marrakech — une adresse mode à Guéliz',
      'pretitle','Guéliz, Marrakech',
      'hours','du lundi au samedi : 10:00 – 19:00 · dimanche : fermé',
      'paragraphs', jsonb_build_array('À Guéliz, Boutique 24 Marrakech se reconnaît à sa signature : « Une adresse tendance à Guéliz où élégance, mode contemporaine et inspirations marocaines se rencontrent. ». Le quartier Guéliz est devenu l''épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu''on pousse sa porte. Horaires d''ouverture : du lundi au samedi : 10:00 – 19:00 · dimanche : fermé.')
    )
  ) x
),
en_new AS (
  SELECT jsonb_agg(elem ORDER BY elem->>'title') AS arr FROM (
    SELECT elem FROM blog_posts, jsonb_array_elements(entries_en) elem
      WHERE slug='shopping-fashion-gueliz'
        AND elem->>'id' <> 'effa57d8-b030-4219-a98e-aca34cf1df41'
    UNION ALL SELECT jsonb_build_object(
      'id','026a15c4-1cab-4456-baf3-6ea16ac4a2e6',
      'title','Atelier 44 Marrakech Gueliz — a fashion address in Guéliz',
      'pretitle','Guéliz, Marrakech',
      'hours','Monday to Saturday: 10:00 AM – 8:00 PM · Sunday: closed',
      'paragraphs', jsonb_build_array('In Guéliz, Atelier 44 Marrakech Gueliz is recognized by its signature: « An exceptional concept store where Moroccan designers, design and contemporary elegance meet. ». The Guéliz district has become the epicenter of fashion in Marrakech: Moroccan designers, edgy concept stores, international brands, and secret addresses meet a few streets apart. This boutique is one of them, and worth a visit. Opening hours: Monday to Saturday: 10:00 AM – 8:00 PM · Sunday: closed.')
    )
    UNION ALL SELECT jsonb_build_object(
      'id','f2cece13-04de-4b57-b701-e14b3cef8399',
      'title','Boutique 24 Marrakech — a fashion address in Guéliz',
      'pretitle','Guéliz, Marrakech',
      'hours','Monday to Saturday: 10:00 AM – 7:00 PM · Sunday: closed',
      'paragraphs', jsonb_build_array('In Guéliz, Boutique 24 Marrakech is recognized by its signature: « A trendy address in Guéliz where elegance, contemporary fashion and Moroccan inspirations meet. ». The Guéliz district has become the epicenter of fashion in Marrakech: Moroccan designers, edgy concept stores, international brands, and secret addresses meet a few streets apart. This boutique is one of them, and worth a visit. Opening hours: Monday to Saturday: 10:00 AM – 7:00 PM · Sunday: closed.')
    )
  ) x
),
ar_new AS (
  SELECT jsonb_agg(elem ORDER BY elem->>'title') AS arr FROM (
    SELECT elem FROM blog_posts, jsonb_array_elements(entries_ar) elem
      WHERE slug='shopping-fashion-gueliz'
        AND elem->>'id' <> 'effa57d8-b030-4219-a98e-aca34cf1df41'
    UNION ALL SELECT jsonb_build_object(
      'id','026a15c4-1cab-4456-baf3-6ea16ac4a2e6',
      'title','Atelier 44 Marrakech Gueliz — عنوان أزياء في جليز',
      'pretitle','جليز، مراكش',
      'hours','من الاثنين إلى السبت: 10:00 – 20:00 · الأحد: مغلق',
      'paragraphs', jsonb_build_array('في جليز، تُعرف Atelier 44 Marrakech Gueliz بتوقيعها: «متجر مفهومي استثنائي حيث يلتقي المصممون المغاربة والتصميم والأناقة المعاصرة». أصبح حي جليز مركز الموضة في مراكش: يلتقي المصممون المغاربة والمتاجر المتخصصة والعلامات التجارية العالمية والعناوين السرية على بعد بضعة شوارع من بعضها البعض. هذا المتجر جزء من ذلك، ويستحق الزيارة. ساعات العمل: من الاثنين إلى السبت: 10:00 – 20:00 · الأحد: مغلق.')
    )
    UNION ALL SELECT jsonb_build_object(
      'id','f2cece13-04de-4b57-b701-e14b3cef8399',
      'title','Boutique 24 Marrakech — عنوان أزياء في جليز',
      'pretitle','جليز، مراكش',
      'hours','من الاثنين إلى السبت: 10:00 – 19:00 · الأحد: مغلق',
      'paragraphs', jsonb_build_array('في جليز، تُعرف Boutique 24 Marrakech بتوقيعها: «عنوان عصري في جليز حيث تلتقي الأناقة والموضة المعاصرة والإلهام المغربي». أصبح حي جليز مركز الموضة في مراكش: يلتقي المصممون المغاربة والمتاجر المتخصصة والعلامات التجارية العالمية والعناوين السرية على بعد بضعة شوارع من بعضها البعض. هذا المتجر جزء من ذلك، ويستحق الزيارة. ساعات العمل: من الاثنين إلى السبت: 10:00 – 19:00 · الأحد: مغلق.')
    )
  ) x
)
UPDATE blog_posts SET
  entries_fr = (SELECT arr FROM fr_new),
  entries_en = (SELECT arr FROM en_new),
  entries_ar = (SELECT arr FROM ar_new),
  cover_image_url = (SELECT u FROM new_url),
  custom_hero_image_url = (SELECT u FROM new_url),
  updated_at = now()
WHERE slug='shopping-fashion-gueliz';
