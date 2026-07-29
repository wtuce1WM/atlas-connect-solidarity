
UPDATE public.blog_posts
SET entries_fr = entries_fr || jsonb_build_array(
  jsonb_build_object(
    'id', 'e24f1ac3-a529-44f5-bbf1-1b1aa80ed0bd',
    'pretitle', 'Marrakech — Palmeraie',
    'title', 'Jnane Rumi — le riad-jardin poétique de la Palmeraie',
    'paragraphs', jsonb_build_array(
      'Niché au cœur d''un jardin d''un hectare planté d''oliviers centenaires, de citronniers et de rosiers, Jnane Rumi est un riad-boutique confidentiel dédié à l''esprit du poète soufi Rumi : quelques suites seulement, dessinées comme des chambres d''hôte de très grande maison, avec cheminées, patios privés et terrasses au silence rare.',
      'La table du domaine réunit chaque soir les voyageurs autour d''une cuisine marocaine contemporaine, servie sous les arcades ou près de la piscine chauffée. Le spa propose des rituels berbères longue durée, et l''équipe organise sur mesure balades à cheval, séances de yoga et excursions dans l''Atlas.',
      'Un refuge feutré pour celles et ceux qui veulent le luxe d''un palace sans en avoir la taille — l''intimité prime sur tout.'
    )
  ),
  jsonb_build_object(
    'id', '8bb40757-0437-4060-8ea3-28b4e17e714c',
    'pretitle', 'Marrakech — Route d''Amizmiz',
    'title', 'Fairmont Royal Palm Marrakech — le resort golf & spa face à l''Atlas',
    'paragraphs', jsonb_build_array(
      'À vingt minutes de la médina, le Fairmont Royal Palm s''étend sur 231 hectares de nature entre oliveraies et vergers, avec l''Atlas enneigé en toile de fond. Suites et villas privées avec piscine, terrasses profondes, décoration Art Déco marocaine : le resort joue une élégance racée, loin du tumulte de la ville.',
      'Son parcours de golf 18 trous signé Cabell B. Robinson est classé parmi les plus beaux du Maroc, complété par une académie de tennis et padel, un spa Willow Stream de 3 500 m², cinq restaurants et une piscine centrale spectaculaire.',
      'L''adresse idéale pour un séjour luxe combinant golf, bien-être et gastronomie — avec la médina à portée de shuttle privé.'
    )
  )
)
WHERE slug = 'reserver-sejour-luxe-marrakech';
