import BlogArticleTemplate, { type BlogArticleEntry } from "@/components/blog/BlogArticleTemplate";

// Texte immersif rédigé à partir des descriptions, avis clients et horaires de chaque fiche.
const FERMES: BlogArticleEntry[] = [
  {
    id: "2fdb1f15-4a02-40b4-b344-0ffc0c2e1abd",
    pretitle: "À quelques minutes de Marrakech",
    title: "Domaine Bled Ouladi — la ferme de loisirs pensée pour les familles",
    hours: "Ouvert tous les jours, de 11h00 à 18h00 — sur réservation.",
    paragraphs: [
      "On quitte la ville ocre, on roule quelques minutes, et l'on bascule d'un coup dans un autre monde : celui d'un domaine arboré où l'eau de la piscine scintille déjà entre les feuillages, où le chant des oiseaux remplace le klaxon des scooters, et où l'on sent que la journée à venir va se vivre lentement. Bled Ouladi a été pensé comme une parenthèse familiale, un lieu où parents et enfants peuvent enfin déposer les valises mentales de la semaine.",
      "La matinée commence par la baignade. La piscine est grande, vraiment grande, et l'équipe a eu l'intelligence de réserver les transats aux adultes et aux ados — un petit luxe qui change tout : les enfants pataugent et rient sans qu'on ait à monter la garde, et l'on peut s'allonger en paix sous le soleil. Une couche de piscine est demandée pour les bébés, c'est la seule règle, et elle suffit à préserver l'ambiance.",
      "À 13h30, place au buffet à volonté. Le déjeuner est servi à l'ombre, dans un cadre verdoyant, et il a ce charme un peu désuet des repas de famille élargie : on prend le temps, on se ressert, on regarde les enfants qui repartent jouer entre deux plats. Les boissons ne sont pas comprises, on les commande à part, mais l'essentiel est là — on mange bien et l'on mange ensemble.",
      "Dès 15h30, l'après-midi prend une tournure pédagogique. Encadrés par l'équipe, les enfants partent à la rencontre des animaux de la ferme : nourrissage, démonstration de la traite d'une vache, tour en charrette qui fait rire les plus grands autant que les plus petits. Puis viennent les ateliers manuels, inclus dans la formule : peinture sur poterie traditionnelle, fabrication de bracelets — autant de petits objets faits main qu'on ramène à la maison comme des trophées.",
      "On repart en fin d'après-midi un peu hâlé, les enfants épuisés mais radieux, avec ce sentiment rare d'avoir vraiment passé une journée ensemble. C'est exactement ce que Bled Ouladi promet, et c'est exactement ce qu'on y trouve.",
    ],
  },
  {
    id: "e499ba31-7ac5-4fe9-8685-480e89a5e97d",
    pretitle: "Km 6, Route de l'Ourika",
    title: "La Ferme El Dar — l'hospitalité marocaine au milieu des oliviers",
    hours: "Hôtel & restaurant ouverts toute la journée — réservation conseillée pour le déjeuner et les activités équestres.",
    paragraphs: [
      "Six kilomètres après les remparts, on quitte le bitume pour un chemin paisible bordé d'oliveraies. Au bout, une cour verdoyante, une lumière douce filtrée par les feuillages et la façade rustique de La Ferme El Dar. La transition est presque irréelle : on était à Marrakech il y a vingt minutes, on se retrouve dans une maison de campagne marocaine où le temps s'étire autrement.",
      "L'adresse est d'abord un hôtel & spa, mais elle vit aussi comme une vraie ferme : centre équestre, parc animalier, balades à cheval dans les oliveraies, piscine extérieure, hammam et soins traditionnels. On peut y dormir, mais on peut aussi venir pour la journée, déjeuner sous la pergola, faire le tour des enclos avec les enfants, monter en selle pour une balade encadrée — la formule s'adapte à l'envie du moment.",
      "À table, la cuisine marocaine est servie avec une générosité de maison familiale : tagines mijotés, légumes du potager, pain encore tiède, et une carte de vins étonnamment fournie pour un lieu qui se présente d'abord comme une ferme. On déjeune au jardin, en terrasse, face aux montagnes — le décor seul vaut le détour.",
      "Ce qu'on retient de La Ferme El Dar, au-delà des activités, c'est l'hospitalité. L'équipe a cette manière marocaine d'accueillir qui rend tout simple : on est attendu, on est reçu, on n'a plus rien à organiser. C'est l'adresse parfaite pour une journée à deux familles, ou pour offrir aux enfants un premier contact avec le cheval dans un cadre rassurant.",
    ],
  },
  {
    id: "6619e70c-aeed-4f60-b362-26157b4fe6a3",
    pretitle: "Vallée de l'Ourika, à 840 m d'altitude",
    title: "Jardin Bio-Aromatique d'Ourika — le premier jardin biologique du Maroc",
    hours: "Ouvert tous les jours, de 9h00 à 19h00 — visites libres ou guidées.",
    paragraphs: [
      "À une trentaine de kilomètres au sud de Marrakech, la route grimpe doucement vers la vallée de l'Ourika, là où le Haut Atlas commence à se dessiner. À 840 mètres d'altitude, au milieu d'un paysage berbère encore préservé, s'étend sur un hectare le premier Jardin Bio-Aromatique du Maroc — créé en 1998 par deux frères passionnés, le Dr Jalil Belkamel et le Dr AbdelFattah Belkamel, spécialistes des huiles essentielles.",
      "L'endroit n'a rien d'un jardin ornemental. C'est une collection vivante : une cinquantaine de plantes aromatiques, médicinales et ornementales, certaines endémiques, qu'on est invité à observer, à toucher, à sentir et même à goûter. Romarin, sauge, lavande, verveine, mais aussi des espèces rares qu'on ne croise nulle part ailleurs — chaque plante raconte une histoire de tradition, de phytothérapie ou de cuisine.",
      "On peut s'y promener librement, ou suivre une visite guidée — la seconde option transforme la balade en véritable cours d'aromathérapie. On y apprend les usages traditionnels et modernes de chaque plante, leurs vertus en cosmétique, en cuisine, en bien-être, et les différentes étapes de la distillation. Une distillerie est d'ailleurs installée sur place et fonctionne plusieurs fois par an pour extraire les huiles les plus précieuses.",
      "Le jardin est aussi le berceau de Nectarome, la marque de cosmétique naturelle qui en est née. Une boutique attenante permet de prolonger la visite par les sens : huiles essentielles, hydrolats, savons, huiles végétales d'argan ou de figue de barbarie. Premier employeur de la vallée avec plus de 70 salariés issus de la région, le jardin a aussi une vraie portée sociale.",
      "Pour les enfants, c'est une initiation parfaite à la botanique : on sent, on touche, on apprend en marchant. Pour les adultes, c'est un havre de paix, un endroit où ralentir et renouer avec ses cinq sens. À ne pas manquer en complément d'une journée dans la vallée de l'Ourika.",
    ],
  },
  {
    id: "4006627d-07f4-4e52-9118-134f253b9ff4",
    pretitle: "Route de Ouarzazate, au sud-est de Marrakech",
    title: "Sanctuary Slimane — vingt ans de permaculture sur dix hectares régénérés",
    hours: "Visites, programmes de volontariat et résidences d'artistes sur réservation.",
    paragraphs: [
      "Il y a un peu plus de vingt ans, ces dix hectares au sud-est de Marrakech n'étaient que terre sèche, sol fatigué, paysage minéral. Aujourd'hui, on y entre comme on entrerait dans une cathédrale végétale : un grand eucalyptus marque l'entrée, un poivrier veille sur le pavillon central, et plus de cinq mille arbres composent un écosystème qu'on imagine difficilement avoir été désertique. Sanctuary Slimane, c'est l'œuvre patiente d'Aziz Nahas, qui depuis 2000 mène ici un travail de régénération des sols devenu une référence au Maroc.",
      "On vient ici pour comprendre, plus que pour visiter. Jardins potagers en lasagne, irrigation goutte-à-goutte, panneaux solaires, oliveraie de 2 500 arbres qui donne une huile extra-vierge pressée à froid : chaque détail du domaine raconte une décision pensée pour économiser l'eau, nourrir la terre et faire revenir la biodiversité. Les enfants apprennent ici autrement — en observant comment un sol vivant se construit, en touchant la paille des compostières, en suivant une coccinelle plutôt qu'un écran.",
      "Le lieu accueille aussi des volontaires venus du monde entier, des résidences d'artistes, des projets communautaires. On y croise des graphistes, des cuisiniers, des permaculteurs, qui tous repartent avec la même impression : celle d'avoir vu, sur un seul terrain, la preuve qu'il est possible de réparer ce qu'on avait perdu.",
      "Pour une famille, c'est une parenthèse rare : moins ferme de loisirs que ferme-école, Sanctuary Slimane offre une journée vraiment dépaysante, où les enfants comprennent — sans qu'on le leur dise — que la nature n'est pas un décor, mais un système qu'on cultive.",
    ],
  },
  {
    id: "9cd7bbfd-6ba0-48ba-8975-2806f435dc8d",
    pretitle: "Route d'Amizmiz, à 25 minutes de Marrakech",
    title: "Jardin Ocre — cinq hectares d'immersion entre nature, animaux et ateliers",
    hours: "Ouvert du mardi au dimanche, de 9h00 à 18h00 — fermé le lundi.",
    paragraphs: [
      "On quitte la palmeraie, on file plein sud sur la route d'Amizmiz, et au bout de vingt-cinq minutes seulement le paysage se transforme : champs d'oliviers, lignes de l'Atlas en arrière-plan, lumière qui se met à dorer. C'est là, sur cinq hectares d'un vert presque irréel pour la région, que s'étire le Jardin Ocre — un parc nature et pédagogie pensé comme un écrin d'authenticité marocaine.",
      "À l'intérieur, tout est conçu pour que les enfants courent, observent, fabriquent. Une grande volière abrite des oiseaux qu'on apprend à reconnaître ; un parc animalier permet d'approcher chèvres, ânes, lapins et poules ; un mur d'escalade, une fontaine et de larges allées ombragées tracent un parcours où l'on passe d'une découverte à l'autre sans s'en rendre compte. Les ateliers ludiques, encadrés par l'équipe, prennent le relais : peinture, plantations, petits gestes du jardin qui donnent aux enfants ce sentiment précieux d'avoir fait quelque chose de leurs mains.",
      "L'adresse a aussi son restaurant, ouvert sur le jardin, où l'on déjeune en terrasse pendant que les plus jeunes repartent jouer. Cuisine simple, marocaine, produits du potager — exactement ce qu'on espère trouver dans une journée à la campagne.",
      "C'est l'une des sorties les plus complètes autour de Marrakech : assez grande pour qu'on y reste la journée entière, assez douce pour qu'on en reparte reposé, assez pédagogique pour que les enfants en gardent un vrai souvenir.",
    ],
  },
  {
    id: "40ce92ad-408f-4c88-9fc1-2dc2e4a39aa2",
    extraIds: ["6641945e-871c-4c2d-a9dc-a79490037a75"],
    pretitle: "Route de Ouarzazate, à 35 km de Marrakech",
    title: "Domaine Sauvage — la table d'hôtes d'une ferme de permaculture médaillée",
    hours: "Déjeuners table d'hôtes (6 à 12 personnes), cours de cuisine et balades — uniquement sur réservation.",
    paragraphs: [
      "À 35 kilomètres de Marrakech, la route de Ouarzazate s'élève doucement vers les premiers contreforts du Haut Atlas. C'est là, au creux des montagnes, qu'une famille venue de Paris a planté un projet qui ressemble à une déclaration d'amour à la terre : le Domaine Sauvage, dix hectares de permaculture, une oliveraie travaillée sans labour, sans machine, sans aucun produit phytosanitaire, et qui produit une huile d'olive primeur si remarquable qu'elle a décroché la médaille d'or du prestigieux concours international BIOL 2022.",
      "La maison, construite en terre avec les matériaux du site, ressemble à un refuge de montagne. C'est là, dans une grande cuisine extérieure ouverte sur l'immensité du paysage, que se vit le cœur de l'expérience : la table d'hôtes. Par petits groupes de six à douze convives venus de tous les continents, on commence la journée par une visite du potager, on cueille soi-même les légumes du déjeuner, on apprend les gestes de la cuisine marocaine, puis l'on s'installe — face aux montagnes — devant un repas où chaque plat raconte quelque chose de la terre qu'on vient de fouler.",
      "Les enfants ne sont pas oubliés. Balades dans les dunes, découverte du potager, contact avec les animaux : ils touchent, sentent, goûtent, et comprennent par les sens d'où viennent les ingrédients qu'on retrouve dans l'assiette. C'est une pédagogie sans cours, plus efficace que n'importe quel discours.",
      "Le domaine prolonge même son travail jusqu'au cœur de Marrakech avec l'« Organic Market Marrakech », où ses productions sont vendues deux fois par semaine. Mais c'est ici, sur place, qu'il faut venir : pour cette journée hors du temps, à mille lieues de la médina, où l'on repart avec la sensation rare d'avoir compris ce que veut dire « manger ce que la terre donne ».",
    ],
  },
  {
    id: "4441008c-7e98-4a0f-b48d-0544772ab3e8",
    pretitle: "Route de Ouarzazate, à 15 minutes du centre",
    title: "La Perle aux Oiseaux — le premier refuge de faune sauvage de Marrakech",
    hours: "Ouvert du mardi au dimanche, de 10h30 à 18h00 — fermé le lundi. Uniquement sur réservation.",
    paragraphs: [
      "À quinze minutes seulement du centre de Marrakech, on bifurque vers un domaine de trois hectares où le mot « zoo » ne veut plus dire la même chose. La Perle aux Oiseaux n'est pas un parc d'attractions ; c'est un refuge — le premier refuge de faune sauvage de la région — où plus d'une centaine d'espèces, toutes arrivées avec leur histoire, trouvent un cadre paisible pour se rétablir, vivre, et parfois simplement vieillir en paix.",
      "On y entre uniquement sur réservation, et c'est tant mieux. Le rythme y est lent, respectueux, en accord avec celui des animaux convalescents. Les enfants découvrent une faune qu'ils n'auraient jamais croisée autrement : oiseaux exotiques, reptiles, mammifères de toutes tailles, présentés non comme des curiosités mais comme des êtres avec un passé. L'équipe, passionnée, prend le temps d'expliquer : d'où vient cet animal, pourquoi il est là, ce qu'on fait pour lui.",
      "L'esprit du lieu se résume en deux mots : protection et éducation. Protéger une biodiversité fragile, éduquer le public à la comprendre — c'est la mission revendiquée du refuge, et elle se ressent à chaque étape de la visite. Aucun show, aucune mise en scène : juste une vraie rencontre, dans un cadre naturel et ressourçant.",
      "Pour boire un café, grignoter ou rapporter un petit souvenir, un snack-bar est installé sur place — sobre, à l'image du lieu. C'est l'adresse parfaite pour une matinée ou un après-midi en famille, à la fois douce, instructive et porteuse de sens.",
    ],
  },
  {
    id: "b18e96bd-85bc-4e3d-828d-29953b40063f",
    pretitle: "Route de l'Ourika, au cœur d'une oliveraie centenaire",
    title: "Le Parc des Oliviers Ecolodge — une journée à la campagne entre piscine, ânes et oliviers",
    hours: "Ouvert tous les jours pour le déjeuner et la journée détente — réservation conseillée.",
    paragraphs: [
      "On quitte Marrakech par la route de l'Ourika, et après quelques minutes seulement, le paysage change de costume : la palmeraie laisse place à une oliveraie centenaire, et c'est là, au creux d'un jardin de plusieurs hectares, que se cache Le Parc des Oliviers Ecolodge. L'endroit a été pensé comme une campagne marocaine idéalisée : allées de gravier, vieilles pierres, hamacs tendus entre deux troncs, et le silence — vrai luxe — partout autour.",
      "On vient ici pour la journée comme on irait chez des amis qui auraient une grande maison à la campagne. Le programme s'organise tout seul : une matinée à la piscine, ombragée par les oliviers ; un déjeuner sous la pergola, où la cuisine marocaine se sert sans chichi avec les légumes du potager ; puis une après-midi à se promener entre les enclos, à caresser les ânes, à observer les poules, à laisser les enfants courir dans un terrain assez vaste pour qu'on ne les surveille plus que d'un œil.",
      "L'esprit éco-lodge se sent dans chaque détail : matériaux locaux, peu de plastique, gestion sobre de l'eau, potager en permaculture. Rien n'est ostentatoire, tout est cohérent — c'est précisément ce qu'on cherche quand on veut offrir aux enfants une journée en lien avec la terre sans tomber dans la mise en scène.",
      "On en repart en fin d'après-midi avec ce sentiment qu'on n'a finalement rien fait d'extraordinaire — et c'est exactement le compliment. Une vraie journée de campagne, à vingt minutes de la médina.",
    ],
  },
  {
    id: "1dc47b3c-028d-482a-b14e-b09dc9c48e4a",
    pretitle: "À 20 minutes de Marrakech, entre oliveraies et Atlas",
    title: "The Farasha Farmhouse — l'art de vivre à la ferme version maison de famille",
    hours: "Déjeuners, journées détente et séjours — sur réservation.",
    paragraphs: [
      "Farasha signifie « papillon » en arabe, et le nom dit déjà beaucoup de l'esprit du lieu : léger, coloré, posé entre ciel et terre. À une vingtaine de minutes de Marrakech, dans la campagne ouverte sur l'Atlas, The Farasha Farmhouse est cette maison de famille à laquelle on rêve sans oser se l'avouer — patios tapissés de bougainvilliers, longues tables sous les arbres, intérieurs aux teintes douces, et partout cette impression que rien n'a été décoré, que tout a poussé là.",
      "Le domaine vit comme une vraie petite ferme. Potager, animaux, vergers, ruches : on s'y promène avec les enfants pour voir d'où viennent les choses, cueillir une herbe pour la cuisine, donner à manger aux poules. La piscine, lumineuse, fait le reste du programme — on y passe la matinée, on en sort pour déjeuner, on y replonge l'après-midi.",
      "À table, c'est une cuisine de fermette, généreuse, qui pioche dans le potager du jour : salades vives, légumes rôtis, tagines doux, desserts maison. On déjeune dehors quand le temps le permet — c'est-à-dire presque toujours — et l'on étire le repas comme on étirait ceux des vacances chez les grands-parents.",
      "Farasha est l'une de ces adresses qu'on conseille en chuchotant : elle convient autant à une journée en famille qu'à un déjeuner entre amis ou à une parenthèse romantique. L'esprit reste le même — celui d'une maison qui vit, qui accueille, et qui rend tout simple.",
    ],
  },
  {
    id: "c03e0482-f26e-4664-9165-67e2c731ca4c",
    pretitle: "Route d'Agadir, à la sortie de Marrakech",
    title: "Secret Family Farm — la petite ferme cachée où les enfants se dépensent",
    hours: "Ouvert tous les jours, de 10h00 à 18h30.",
    paragraphs: [
      "Le nom dit tout ou presque : Secret Family Farm est l'une de ces adresses qu'on se passe entre parents, presque à voix basse, comme un bon plan qu'on aurait peur de voir s'éventer. Sur la route d'Agadir, à la sortie de Marrakech, on pousse une grille discrète et l'on découvre un coin de campagne tranquille où les enfants peuvent enfin courir, grimper, sauter, sans qu'on leur dise non.",
      "L'idée est simple : laisser les enfants se dépenser en liberté. Chèvres, poules, lapins se promènent autour d'eux ; ils les nourrissent, les caressent, apprennent leurs noms. Un espace est aménagé pour les ateliers créatifs — petites créations qu'on emporte fièrement dans le sac de plage — et la nature, partout autour, prend la suite du programme.",
      "Ce qu'on aime ici, c'est l'échelle : tout est petit, familial, accessible. On n'y trouve pas la débauche d'activités d'un grand parc, mais c'est précisément ce qui fait son charme. Les parents s'installent à l'ombre, les enfants évoluent dans un périmètre rassurant, et la journée file sans qu'on y pense.",
      "Une adresse à garder pour ces dimanches où l'on cherche juste un endroit calme, vert, où poser les enfants en sachant qu'ils vont y être heureux. Le mot « secret » du nom n'est presque pas usurpé : on en repart avec l'envie d'y revenir avant de le dire à trop de monde.",
    ],
  },
  {
    id: "f386b62b-d20e-4cea-86e6-460a802ed1b9",
    pretitle: "Désert d'Agafay, à 30 minutes de Marrakech",
    title: "The Ranch Marrakech — l'esprit cowboy aux portes du désert d'Agafay",
    hours: "Ouvert tous les jours — balades à cheval, déjeuners et activités sur réservation.",
    paragraphs: [
      "On roule une trentaine de minutes vers le sud-ouest, on quitte la route principale, et soudain c'est le décor lunaire du désert d'Agafay qui s'ouvre devant soi. C'est là, au milieu des collines minérales, que The Ranch Marrakech plante ses écuries, ses paddocks et ses tentes berbères. L'endroit a un parfum de Far West marocain : chevaux qui broutent au loin, selles posées sur les barrières en bois, chapeaux et bottes à l'entrée — tout évoque le grand air et la liberté.",
      "Le cœur du Ranch, c'est le cheval. L'écurie est sérieuse, les montures sont bien tenues, et l'équipe — passionnée et pédagogue — sait adapter la balade au niveau de chacun. Les débutants partent au pas, les enfants découvrent la selle dans le manège, les cavaliers confirmés s'élancent au trot ou au galop dans les pistes du désert. Une heure, deux heures, une demi-journée : la formule se choisit à la carte.",
      "Au retour, on déjeune sur place, dans une grande salle ouverte sur le paysage. La cuisine est simple, généreuse, parfaite après l'effort. Pour les enfants qui ne montent pas encore, le ranch propose des baptêmes poneys, des tours en charrette et un contact direct avec les animaux du domaine — chèvres, ânes, chiens qui suivent les visiteurs.",
      "C'est l'adresse idéale pour une journée différente, à la fois sportive et dépaysante, qui combine la magie du désert d'Agafay avec l'expérience rare de monter à cheval dans un cadre aussi vaste. On en repart les jambes lourdes, le visage hâlé, et avec cette envie immédiate de revenir.",
    ],
  },
  {
    id: "ee91eb6e-2b42-4187-8107-f290f9793815",
    pretitle: "Route de l'Ourika, à quelques minutes de Marrakech",
    title: "Le Bled Ferme — une journée champêtre entre piscine, animaux et table marocaine",
    hours: "Ouvert tous les jours — journées détente, déjeuners et activités sur réservation.",
    paragraphs: [
      "Quelques minutes sur la route de l'Ourika, et l'on bascule déjà dans la campagne marrakchie : palmiers, oliviers, montagnes en arrière-plan, et au bout d'un chemin discret, le portail du Bled Ferme. L'endroit a tout d'un domaine familial pensé pour qu'on s'y sente bien dès le premier pas — accueil chaleureux, jardins entretenus, et cette odeur de pain chaud qui flotte autour de la cuisine.",
      "La journée s'organise sans effort. On commence par la piscine, grande et ensoleillée, bordée de transats à l'ombre des arbres. Les enfants y passent la matinée pendant que les parents savourent enfin un vrai moment de calme. À midi, on s'installe à table pour une cuisine marocaine généreuse — tagines, salades fraîches, grillades — servie sous la pergola ou en terrasse selon l'envie.",
      "L'après-midi prend ensuite un tour pédagogique : visite des animaux de la ferme, contact avec les chevaux, poules et lapins, balades dans les allées du domaine, ateliers ludiques pour les plus jeunes. L'équipe a le sens du détail et sait occuper les enfants sans jamais bousculer le rythme des adultes — exactement ce qu'on attend d'une vraie journée à la campagne.",
      "Le Bled Ferme, c'est cette adresse rare qui combine confort, simplicité et authenticité. On en repart en fin d'après-midi avec la sensation d'avoir vraiment fait une pause, à quelques minutes seulement de la ville ocre.",
    ],
  },
];

