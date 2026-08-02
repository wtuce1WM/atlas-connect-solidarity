ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS editorial_sections_fr jsonb,
  ADD COLUMN IF NOT EXISTS editorial_sections_en jsonb,
  ADD COLUMN IF NOT EXISTS editorial_sections_ar jsonb,
  ADD COLUMN IF NOT EXISTS custom_hero_image_mobile_url text,
  ADD COLUMN IF NOT EXISTS poi_map_mode text;

INSERT INTO public.blog_posts (
  slug, template, anchor_kind, is_published, published_at, author_name,
  title_fr, excerpt_fr, hero_alt, bookmark_slug,
  hero_title_top_fr, hero_title_bottom_fr, hero_subtitle_fr,
  intro_fr, tldr_fr, custom_hero_image_url, custom_hero_image_mobile_url,
  poi_map_mode, entries_fr, editorial_sections_fr, faq_fr, sort_order
) VALUES (
  'surf-essaouira-sidi-kaouki-marees-saisons',
  'article_template',
  'generic',
  true,
  now(),
  'ONE WORLD MOROCCO',
  $t$Surf à Essaouira et Sidi Kaouki : comment les horaires de marées et les saisons influencent les meilleures vagues$t$,
  $t$Marées, houle, vent et saisons : le guide pratique pour choisir le bon créneau de surf à Essaouira et Sidi Kaouki, avec le Widget Marées gratuit de One World Morocco.$t$,
  $t$Surfeur marchant sur le sable mouillé à marée basse devant des vagues propres, côte atlantique d''Essaouira et Sidi Kaouki$t$,
  'surf-essaouira-sidi-kaouki-marees-saisons',
  $t$Surf à Essaouira et Sidi Kaouki$t$,
  $t$marées, saisons et meilleures vagues$t$,
  $t$Une même houle ne donne jamais la même vague selon l''heure de la marée. Voici comment lire l''océan avant d''entrer à l''eau.$t$,
  $t$Le Maroc est aujourd''hui l''une des destinations de surf les plus réputées d''Afrique. Parmi les spots incontournables, Essaouira et Sidi Kaouki attirent toute l''année des milliers de surfeurs venus profiter des vagues de l''Atlantique. Pourtant, beaucoup de débutants consultent uniquement la météo ou la hauteur de houle avant de partir à l''eau. Une donnée est pourtant tout aussi importante : les horaires de marées. Une même houle peut produire des vagues totalement différentes selon qu''elle arrive à marée basse, montante ou pleine mer.$t$,
  $t$À Essaouira et Sidi Kaouki, la marée montante et la mi-marée offrent le plus souvent les vagues les plus régulières. L''automne, l''hiver et le printemps concentrent les meilleures houles atlantiques ; en été, il faut surfer tôt le matin avant les alizés. Le Widget Marées gratuit de One World Morocco donne les pleines et basses mers, le niveau de la mer en direct, le marnage, la température de l''eau, la houle et la période des vagues sur 19 villes du littoral marocain.$t$,
  '/__l5e/assets-v1/f31cbf01-03b9-4931-891f-fa90e1914d25/hero-surf-essaouira-desktop.webp',
  '/__l5e/assets-v1/c1155d2c-bc47-4ed6-aef0-2f5a075df13b/hero-surf-essaouira-mobile.webp',
  'all_poi',
  $j$[
    {
      "id": "04b4a5e2-e80c-4ba8-92cd-bee77f821d04",
      "pretitle": "Essaouira, plage",
      "title": "NaneaKite — lire la marée avant d'entrer à l'eau",
      "hook": "école de kitesurf, de surf et de wingfoil située à Essaouira",
      "paragraphs": [
        "Sur la baie d'Essaouira, NaneaKite fait partie de ces écoles qui ne regardent jamais seulement la hauteur de houle. Kitesurf, surf, wingfoil : chaque discipline a sa fenêtre idéale dans la journée, et cette fenêtre se lit d'abord dans la marée. C'est ce réflexe — vérifier l'heure de la basse et de la pleine mer avant de préparer le matériel — qui distingue une session correcte d'une session mémorable.",
        "La baie d'Essaouira a un avantage rare : elle fonctionne à des niveaux d'eau très différents. À mi-marée montante, les mousses de l'intérieur de la baie deviennent régulières et pardonnent beaucoup, ce qui en fait le créneau naturel des cours de surf débutants. Quand le vent thermique se lève dans l'après-midi, le plan d'eau change de vocation et devient le terrain de jeu du kite et du wingfoil. Une même journée, deux sports, deux créneaux : la marée et le vent décident.",
        "Pour aller chercher des vagues plus formées, la route de Sidi Kaouki, à une trentaine de kilomètres au sud, s'ouvre directement sur l'Atlantique. Là, la marée devient franchement décisive : trop bas, certains passages se durcissent ; à marée intermédiaire ou montante, les séries s'allongent. Consulter les horaires avant de charger les planches évite de faire la route pour rien.",
        "Le bon conseil d'une école locale ne remplace pas la donnée, il s'appuie dessus : niveau de la mer, sens de la marée, marnage, période des vagues. C'est exactement ce que rassemble le Widget Marées ci-dessous."
      ]
    }
  ]$j$::jsonb,
  $j$[
    { "kind": "widget", "widget": "tides_live", "widgetCity": "Essaouira" },
    {
      "kind": "text",
      "pretitle": "Le mécanisme",
      "title": "Pourquoi les horaires de marées sont essentiels pour surfer à Essaouira ?",
      "paragraphs": [
        "Le mouvement de la marée modifie en permanence la profondeur d'eau. Cette variation change la façon dont les vagues cassent sur les bancs de sable ou les fonds rocheux.",
        "C'est pourquoi les écoles de surf, les moniteurs et les surfeurs locaux consultent systématiquement les horaires de marées avant de choisir leur heure de mise à l'eau. Regrouper l'information au même endroit évite de multiplier les applications et les sites spécialisés."
      ],
      "bullets": [
        "Selon le niveau de la mer, une vague devient plus creuse et plus rapide…",
        "… ou plus longue et plus régulière,",
        "parfois nettement plus puissante,",
        "ou au contraire molle et peu surfable."
      ]
    },
    {
      "kind": "text",
      "pretitle": "Essaouira",
      "title": "Quelles marées privilégier dans la baie ?",
      "paragraphs": [
        "Marée montante : souvent le meilleur compromis. Lorsque le niveau d'eau remonte progressivement, les vagues deviennent plus régulières, les mousses plus faciles pour les débutants, certains bancs de sable fonctionnent mieux — et les écoles de surf y placent une grande partie de leurs cours. La qualité exacte dépend de la houle du jour, mais la mi-marée reste très souvent une valeur sûre.",
        "À marée basse, certaines vagues deviennent plus rapides, plusieurs zones rocheuses apparaissent davantage et les sections peuvent devenir plus techniques. Les surfeurs expérimentés apprécient parfois ces conditions lorsque la houle est bien orientée.",
        "À pleine mer, certains spots deviennent plus doux, d'autres perdent une partie de leur puissance et les vagues peuvent mieux convenir aux longues planches. La combinaison entre marée, houle et vent reste toujours plus importante que la marée seule."
      ]
    },
    {
      "kind": "text",
      "pretitle": "Sidi Kaouki",
      "title": "Pourquoi la marée y est encore plus importante",
      "paragraphs": [
        "Situé à environ 30 kilomètres au sud d'Essaouira, Sidi Kaouki est l'un des spots de surf les plus célèbres du Maroc. Ouvert directement sur l'océan Atlantique, il reçoit davantage de houle que la baie d'Essaouira.",
        "Lorsque la marée est trop basse, certains passages deviennent plus techniques. À l'inverse, une marée montante ou intermédiaire améliore souvent la qualité des vagues et offre des sessions plus longues. Consulter les marées avant de prendre la route permet d'optimiser sa journée."
      ],
      "bullets": [
        "le coefficient de marée,",
        "la période des vagues,",
        "la direction de la houle,",
        "le vent."
      ]
    },
    { "kind": "entries" },
    { "kind": "widget", "widget": "tides_plan", "widgetCity": "Essaouira" },
    {
      "kind": "text",
      "pretitle": "Calendrier",
      "title": "Quelle est la meilleure saison pour surfer à Essaouira ?",
      "paragraphs": [
        "Automne (septembre à novembre) : le retour des grandes houles atlantiques. Les températures restent agréables, l'eau est encore relativement chaude et les vents sont souvent plus faibles qu'en plein été. C'est l'une des saisons préférées des surfeurs réguliers.",
        "Hiver (décembre à février) : la haute saison du surf au Maroc. Les houles sont plus fréquentes et plus puissantes, et les surfeurs confirmés trouvent régulièrement de très belles conditions à Essaouira comme à Sidi Kaouki. Les débutants privilégient alors les journées où la houle est plus modérée.",
        "Printemps (mars à mai) : un excellent équilibre — météo agréable, fréquentation plus faible, vagues régulières et de nombreuses journées adaptées aux débutants. Beaucoup d'écoles considèrent cette période comme idéale pour apprendre.",
        "Été (juin à août) : Essaouira est mondialement connue pour ses vents thermiques, qui font le bonheur des amateurs de kitesurf et de windsurf. Pour le surf, les meilleures conditions s'observent généralement tôt le matin, avant que le vent ne se renforce."
      ]
    },
    {
      "kind": "text",
      "pretitle": "Méthode",
      "title": "Comment choisir le meilleur moment pour surfer ?",
      "paragraphs": [
        "Les meilleures sessions résultent presque toujours d'une combinaison de plusieurs paramètres, jamais d'un seul."
      ],
      "bullets": [
        "Les horaires de marées : ils déterminent le niveau d'eau et influencent directement la qualité des vagues.",
        "La hauteur de houle : une houle modeste peut offrir d'excellentes vagues avec une bonne marée.",
        "La période des vagues : une longue période produit des vagues plus puissantes et mieux organisées.",
        "Le vent : offshore, il améliore la qualité des vagues ; onshore, il la dégrade.",
        "La saison : chaque saison apporte des houles et des vents différents."
      ]
    },
    {
      "kind": "text",
      "pretitle": "Le widget",
      "title": "Ce que le Widget Marées affiche vraiment",
      "paragraphs": [
        "Contrairement à un simple tableau des marées, il couvre 19 villes du littoral atlantique et méditerranéen marocain, sans nécessiter de clé API. Session de surf à Essaouira, journée à Sidi Kaouki, sortie paddle, partie de pêche ou balade jusqu'aux îles Purpuraires : il devient rapidement un outil indispensable."
      ],
      "bullets": [
        "les heures des pleines mers et des basses mers,",
        "le niveau de la mer en temps réel et le sens de la marée,",
        "le coefficient estimé et le marnage,",
        "la courbe des marées sur 24 heures,",
        "la température de l'eau,",
        "la hauteur de houle et la période des vagues."
      ]
    },
    {
      "kind": "text",
      "pretitle": "Débutants",
      "title": "Cinq réflexes pour une première session réussie",
      "bullets": [
        "choisir une houle modérée,",
        "privilégier une marée montante ou intermédiaire,",
        "éviter les journées très ventées,",
        "prendre un cours avec une école locale,",
        "consulter les horaires de marées avant de partir."
      ],
      "paragraphs": [
        "Une bonne préparation permet souvent de transformer une première expérience en véritable coup de cœur pour le surf."
      ]
    },
    { "kind": "widget", "widget": "tides_install", "widgetCity": "Essaouira" },
    {
      "kind": "text",
      "pretitle": "Avant de partir",
      "title": "Préparez votre prochaine session de surf",
      "paragraphs": [
        "Que vous soyez débutant, intermédiaire ou surfeur confirmé, la qualité d'une session dépend rarement d'un seul facteur. En combinant les horaires de marées, la houle, le vent et la saison, vous augmentez considérablement vos chances de profiter des meilleures vagues d'Essaouira et de Sidi Kaouki.",
        "Avant de charger votre planche dans la voiture, prenez quelques instants pour consulter le Widget Marées gratuit de One World Morocco : vous disposerez d'une vision claire de l'évolution de la mer tout au long de la journée."
      ]
    }
  ]$j$::jsonb,
  $j$[
    { "q": "Quelle est la meilleure marée pour surfer à Essaouira ?", "a": "Dans de nombreuses conditions, la marée montante ou la mi-marée offrent des vagues plus régulières. Cependant, le meilleur créneau dépend également de la houle, du vent, du spot choisi et de votre niveau." },
    { "q": "À quelle heure surfer à Sidi Kaouki ?", "a": "Il est conseillé de consulter les horaires de marées avant chaque session. Les meilleures vagues se produisent souvent pendant une fenêtre de quelques heures autour de la marée montante, mais les conditions varient chaque jour." },
    { "q": "Quelle est la meilleure saison pour surfer au Maroc ?", "a": "L'automne, l'hiver et le printemps sont généralement les saisons les plus favorables au surf sur la côte atlantique marocaine. L'été reste très intéressant, notamment tôt le matin avant le renforcement des vents." },
    { "q": "Pourquoi consulter les horaires de marées avant de surfer ?", "a": "Les marées modifient la profondeur d'eau, la forme des vagues, leur puissance et parfois même la sécurité de certains spots. Les consulter permet de choisir le meilleur moment pour entrer à l'eau." },
    { "q": "Le Widget Marées est-il gratuit ?", "a": "Oui. Le Widget Marées de One World Morocco est entièrement gratuit. Il permet de consulter les marées heure par heure, les prochaines pleines et basses mers, le niveau de la mer en direct, la température de l'eau, la hauteur de houle, la période des vagues et les principales informations utiles aux surfeurs sur 19 villes du littoral marocain." }
  ]$j$::jsonb,
  0
)
ON CONFLICT (slug) DO NOTHING;