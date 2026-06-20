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
  {
    id: "0021188e-e7e4-407d-90ae-3e1577f90d51",
    pretitle: "Vallée de l'Ourika, à 27 km de Marrakech",
    title: "ANIMA Garden — un jardin d'artiste pour rêver en famille",
    paragraphs: [
      "André Heller a planté ici trois hectares de merveilles : plus de 250 espèces botaniques, des sculptures de Keith Haring et Picasso disséminées entre les sentiers, des pavillons surprises, des étangs et la silhouette de l'Atlas en toile de fond. Les enfants y entrent comme dans un livre d'images — chaque détour révèle un personnage, un coin secret, une fontaine.",
      "C'est l'une des rares sorties nature aux portes de Marrakech qui parle vraiment à toute la famille : assez calme pour les parents, assez ludique pour les petits. On y consacre une demi-journée, on déjeune au café du jardin, on repart avec des photos plein le téléphone.",
    ],
  },
  {
    id: "7547f653-74b4-4900-ba76-7c0e92fab42f",
    pretitle: "Gueliz",
    title: "Artelier Workshop & Gallery — ateliers créatifs pour petits artistes",
    paragraphs: [
      "Au cœur du Gueliz, Artelier ouvre ses portes aux enfants comme aux adultes pour des ateliers de peinture, dessin, sculpture, arts plastiques et techniques mixtes. L'espace est lumineux, le matériel professionnel, l'encadrement bienveillant — exactement ce qu'il faut pour que les plus jeunes osent se lancer.",
      "On peut y inscrire son enfant à l'année, profiter d'un stage pendant les vacances ou réserver un atelier d'anniversaire clé en main. Une vraie alternative aux écrans, qui ramène les enfants à la joie simple de créer quelque chose avec ses mains.",
    ],
  },
  {
    id: "d6a099a7-8297-49e5-800b-8776cb8732eb",
    pretitle: "Centre commercial Al Mazar, Route de l'Ourika",
    title: "Atlas Elevation — l'escalade comme école de confiance en soi",
    paragraphs: [
      "Murs d'escalade indoor de toutes hauteurs, salle de fitness, cours collectifs et — surtout — un programme « Climbing Team » dédié aux enfants de 5 à 15 ans. Atlas Elevation a été fondé par une communauté de grimpeurs passionnés et ça se sent : l'esprit y est sérieux, encourageant, jamais intimidant.",
      "Pour les enfants, l'escalade combine ce qu'on cherche dans une bonne activité : dépense physique, concentration, dépassement de soi, et le plaisir d'atteindre le sommet. Le centre organise aussi des sorties d'escalade en plein air dans les montagnes de l'Atlas pour les plus aguerris.",
    ],
  },
  {
    id: "c1f804bd-2a90-4095-8f79-000ca6e86887",
    pretitle: "Lac de Lalla Takerkoust, route d'Amizmiz",
    title: "Base nautique Jet Atlas — sports nautiques avec vue sur l'Atlas",
    paragraphs: [
      "À quarante minutes de Marrakech, sur les rives du lac de Lalla Takerkoust, Jet Atlas propose tout ce qu'on attend d'une vraie base nautique : jet-ski, ski nautique, wakeboard, bouée tractée, flyboard, mais aussi quad et buggy pour ceux qui préfèrent la terre ferme.",
      "Pour les familles, la formule est imparable : une piscine à débordement avec vue sur l'Atlas, un restaurant ouvert toute la journée, et la possibilité de tester une activité d'eau encadrée pendant que les plus jeunes profitent du bord. Une vraie évasion d'une journée, à un jet de pierre de la ville.",
    ],
  },
  {
    id: "89db62af-e799-42a8-8000-d4166b57d407",
    pretitle: "Hivernage",
    title: "Bowling Marrakech — six pistes au cœur de la ville",
    hours: "Ouvert tous les jours, de 14h00 à 01h00.",
    paragraphs: [
      "Le bon vieux bowling, version Marrakech : six pistes en plein Hivernage, restauration sur place, ambiance conviviale. C'est l'activité indoor de secours par excellence — quand il pleut, quand il fait trop chaud, quand on cherche simplement à faire plaisir à toute la famille sans prise de tête.",
      "L'équipe organise aussi des anniversaires d'enfants et des soirées team-building. On y va pour une partie, on enchaîne sur une pizza, on repart avec ce sentiment rare d'avoir vraiment passé du temps ensemble, sans téléphone.",
    ],
  },
  {
    id: "531a7bf4-534d-4b0d-a32a-3a16ed8cbb73",
    pretitle: "Route de Meknès",
    title: "Centre équestre Cimes de l'Atlas — l'amour des chevaux avant tout",
    paragraphs: [
      "Cette adresse-là se distingue par une chose : l'engagement réel envers le bien-être animal. L'équipe, menée par la coach équin Safia, met cet amour au centre de tout — et les enfants le ressentent. Les chevaux sont calmes, bien nourris, bien soignés ; le contact est juste, jamais brutal.",
      "Cours, balades, baptêmes poneys, stages : la palette couvre tous les âges et tous les niveaux. C'est l'école d'équitation qu'on espère pour son enfant — celle qui transmet bien plus qu'une technique.",
    ],
  },
  {
    id: "54695f20-1f94-4d5d-ac99-a85c7a44f4c4",
    pretitle: "Palmeraie, à 12 km du centre",
    title: "Club Équestre Palmeraie — balades à cheval au cœur de la Palmeraie",
    paragraphs: [
      "Centre équestre familial niché au cœur de la Palmeraie, avec moniteurs professionnels, chevaux bien tenus et formules adaptées à tous les niveaux. Pour les enfants, le poney club est l'entrée parfaite — encadrement attentif, animaux patients, sécurité prise au sérieux.",
      "Pour les plus grands, ce sont les balades dans la palmeraie qui font le sel de l'adresse : lever du jour, plein après-midi ou coucher de soleil, le décor change à chaque heure et l'on découvre Marrakech sous un angle qu'aucune voiture ne donne.",
    ],
  },
  {
    id: "2fdb1f15-4a02-40b4-b344-0ffc0c2e1abd",
    pretitle: "À quelques minutes de Marrakech",
    title: "Domaine Bled Ouladi — ferme de loisirs et piscine en formule Day Pass",
    hours: "Ouvert sur réservation.",
    paragraphs: [
      "Bled Ouladi a inventé la formule parfaite pour une journée en famille : un Day Pass qui inclut piscine, buffet gourmand et accès à toute la ferme. Les enfants y croisent les animaux en quasi-liberté, courent dans les espaces verts, profitent des jeux en plein air pendant que les parents s'installent au bord de l'eau.",
      "L'esprit est simple, généreux, sans artifice — exactement ce qu'on cherche pour un dimanche au vert sans avoir à organiser quoi que ce soit. On arrive, on dépose ses affaires, la journée se déroule toute seule.",
    ],
  },
  {
    id: "6b3b72ea-58f1-4ddd-acf3-f652af9e26b8",
    pretitle: "Route de Casablanca",
    title: "Jardin de Cactus Thiemann — la plus grande plantation de cactus d'Afrique",
    paragraphs: [
      "Depuis 1964, la famille Thiemann a acclimaté ici plus de 150 variétés de cactus venues d'Amérique latine. Le jardin, posé au pied des Jbilet, est une curiosité botanique unique au Maroc — et un terrain de découverte fascinant pour les enfants, qui n'ont jamais vu des cactus d'une telle ampleur, certains plus hauts qu'eux.",
      "On y vient pour apprendre, photographier, s'émerveiller devant ces formes improbables. Une visite courte mais marquante, qui change radicalement des sorties habituelles.",
    ],
  },
  {
    id: "9cd7bbfd-6ba0-48ba-8975-2806f435dc8d",
    pretitle: "Route d'Amizmiz",
    title: "Jardin Ocre — un écrin verdoyant pour apprendre en s'amusant",
    paragraphs: [
      "Le Jardin Ocre cultive volontairement l'expérience ludique et pédagogique : ateliers pour enfants, parcours sensoriels, découverte des plantes aromatiques et de la flore locale, moments de partage à l'ombre des arbres. Une vraie respiration dans un cadre marocain authentique.",
      "L'esprit du lieu se prête particulièrement bien aux sorties scolaires, anniversaires nature ou simples après-midi en famille où l'on a envie d'allier détente et apprentissage.",
    ],
  },
  {
    id: "f5f38917-849d-4c2a-8e1d-bee6e9ef5b4c",
    pretitle: "La Mamounia, Médina",
    title: "Kid's Spa La Mamounia — des soins pensés pour les 6-16 ans",
    paragraphs: [
      "C'est probablement le rituel le plus exclusif de notre sélection : à La Mamounia, les enfants et adolescents de 6 à 16 ans ont droit à leur propre carte de soins. Ateliers de massage doux, soins du visage adaptés, manucure ludique — tout est calibré pour leur âge, dans le cadre mythique du spa de l'hôtel.",
      "Une expérience à offrir pour un anniversaire d'exception, un moment mère-fille ou père-fils, ou simplement pour initier les plus jeunes au plaisir du bien-être sans qu'ils s'ennuient.",
    ],
  },
  {
    id: "e499ba31-7ac5-4fe9-8685-480e89a5e97d",
    pretitle: "Km 6, Route de l'Ourika",
    title: "La Ferme El Dar — déjeuner et piscine au milieu des oliviers",
    paragraphs: [
      "Aux portes de Marrakech, La Ferme El Dar propose une formule très efficace pour une sortie en famille : menu trois plats à 350 dhs par personne, accès piscine inclus, le tout dans un jardin d'oliviers paisible. L'esprit ferme se ressent — animaux, potager, calme — et les enfants peuvent gambader pendant que les parents profitent du repas.",
      "C'est l'adresse à garder pour ces dimanches où l'on veut sortir de la ville sans aller loin, et où l'on a envie d'un cadre simple, sincère, vraiment reposant.",
    ],
  },
  {
    id: "4441008c-7e98-4a0f-b48d-0544772ab3e8",
    pretitle: "Route de Ouarzazate",
    title: "La Perle aux Oiseaux — un refuge zoologique pour découvrir la faune",
    paragraphs: [
      "Refuge zoologique tourné vers la conservation de la biodiversité, La Perle aux Oiseaux donne aux enfants l'occasion rare d'observer de près des espèces qu'ils ne croiseront pas ailleurs. L'approche est pédagogique : on explique, on contextualise, on sensibilise — pas de simple spectacle, mais une vraie démarche éducative.",
      "Une sortie qui ouvre les yeux et qui laisse des traces : on en sort avec des enfants un peu plus curieux du vivant, et c'est précieux.",
    ],
  },
  {
    id: "5d397457-1ed1-4824-8541-57131a09b8e3",
    pretitle: "Menara Mall",
    title: "La Petite Crèche de Kidzo — garderie pour les 1-4 ans pendant que vous shoppez",
    paragraphs: [
      "Pensée comme un complément idéal au Menara Mall, La Petite Crèche de Kidzo accueille les enfants de 1 à 4 ans dans un environnement sécurisé et amusant. Encadrement professionnel, jeux éducatifs, activités créatives, goûter — tout est prévu pour que les petits passent un vrai bon moment.",
      "Pour les parents, c'est la solution pratique imparable : on dépose, on profite enfin d'une heure ou deux à soi dans le centre commercial, on récupère un enfant qui a joué, mangé, peut-être même fait la sieste.",
    ],
  },
  {
    id: "55e5a0f4-f570-4aab-942e-932284c4f8c4",
    pretitle: "Centre commercial Al Mazar, Route de l'Ourika",
    title: "Laser Game Evolution — trois labyrinthes et un karaoké",
    paragraphs: [
      "Au cœur du centre Al Mazar, Laser Game Evolution propose trois labyrinthes pour des parties immersives, un karaoké pour prolonger la soirée et un café/glacier oriental pour reprendre des forces. La formule plaît particulièrement aux préados et ados qui veulent du fun sans la rudesse du paintball.",
      "L'adresse est rodée pour les anniversaires, sorties étudiantes et team-buildings — l'équipe d'animation sait emballer une après-midi en quelques minutes.",
    ],
  },
  {
    id: "e56a1782-3b86-4d73-a75a-fe5ae6ae12fd",
    pretitle: "Route d'Amizmiz",
    title: "Laser Games Marrakech — l'alternative douce au paintball",
    paragraphs: [
      "Laser Games Marrakech assume une promesse claire : tous les avantages du combat tactique en équipe, aucun des inconvénients du paintball. Pas de bleus, pas de douleur, des règles simples, accessible dès le plus jeune âge — c'est l'activité parfaite pour mélanger les générations sans laisser personne de côté.",
      "Parfait pour les anniversaires d'enfants, les sorties de groupes mixtes et les premières fois en matière de jeux d'équipe à sensations.",
    ],
  },
  {
    id: "b18e96bd-85bc-4e3d-828d-29953b40063f",
    pretitle: "Route d'Agafay",
    title: "Le Parc des Oliviers Ecolodge — un coin de paradis à deux pas de la ville",
    paragraphs: [
      "À deux pas de Marrakech, Le Parc des Oliviers offre une vraie échappée nature en mode écolodge — un domaine planté d'oliviers, calme, où l'on vient se ressourcer en famille. Piscine, espaces ombragés, restauration sur place : la formule est simple et fonctionne.",
      "Les enfants y trouvent l'espace pour courir, grimper, explorer. Les parents y trouvent enfin un peu de silence. Un équilibre rare et précieux.",
    ],
  },
  {
    id: "8a85b337-56ce-47a6-880b-6029176df283",
    pretitle: "Marrakech",
    title: "M'Art Studio — un studio créatif pour libérer l'imagination",
    paragraphs: [
      "M'Art Studio est un espace pensé pour les enfants qui ont envie de créer, peindre, modeler, expérimenter. Encadrement par des artistes, matériel professionnel, ambiance détendue — tout est réuni pour que la créativité s'exprime sans pression.",
      "Cours réguliers, stages de vacances ou ateliers anniversaires : on choisit la formule, et l'enfant repart avec ses œuvres et beaucoup de fierté.",
    ],
  },
  {
    id: "5b40b159-3411-4c30-a919-82855694166b",
    pretitle: "Marrakech",
    title: "Marrakech Kart Racing — du karting pour les pilotes en herbe",
    paragraphs: [
      "Piste de karting professionnelle, karts adaptés à différents âges, encadrement strict côté sécurité : Marrakech Kart Racing donne aux enfants et ados l'occasion rare de vivre la vitesse en vrai, casque sur la tête, doigts sur le volant.",
      "Une activité d'anniversaire qui marque, ou simplement une après-midi adrénaline à offrir à un enfant fan de course automobile.",
    ],
  },
  {
    id: "964dd87e-e6f7-4fb9-9ab6-effe94e7a6e4",
    pretitle: "Route d'Agadir",
    title: "Nature by Mokhtar — la ferme préservée à la périphérie de la ville",
    paragraphs: [
      "Espace vert magnifiquement préservé, Nature by Mokhtar rend hommage à la vocation agricole originelle de la périphérie de Marrakech. On y croise des animaux, on découvre des cultures, on respire — bref, on redécouvre ce qu'était la ville avant qu'elle ne se densifie.",
      "Une sortie pédagogique idéale pour les enfants, qui touchent du doigt une autre échelle de temps et de paysage.",
    ],
  },
  {
    id: "d299e29c-e675-498e-b8dc-5b843b241315",
    pretitle: "Route de l'Ourika",
    title: "Ourika Park Ferme Pédagogique — plusieurs activités et restaurant",
    paragraphs: [
      "Ourika Park combine ferme pédagogique, plusieurs activités encadrées et restaurant sur place. La formule typique : on arrive en fin de matinée, on enchaîne découverte des animaux et jeux, on déjeune sur place, on prolonge l'après-midi sans avoir à courir d'un endroit à l'autre.",
      "C'est l'archétype de la sortie familiale clé en main sur la route de l'Ourika — efficace, rassurante, particulièrement adaptée aux jeunes enfants.",
    ],
  },
  {
    id: "23dc2291-3dd1-40a4-ad3c-b2771689a3c6",
    pretitle: "Palmeraie",
    title: "Palmeride — la Palmeraie en trottinette électrique tout-terrain",
    paragraphs: [
      "Trottinettes électriques tout-terrain, sans permis, accessibles dès 1m20 : Palmeride a trouvé l'équilibre parfait pour faire découvrir la Palmeraie aux familles. Les guides sont locaux, passionnés, et choisissent des parcours qui combinent sentiers de palmeraie, points de vue et anecdotes du terrain.",
      "Une vraie aventure douce et écologique, parfaite pour les ados et les enfants en âge de tenir un guidon — l'un des meilleurs moyens de comprendre l'envers de la ville.",
    ],
  },
  {
    id: "9a5d9a6d-b711-45fd-a8f8-795031de236a",
    pretitle: "À 45 km de Marrakech",
    title: "Parapente Adrénaline — le baptême de l'air en biplace",
    paragraphs: [
      "À 45 kilomètres de la ville, Parapente Adrénaline propose des vols en biplace encadrés par des pilotes diplômés. C'est l'expérience à offrir aux ados qui rêvent d'aventure — décoller depuis une crête, planer au-dessus des paysages, atterrir avec ce regard qu'on ne voit qu'une fois dans une vie.",
      "Sécurité prise au sérieux, matériel homologué, ambiance accueillante : on confie son enfant en toute tranquillité.",
    ],
  },
  {
    id: "396ca85e-cf31-49ca-9fbe-fc5614b12c3e",
    pretitle: "Menara Mall",
    title: "Patinoire Kidzo — la magie de la glace en plein Marrakech",
    paragraphs: [
      "Une vraie patinoire, dans le climat de Marrakech : la Patinoire Kidzo du Menara Mall offre aux enfants un dépaysement total. On enfile les patins, on glisse, on tombe, on rit — exactement ce qu'on associe à une après-midi d'hiver, mais ici sous le soleil.",
      "Cours pour débutants, sessions libres et créneaux anniversaires : la formule fonctionne pour tous les âges et niveaux. À tester au moins une fois.",
    ],
  },
  {
    id: "010742f5-db3f-42a5-8041-392843bb40a5",
    pretitle: "Médina",
    title: "Pikala Bikes — la médina et la palmeraie à vélo, en famille",
    paragraphs: [
      "Pikala loue des vélos adaptés à tous les terrains et à toutes les tailles, et propose même la livraison à votre hôtel ou riad. Une manière originale, ludique et écologique de faire découvrir Marrakech aux enfants — souks, Palmeraie, ruelles cachées prennent un autre relief quand on les traverse à deux roues.",
      "Le projet a aussi une dimension sociale (formation et emploi des jeunes) qui en fait un choix particulièrement aligné si l'on cherche à donner du sens à sa sortie.",
    ],
  },
  {
    id: "c03e0482-f26e-4664-9165-67e2c731ca4c",
    pretitle: "Route d'Agadir",
    title: "Secret Family Farm — animaux en liberté et atelier de création",
    paragraphs: [
      "L'adresse est dans le nom : une ferme familiale tranquille, où les enfants courent au milieu d'animaux en liberté (chèvres, poules, lapins), participent à un atelier créatif et déjeunent ensuite d'une cuisine simple, fraîche, faite maison.",
      "Tout y est pensé pour l'authenticité — on est loin des parcs aseptisés, on retrouve le plaisir d'une vraie ferme et d'un vrai contact avec le vivant.",
    ],
  },
  {
    id: "da640b4a-fae8-4904-a265-0a9d21572f9d",
    pretitle: "Marrakech",
    title: "Sky Riders Marrakech — survoler Marrakech en parapente",
    paragraphs: [
      "Sky Riders propose des vols en parapente au-dessus de la région marrakchie, encadrés par une équipe certifiée. L'expérience est calibrée pour tous les niveaux, avec un matériel homologué et un système de réservation flexible 7j/7.",
      "Pour un ado, c'est l'aventure absolue : palmeraie, désert et Atlas vus du ciel, avec le souvenir gravé pour des années. Un cadeau d'anniversaire qui change vraiment.",
    ],
  },
  {
    id: "0471ae99-0ae8-4fba-ae5a-8f697209f36f",
    pretitle: "Marrakech",
    title: "The Wave Marrakech — surfer sur des vagues stationnaires",
    paragraphs: [
      "The Wave Marrakech propose une expérience encore rare au Maroc : surfer sur des vagues stationnaires, dans un environnement maîtrisé. Les sensations sont vraies, l'apprentissage est rapide, et l'on peut progresser sans dépendre de l'océan.",
      "Une activité originale et marquante pour les ados (et les parents !) qui ont envie d'essayer quelque chose qu'on ne trouve nulle part ailleurs en ville.",
    ],
  },
  {
    id: "b401faae-7c02-49b1-96de-cf2c8478de32",
    pretitle: "Palmeraie",
    title: "Trottinette électrique dans la Palmeraie — l'évasion d'une heure",
    paragraphs: [
      "Formule pensée pour les visiteurs : transfert depuis votre hôtel ou riad, thé à la menthe et photos inclus, à partir de 35 € par personne. Une heure de trottinette électrique tout-terrain dans la Palmeraie, ludique, facile et sécurisée — l'évasion idéale sans avoir à organiser quoi que ce soit.",
      "Le bon plan pour faire vivre une vraie aventure aux enfants (et aux ados) sans logistique compliquée.",
    ],
  },
  {
    id: "089836d9-8f1e-4442-bf2f-cc58790f74a6",
    pretitle: "Carré Eden, Gueliz",
    title: "X-trem 360 Marrakech — réalité virtuelle, simulateurs et écran géant interactif",
    paragraphs: [
      "Au cœur du Carré Eden, X-trem 360 a installé l'une des offres de divertissement les plus complètes de la ville : jeux d'aventures, laser-tag et escape-games en réalité virtuelle dès 6 ans (solo ou multijoueurs), simulateurs racing dynamiques à vérins, Multiball sport-gaming sur écran géant dès 4 ans.",
      "L'adresse parfaite pour les anniversaires d'ados, les après-midi pluvieuses ou les sorties multi-générations : il y a forcément une activité qui correspond à chaque âge.",
    ],
  },
];

