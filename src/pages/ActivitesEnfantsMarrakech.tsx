import BlogArticleTemplate, { type BlogArticleEntry } from "@/components/blog/BlogArticleTemplate";

// Texte immersif rédigé à partir des descriptions, hooks, services et horaires de chaque fiche.
const ACTIVITES: BlogArticleEntry[] = [
  {
    id: "728e90f7-3894-43a5-8c0d-9dd193fe9946",
    pretitle: "Route d'Amizmiz, à quelques minutes de Marrakech",
    title: "Oasiria — le premier parc aquatique d'Afrique du Nord",
    hours: "Ouvert tous les jours, de 10h00 à 18h00.",
    paragraphs: [
      "On quitte la ville par la route d'Amizmiz, on roule quelques minutes seulement, et l'on découvre, planté au milieu de dix hectares de jardins luxuriants, le doyen des parcs aquatiques marocains. Oasiria a été le premier d'Afrique du Nord et il porte cet héritage avec une élégance un peu rétro : grandes pelouses entretenues, palmiers qui filtrent la lumière, allées larges où l'on circule sans se bousculer.",
      "Le cœur du parc, c'est l'eau. Piscine à vagues qui rythme la journée — toutes les vingt minutes, une houle se lève et c'est l'éclat de rire général —, rivière artificielle où l'on se laisse dériver une bouée sous le bras, toboggans pour tous les âges, des plus doux pour les petits aux pentes plus sportives pour les ados. Un Kids Club encadré occupe les plus jeunes pendant que les parents s'installent à l'ombre.",
      "Autour, le parc déploie une vraie petite station : terrains de padel et de beach-volley, restaurants ombragés, espaces événementiels, club bien-être avec jacuzzi et salle de fitness, et même un hébergement pour ceux qui veulent prolonger l'expérience. On y vient pour la journée, on en repart le soir un peu hâlé, les enfants épuisés mais ravis — c'est l'archétype de la sortie en famille à Marrakech.",
    ],
  },
  {
    id: "31c9d196-3422-4289-8d1a-fb5d2fb8860f",
    pretitle: "Km 5, Route de Tahanaout",
    title: "Aqua Mirage — sensations fortes et château de princesses",
    hours: "Ouvert tous les jours, de 10h00 à 18h00.",
    paragraphs: [
      "Cinq kilomètres au sud, et l'on arrive devant ce qui est sans doute le parc aquatique le plus ambitieux des environs de Marrakech. Aqua Mirage joue la carte des sensations fortes : tours géantes, longs tubes pour des descentes vertigineuses, toboggans en pente douce pour les plus prudents — tout cela sous l'œil bienveillant de maîtres-nageurs diplômés qui veillent à chaque coin du parc.",
      "Mais ce qui fait le charme du lieu, c'est qu'il assume autant l'adrénaline que la douceur. Les ados et les grands enfants enchaînent les attractions à sensations ; les plus petits, eux, ont leur propre royaume : un bassin réservé dominé par un grand château de princes et princesses, où ils peuvent patauger des heures sans qu'on s'inquiète.",
      "Tout autour, la logistique d'une vraie journée parc : piscine à vagues, transats, parasols, snack-bar pour reprendre des forces. On y vient le matin, on s'installe pour la journée, et on en sort à la fermeture avec ce sentiment d'avoir vraiment fait quelque chose de différent. Un véritable paradis pour tous les âges.",
    ],
  },
  {
    id: "9440df82-705e-436f-b18e-24783d553773",
    pretitle: "Route de l'Ourika, à quelques minutes du centre",
    title: "Aqua Fun Resort — quinze piscines, mini-golf et beach-volley",
    hours: "Ouvert tous les jours, de 10h00 à 18h00.",
    paragraphs: [
      "L'adresse a ce gabarit rare : pas un parc, pas un club, mais un véritable resort de jour planté sur la route de l'Ourika. À peine entré, on comprend l'échelle du lieu — quinze piscines étalées dans les jardins, dont une chauffée pour les journées d'hiver, des allées qui serpentent entre les transats et un horizon d'activités qui occupe la journée entière.",
      "Le programme se construit tout seul. On commence par le parc aquatique et ses toboggans à sensations, on enchaîne avec une descente plus tranquille de la rivière artificielle, on s'arrête pour un verre au bord de la piscine principale. Les plus jeunes filent au Kids Club où une équipe les prend en charge — pendant ce temps, les parents ont enfin une vraie demi-journée à eux.",
      "Quand l'envie de bouger revient, terrains de beach-volley, de basket et mini-golf attendent au cœur des jardins. La restauration suit le même esprit : généreuse, simple, ouverte toute la journée. C'est une adresse parfaite pour ceux qui veulent tout trouver au même endroit, sans avoir à courir d'une activité à l'autre.",
    ],
  },
  {
    id: "5b52c719-c5ef-403a-abe6-699dcc214311",
    pretitle: "Aqua Fun Marrakech — Route de l'Ourika",
    title: "Aqua Fun Kids Club — un Mickey Mouse Club pour les 3-12 ans",
    hours: "Ouvert tous les jours pendant les horaires du resort — encadrement professionnel inclus.",
    paragraphs: [
      "C'est l'une de ces idées dont on se demande pourquoi elle n'existe pas partout : un véritable Kids Club, dans l'esprit Mickey Mouse, intégré au resort Aqua Fun. Pensé pour les enfants de 3 à 12 ans, il accueille jusqu'à cinquante petits en intérieur et cinquante en extérieur — assez pour faire vivre une ambiance de colonie, jamais assez pour que ça déborde.",
      "Le programme est rythmé : maquillage, ateliers d'arts plastiques et de travaux manuels, séances de contes, jeux collectifs, animations à thème. Les enfants se mélangent, se font des amis, oublient les parents — exactement ce qu'on espère d'une vraie journée de vacances. L'équipe encadrante est formée et présente du matin jusqu'à la fermeture.",
      "Pour les parents, le bénéfice est immédiat : on dépose les enfants l'esprit tranquille et l'on profite enfin du resort pour soi — une piscine, un transat, un livre, un déjeuner sans avoir à se lever toutes les cinq minutes. À 18 heures, on récupère des petits épuisés et fiers de leurs créations. Une formule qui a fait ses preuves.",
    ],
  },
  {
    id: "1abaf3f5-cf34-4576-9b38-041f3e4529cf",
    pretitle: "Km 4, Route d'Amizmiz",
    title: "Eden Aquapark — dix-neuf toboggans et un univers de pirates",
    hours: "Ouvert tous les jours, de 10h00 à 18h00.",
    paragraphs: [
      "À quatre kilomètres seulement de Marrakech, Eden Aquapark joue dans la cour des grands : dix-neuf toboggans et attractions aquatiques, c'est l'un des parcs les plus fournis de la région. On y vient pour les sensations, mais l'on découvre vite que l'endroit a été pensé pour accueillir tout le monde, des bambins aux ados.",
      "Les stars du parc parlent d'elles-mêmes. Le MultiSlide aligne plusieurs pistes en parallèle pour des descentes synchronisées pleines d'adrénaline — c'est la grande attraction des fratries. Pirates House, en face, est l'univers réservé aux plus jeunes : un terrain de jeu aquatique avec jets, seaux, jeux interactifs et ambiance de bateau, dans lequel on perd les enfants pour des heures.",
      "Tout autour, l'organisation d'un vrai parc familial : espaces de détente ombragés, zones d'activités sportives pour tous les âges, restauration à proximité. Le rapport qualité-prix est l'un des arguments du lieu, et il en fait l'une des sorties préférées des Marrakchis comme des visiteurs en quête d'une vraie journée d'été.",
    ],
  },
  {
    id: "aafd2727-be71-45df-a4df-fe7efd883844",
    pretitle: "Route de l'Ourika",
    title: "Izofun — restaurant, piscine et terrain de jeu en plein air",
    hours: "Ouvert tous les jours — service en continu et activités sur réservation.",
    paragraphs: [
      "Izofun a ce positionnement à part : pas tout à fait un parc, pas tout à fait un restaurant, mais une vraie destination familiale où l'on peut s'installer pour la journée sans avoir à arbitrer. La maison joue d'abord la carte de la table — une cuisine où la tradition rencontre l'innovation, dressée avec soin, dans une salle aux intérieurs artisanaux et sur une grande terrasse ouverte sur le jardin.",
      "Mais on ne vient pas qu'y déjeuner. Autour du restaurant s'étend tout un programme : piscine pour s'installer la journée, espaces pensés pour les enfants, animations qui rythment l'après-midi. Les familles arrivent en fin de matinée, prennent un brunch, basculent à la piscine, déjeunent vraiment, repartent en fin d'après-midi avec des enfants ravis et des parents reposés.",
      "C'est l'adresse à garder pour ces dimanches indécis où l'on ne sait pas si l'on veut bien manger ou se reposer au bord de l'eau — Izofun a tranché la question depuis longtemps : on fait les deux, dans le même lieu.",
    ],
  },
  {
    id: "582202c7-239e-4e4c-a2dc-226d34c3e802",
    pretitle: "Km 22, Route de l'Ourika",
    title: "Smile Park — trampolines, paintball, quads et buggies",
    hours: "Ouvert tous les jours — activités selon programmation, réservation conseillée.",
    paragraphs: [
      "Vingt-deux kilomètres sur la route de l'Ourika, et l'on arrive devant ce qui ressemble plus à un village d'aventures qu'à un simple parc. Smile Park aligne dans un même domaine ce qu'on chercherait normalement dans cinq adresses différentes : parc d'attractions, parc de trampolines, terrain de paintball, restaurant, café, pâtisserie-boulangerie maison, quads et buggies. La promesse est claire — il y a forcément quelque chose pour chacun.",
      "Les enfants se précipitent au parc de trampolines, où l'on les voit rebondir des heures sans s'épuiser. Les ados, eux, partent côté paintball et buggies — du sérieux, encadré, qui leur donne le sentiment de vivre une vraie aventure. Les plus petits restent côté manèges et attractions, plus doux. Et au centre, la zone de restauration assure la logistique : on tient la journée entière sans avoir à repartir en ville.",
      "C'est l'adresse à choisir pour un anniversaire d'enfant, une sortie de groupe ou simplement un week-end où l'on cherche à dépenser de l'énergie. Le parc tient parole : on en sort tous fatigués, ce qui est précisément l'objectif.",
    ],
  },
  {
    id: "b7f4bfa1-f44b-461a-8d59-6b2f2c5b4c82",
    pretitle: "À quelques minutes de Marrakech",
    title: "Gravity Park — paintball, laser game et gaming sous un même toit",
    hours: "Ouvert tous les jours — créneaux et tournois sur réservation.",
    paragraphs: [
      "Gravity Park a fait un choix clair : être l'adresse incontournable des ados et des jeunes adultes en quête de sensations. Sous un même toit, le parc rassemble paintball, laser games, salles de jeu et espace gaming — quatre activités complémentaires qui transforment une après-midi en véritable événement.",
      "Le paintball y est sérieux : terrains structurés, équipement complet fourni, briefing en début de partie, arbitrage en cours. Le laser game, plus accessible aux plus jeunes, joue la carte de l'ambiance — labyrinthes, musique, jeux de lumière. L'espace gaming, lui, accueille les amateurs d'esport avec installations dédiées et possibilité d'organiser de vrais tournois.",
      "C'est l'adresse parfaite pour fêter un anniversaire d'ado, organiser une sortie d'équipe ou faire venir une bande d'amis pour une fin d'après-midi adrénaline. On vient pour une activité, on enchaîne sur deux autres, on prolonge à la salle de jeu — la formule fonctionne à chaque fois.",
    ],
  },
  {
    id: "b57e1bfa-3aeb-4e05-afc2-bd26b49a7218",
    pretitle: "Quartier Agdal, Marrakech",
    title: "KidzVille — la mini-ville où les enfants jouent les adultes",
    hours: "Ouvert tous les jours — accessible dès l'âge de la marche.",
    paragraphs: [
      "KidzVille est une de ces idées qu'on aurait aimé avoir enfant. Une mini-ville entièrement dimensionnée à la taille des plus jeunes, dans laquelle ils peuvent — dès qu'ils savent marcher — venir jouer les adultes pour de vrai. L'espace est divisé en quartiers thématiques : supermarché avec caddies et caisses qui scannent, hôpital pour soigner les bobos, salon de coiffure, restaurant, poste de police, et plein d'autres rôles à incarner.",
      "Tout y est pensé pour développer l'imagination et la motricité. Les enfants reproduisent ce qu'ils observent autour d'eux — un parent qui fait les courses, un médecin qui ausculte, un cuisinier qui prépare un plat — et s'inventent des scénarios qui durent des heures. C'est éducatif sans avoir l'air de l'être : ils apprennent les métiers, le vocabulaire, les codes sociaux, simplement en jouant.",
      "Pour les parents, c'est aussi un soulagement : un espace fermé, sécurisé, dimensionné pour la sécurité, où l'on peut s'installer sur le côté et regarder son enfant évoluer en autonomie. Une adresse idéale pour un anniversaire ou une après-midi de pluie où il faut absolument trouver une solution d'intérieur.",
    ],
  },
  {
    id: "307e9d33-5327-4ae7-8ab6-d02aac0ea709",
    pretitle: "2ème et 3ème étage, Menara Mall",
    title: "Kidzo — la plus grande aire de jeux indoor de Marrakech",
    hours: "Ouvert tous les jours, de 10h00 à 23h00.",
    paragraphs: [
      "Au cœur du Menara Mall, deux étages entiers ont été transformés en un véritable temple du jeu : Kidzo, la plus grande aire de jeux indoor de Marrakech. L'espace accueille les enfants dès deux ans dans un cadre stimulant et entièrement sécurisé — exactement ce qu'on cherche quand le temps dehors ne se prête pas à la sortie nature.",
      "Le lieu se découpe en zones d'âge. Les 2-4 ans ont leur propre garderie, encadrée, où les plus petits évoluent en toute sécurité avec des jeux adaptés à leur taille. Les plus grands, eux, disposent de deux étages d'attractions, structures à grimper, parcours moteurs, espaces ludiques et jeux d'arcade qui couvrent tous les âges jusqu'à l'adolescence.",
      "Le grand avantage de Kidzo, c'est sa localisation : situé dans le plus grand centre commercial de Marrakech, il permet d'enchaîner courses, déjeuner et après-midi d'amusement sans avoir à bouger la voiture. Une formule logistique imparable, qui fait de l'adresse l'un des plans préférés des familles marrakchies, surtout en plein été ou en pleine pluie.",
    ],
  },
  {
    id: "035ccc3a-e218-4071-bab6-4a9f7228a22b",
    pretitle: "Route de Ouarzazate",
    title: "Volcano Experience — le paintball comme une vraie aventure d'équipe",
    hours: "Ouvert tous les jours, de 9h00 à 21h00 — parties sur réservation.",
    paragraphs: [
      "Sur la route de Ouarzazate, Volcano Experience a transformé le paintball en véritable expérience de groupe. Le décor a son rôle : terrains structurés, abris en bois, zones de couverture pensées pour la tactique, briefing sérieux avant chaque partie. Ici, le paintball n'est pas un défouloir — c'est un sport d'équipe qui mêle stratégie, esprit de groupe et adrénaline.",
      "Plusieurs formats coexistent : parties courtes pour découvrir, sessions longues pour les plus aguerris, formats événementiels pour les anniversaires, enterrements de vie de jeune fille ou de garçon, séminaires d'entreprise. L'équipement est fourni, l'arbitrage assuré, la sécurité prise au sérieux — autant de détails qui font la différence quand on emmène une bande d'ados ou un groupe d'adultes peu rompus à l'exercice.",
      "On ressort de chaque partie avec l'impression d'avoir vraiment vécu quelque chose ensemble — discussions tactiques, fous rires, défis relevés. Volcano Experience est l'adresse à garder pour faire d'un après-midi un vrai moment d'aventure partagée.",
    ],
  },
  {
    id: "66041053-4e93-466d-a1b9-2d97716bb420",
    pretitle: "Cimes de l'Atlas, à proximité de Marrakech",
    title: "Poney Club Cimes de l'Atlas — la première fois en selle, dans un cadre rassurant",
    hours: "Ouvert toute l'année — cours, balades et stages sur réservation.",
    paragraphs: [
      "C'est l'une de ces adresses qu'on se passe entre parents : un vrai poney club, structuré, sérieux, où les enfants peuvent vivre leur première fois en selle dans un cadre rassurant. Les Cimes de l'Atlas ont ce calme particulier des lieux de campagne — paddocks ombragés, manège dédié, montagnes en arrière-plan — et l'on sent dès l'arrivée que les animaux sont bien tenus.",
      "Le club propose des formules adaptées à chaque âge. Baptêmes poneys pour les tout-petits, cours collectifs pour les débutants, perfectionnement pour ceux qui veulent progresser, stages pendant les vacances scolaires, balades en extérieur pour les plus avancés. L'équipe pédagogique est patiente, formée, et sait dédramatiser la première rencontre avec l'animal — souvent le moment décisif pour transformer un essai en passion durable.",
      "C'est l'adresse idéale pour offrir aux enfants une activité régulière qui les sort des écrans et les met en lien avec le vivant. On en repart en fin de séance avec des enfants fiers, un peu sales, et déjà impatients de revenir la semaine suivante.",
    ],
  },
];