const FermesPedagogiquesMarrakech = () => (
  <BlogArticleTemplate
    entries={FERMES}
    articlePath="/blog/fermes-pedagogiques-marrakech"
    articleTitle="Les fermes pédagogiques à Marrakech"
    articleDescription="Douze adresses à quelques minutes de la ville ocre, pour offrir aux enfants — et aux parents — une vraie journée de nature, entre animaux, ateliers et plantes aromatiques."
    bookmarkSlug="fermes-pedagogiques-marrakech"
    heroAlt="Fermes pédagogiques à Marrakech"
    heroTitleTop="Les fermes pédagogiques"
    heroTitleBottom="à Marrakech"
    heroSubtitle="Douze adresses à quelques minutes de la ville ocre, pour offrir aux enfants — et aux parents — une vraie journée de nature, entre animaux, ateliers et plantes aromatiques."
    intro="Marrakech a beau être une ville d'effervescence, ses environs immédiats cachent quelques refuges de verdure où l'on respire autrement. Pour les familles, ces fermes pédagogiques sont une respiration nécessaire : un terrain de jeu grandeur nature où les enfants courent après les poules, donnent à manger aux ânes, plongent les mains dans la terre et apprennent — sans s'en rendre compte — d'où viennent les choses. Voici nos douze adresses préférées, toutes accessibles en moins d'une heure depuis la médina."
    datePublished="2026-06-12T08:00:00+01:00"
    dateModified="2026-06-13T08:00:00+01:00"
  />
);

export default FermesPedagogiquesMarrakech;