const ActivitesEnfantsMarrakech = () => (
  <BlogArticleTemplate
    entries={ACTIVITES}
    articlePath="/blog/activites-enfants-marrakech"
    articleTitle="Activités pour les enfants à Marrakech"
    articleDescription="Quarante-et-une adresses incontournables pour occuper les enfants à Marrakech : parcs aquatiques, mini-villes, paintball, poney, kids clubs, fermes pédagogiques, ateliers créatifs et bien plus — pour des journées qu'ils n'oublieront pas."
    bookmarkSlug="activites-enfants-marrakech"
    heroAlt="Activités pour les enfants à Marrakech"
    heroTitleTop="Activités pour les enfants"
    heroTitleBottom="à Marrakech"
    heroSubtitle="Quarante-et-une adresses incontournables pour occuper les enfants à Marrakech : parcs aquatiques, mini-villes, paintball, poney, kids clubs, fermes pédagogiques, ateliers créatifs et bien plus — pour des journées qu'ils n'oublieront pas."
    intro="Marrakech a beau être une ville d'adultes — médinas, palais, terrasses tardives —, ses environs cachent un terrain de jeu démesuré pour les enfants. Parcs aquatiques pensés à l'échelle d'une vraie station, kids clubs encadrés, mini-villes où les enfants jouent les adultes, trampolines, paintball, poneys, fermes pédagogiques, ateliers créatifs, escalade, karting, parapente : il y a de quoi remplir un week-end, des vacances entières ou un anniversaire mémorable. Voici nos quarante-et-une adresses préférées, toutes à moins d'une heure de la médina, pour offrir aux enfants — et aux parents — une journée vraiment à leur mesure."
    datePublished="2026-06-14T08:00:00+01:00"
    dateModified="2026-06-14T08:00:00+01:00"
  />
);

export default ActivitesEnfantsMarrakech;