const ActivitesEnfantsMarrakech = () => (
  <BlogArticleTemplate
    entries={ACTIVITES}
    articlePath="/blog/activites-enfants-marrakech"
    articleTitle="Activités pour les enfants à Marrakech"
    articleDescription="Douze adresses incontournables pour occuper les enfants à Marrakech : parcs aquatiques, mini-villes, paintball, poney, kids clubs et trampolines — pour des journées qu'ils n'oublieront pas."
    bookmarkSlug="activites-enfants-marrakech"
    heroAlt="Activités pour les enfants à Marrakech"
    heroTitleTop="Activités pour les enfants"
    heroTitleBottom="à Marrakech"
    heroSubtitle="Douze adresses incontournables pour occuper les enfants à Marrakech : parcs aquatiques, mini-villes, paintball, poney, kids clubs et trampolines — pour des journées qu'ils n'oublieront pas."
    intro="Marrakech a beau être une ville d'adultes — médinas, palais, terrasses tardives —, ses environs cachent un terrain de jeu démesuré pour les enfants. Parcs aquatiques pensés à l'échelle d'une vraie station, kids clubs encadrés où l'on dépose les petits l'esprit tranquille, mini-villes où les enfants jouent les adultes, trampolines, paintball, poney : il y a de quoi remplir un week-end, des vacances entières ou un anniversaire mémorable. Voici nos douze adresses préférées, toutes à moins d'une heure de la médina, pour offrir aux enfants — et aux parents — une journée vraiment à leur mesure."
    datePublished="2026-06-14T08:00:00+01:00"
    dateModified="2026-06-14T08:00:00+01:00"
  />
);

export default ActivitesEnfantsMarrakech;
