import BlogArticleTemplate, { type BlogArticleEntry } from "@/components/blog/BlogArticleTemplate";

// Texte immersif rédigé à partir des descriptions, hooks, avis clients, textes
// associés aux vidéos et horaires de chaque fiche.
const SEAFOOD: BlogArticleEntry[] = [
  {
    id: "d00d119b-a5b2-492b-bdbd-f0872e5701d7",
    pretitle: "Au cœur du port d'Essaouira",
    title: "Chez Sam — la légende du port, intacte depuis des décennies",
    hours: "Ouvert du mardi au dimanche, de 12h00 à 22h30 — fermé le lundi. Réservation conseillée.",
    paragraphs: [
      "On longe les remparts, on dépasse les barques bleues alignées comme un tableau marin, et l'on pousse une porte un peu cachée tout au bout du port — c'est là, dans une salle aux allures de cabine de bateau, que Chez Sam vit depuis des décennies. L'adresse a quelque chose d'irréductible : c'est l'un de ces endroits qui ne ressemblent à rien d'autre et qu'on raconte au retour de voyage comme une scène qu'on n'inventerait pas.",
      "L'expérience commence avant même la première bouchée. On vous présente le poisson du jour, débarqué quelques mètres plus loin, et l'on choisit la cuisson. La carte s'écrit au gré de ce que la mer a donné le matin : daurade, saint-pierre, calamars, langouste lorsque la chance est avec vous. L'amuse-bouche posé sur la table donne déjà le ton — précis, soigné, vraiment cuisiné.",
      "« Pour moi, c'est un joyau caché d'Essaouira, écrit un client. Si vous cherchez un vrai restaurant de fruits de mer, c'est ici qu'il faut venir. Tout était parfait, de l'amuse-bouche au plat principal. » L'équipe a cette façon professionnelle et discrète d'orchestrer le service, et le patron passe en salle s'assurer que tout va bien — geste presque disparu ailleurs.",
      "On y dîne sans chichi, on en repart avec ce sentiment qu'on a vécu un morceau d'Essaouira authentique, celui d'avant les guides et les hashtags. C'est exactement pour ça qu'on revient, et qu'on le glisse à voix basse aux amis qui partent là-bas.",
    ],
  },
  {
    id: "ef699604-57f1-4e7b-be82-038e8b7d56db",
    pretitle: "Médina, sur les hauteurs du port",
    title: "La Table by Madada — la grande maison gastronomique d'Essaouira",
    hours: "Service du soir, du mercredi au lundi, de 19h00 à 22h00 — fermé le mardi. Réservation indispensable.",
    paragraphs: [
      "Au premier étage d'un riad de la médina, La Table by Madada s'ouvre sur l'une des plus belles vues de la ville : les remparts qui se découpent dans la lumière dorée, le vieux port à fleur d'eau, et l'Atlantique au loin. C'est l'adresse qu'on choisit pour le dîner qui doit compter — un anniversaire, un retour, une déclaration discrète.",
      "Le poisson est ici travaillé avec la précision d'un grand restaurant et la sensibilité d'une maison qui connaît son sourcing. L'araignée de mer gratinée est devenue presque emblématique, les pâtes aux clams jouent une partition italienne fine — « ni trop de tomate, ni trop d'huile, juste l'assaisonnement parfait », résume une cliente — et la soupe de poissons infusée d'épices locales raconte tout de suite où l'on se trouve.",
      "Le service est élégant sans être guindé. Le sommelier propose un verre de vin marocain au prix juste, l'assiette arrive comme une photo, et l'on prend le temps. « Sans faute », « simplement merveilleux », « définitivement le meilleur restaurant que nous ayons fait au Maroc » — les retours convergent. C'est l'une des très rares tables d'Essaouira où l'on parle vraiment de gastronomie.",
      "On y dîne au coucher du soleil, on prolonge la soirée sur la terrasse du dessus pour un dernier verre, et l'on redescend par les ruelles de la médina avec l'impression d'avoir vu Essaouira sous son meilleur jour.",
    ],
  },
  {
    id: "ac9e1074-747a-4368-9ae9-fc93b4452e81",
    pretitle: "Médina, au cœur de la vieille ville",
    title: "Le Sirocco — la table chaleureuse qu'on refait deux fois dans le séjour",
    hours: "Service au déjeuner, tous les jours, de 12h00 à 15h00 — service du soir sur réservation.",
    paragraphs: [
      "Il y a des adresses qu'on ne fait qu'une fois — Le Sirocco n'en fait pas partie. « Nous y sommes retournés plusieurs fois pendant notre séjour, et chaque visite était aussi incroyable que la première », écrit un client. La salle, lovée dans un riad de la médina, a cette densité parfumée d'une vraie maison marocaine : tapis, lanternes, musiciens en live qui posent une ambiance tour à tour entraînante et apaisante.",
      "La carte fait dialoguer la grande cuisine marocaine et les produits de la mer. On commence souvent par une pastilla aux fruits de mer et quelques briouats parfaitement croustillants, on continue avec un tajine viande et gambas qui devient mémorable, et l'on finit par un dessert qui fait dire « l'un des meilleurs restaurants que j'aie faits depuis longtemps, partout ».",
      "Ce qui frappe, c'est l'accueil — chaleureux, presque familial, signé Any et son équipe. On se sent reçu, on est appelé par son prénom au deuxième passage, et l'on comprend pourquoi les clients en font une habitude. C'est l'une des très belles surprises d'Essaouira : un lieu où le repas s'étire, où la musique fait sourire, et où l'on a envie de réserver une seconde fois avant même d'être sorti.",
    ],
  },
  {
    id: "7eab6ed4-b82e-473e-89c8-6eb7a1044722",
    pretitle: "Médina, près des remparts",
    title: "Chez Zak — on choisit son homard dans la vitrine, on se régale d'une langouste grillée",
    hours: "Ouvert tous les jours, de 10h30 à 23h30.",
    paragraphs: [
      "Le rituel est devenu culte : on entre Chez Zak, on s'avance vers la vitrine réfrigérée, on choisit son homard ou sa langouste vivante, on le voit peser, on choisit la cuisson — grillé, à la sauce, à la persillade — et l'on retourne s'asseoir dans une salle à la décoration marocaine traditionnelle. La transparence de l'expérience est rare, et c'est précisément ce qui rassure : on sait ce qu'on mange, on sait d'où ça vient.",
      "« Le homard était frais, on nous l'a montré avant cuisson, pesé devant nous, et grillé à la perfection avec de très belles sauces d'accompagnement », résume un client. Le tartare de gambas, les fritures de poisson et les langoustines reviennent dans tous les retours, à des prix bien plus doux qu'on ne l'imagine — autour de 30 € les 500 g de langouste, sauces et accompagnements compris.",
      "Le patron passe en salle, vérifie que le poisson plaît, demande si la cuisson est juste — et c'est tout ce qui distingue les adresses qu'on garde en mémoire. Chez Zak est de celles-là : un repas marin franc, généreux, sans esbroufe, où la qualité du produit fait tout le travail.",
    ],
  },
  {
    id: "c68f624a-3d57-40e3-bced-fc7f85ba7c72",
    pretitle: "Médina, dîner intimiste",
    title: "Le Fish Bar — la table confidentielle dédiée aux produits de la mer",
    hours: "Service du soir, du jeudi au mardi, de 19h30 à 22h00 — fermé le mercredi. Réservation conseillée.",
    paragraphs: [
      "Le nom annonce la couleur, et l'adresse tient parole : Le Fish Bar a fait du poisson sa seule obsession. La carte courte change avec les arrivages, le décor est sobre, presque scandinave, et la salle, intime, oblige à réserver. On n'y vient pas par hasard — on y vient pour le poisson.",
      "Crudo de daurade, ceviche de saint-pierre, tartare aux agrumes, plats du jour grillés ou en sauce courte — la cuisine, précise, joue la transparence du produit. C'est l'une des très rares adresses d'Essaouira qui assume une vraie ligne de cuisine marine contemporaine, sans détour par les classiques marocains. Pour les amoureux du poisson tel quel — peu travaillé, parfaitement assaisonné — c'est le rendez-vous évident d'une soirée en ville.",
    ],
  },
  {
    id: "9ba92241-2bbe-4fbf-82f3-1c0f82180beb",
    pretitle: "Médina, ruelle Sidi Ali Ben Abdellah",
    title: "Vague Bleue — la petite salle de famille où tout est fraîchement pêché",
    hours: "Service au déjeuner et au dîner — réservation indispensable, la salle est minuscule.",
    paragraphs: [
      "Une devanture discrète, quelques tables seulement, une cuisine ouverte sur la salle — Vague Bleue est l'un de ces minuscules restaurants de médina qu'on retient parce qu'ils font, sans bruit, exactement ce qu'on attend d'eux. « Si vous cherchez une vraie cuisine locale et fraîche, c'est l'adresse à ne pas manquer », écrit un client, et tous les autres avis vont dans le même sens.",
      "Le menu est court — quelques poissons du jour, des pâtes, une entrée de légumes et un jus frais — et c'est précisément ce qui rassure : on cuisine ce qu'on a trouvé au marché le matin. La cuisson du poisson est nette, l'accompagnement de pommes de terre simple et juste, et l'addition étonnamment douce pour la qualité servie.",
      "L'accueil est bilingue, attentif, presque maternel. On y dîne au coude à coude avec d'autres voyageurs, on échange deux mots, et l'on en repart en se promettant de revenir le lendemain — sauf qu'il faut, là encore, avoir pensé à réserver.",
    ],
  },
  {
    id: "05430d30-c7f4-4933-ba80-c3230fd46b52",
    pretitle: "Médina, Place du Marché aux Grains",
    title: "Carré Bleu — l'adresse de cœur des habitués, sardines farcies en tête",
    hours: "Ouvert tous les jours, de 9h00 à 22h00.",
    paragraphs: [
      "Sur l'une des plus jolies places de la médina, Carré Bleu mène une vie joyeuse du matin au soir. C'est l'un de ces lieux où l'on s'attable au petit-déjeuner, où l'on revient pour déjeuner d'un poisson, et où l'on finit par y dîner le dernier soir parce qu'on s'y sent bien.",
      "La salle se remplit deux fois par déjeuner, le patron Khalid passe en revue chaque table, et le service ne s'arrête jamais — preuve, comme l'écrit un client portugais, « grand pays de la sardine », que les sardines farcies servies ici tiennent vraiment la promesse. La carte assume cette double identité : produits de la mer en vedette, mais aussi grands classiques marocains et options méditerranéennes pour les enfants.",
      "On y vient pour la cuisine ; on y reste pour l'atmosphère. C'est une adresse de quartier au sens noble du terme — vivante, hospitalière, sans calcul — et c'est précisément ce qui en fait l'une des préférées des habitués.",
    ],
  },
  {
    id: "5284b7f0-4a4c-4316-9b83-dde1e63f8215",
    pretitle: "Médina, 14 rue Laalouj",
    title: "Butterfly Space — la cuisine marine raffinée twistée d'inspirations méditerranéennes",
    hours: "Ouvert tous les jours, de 11h00 à 23h00.",
    paragraphs: [
      "Butterfly Space tranche avec le reste de la médina : décor moderne, musique douce, lumière travaillée — on entre dans une bulle plus européenne, plus design, sans jamais perdre l'ancrage marocain. La cuisine suit la même ligne : un twist contemporain sur des produits locaux, avec une vraie place pour le poisson.",
      "Les retours sont unanimes sur deux plats : les linguine aux gambas sautées, crémeuses et parfaitement cuites, et le tajine de poulet aux amandes, servi avec une générosité de maison. « Le propriétaire italien sait ce qu'il fait — la cuisine méditerranéenne est honnête, les portions généreuses et les prix justes », résume une cliente. Le tiramisu, dont on parle moins, mérite pourtant qu'on garde de la place.",
      "C'est l'adresse parfaite pour un dîner à deux dans la médina, sans la rusticité folklorique ni la sophistication des grandes tables — une jolie pause méditerranéenne, sincère et savoureuse.",
    ],
  },
  {
    id: "e5864525-298c-41fc-b659-32b9223f6d35",
    pretitle: "Médina, terrasse et patio",
    title: "El Khaima — un patio convivial pour le poisson et les classiques marocains",
    hours: "Ouvert tous les jours, de 11h30 à 23h00.",
    paragraphs: [
      "El Khaima est l'une de ces adresses « doubles » : un patio au rez-de-chaussée pour observer la vie de la médina passer, une terrasse à l'étage pour les soirs plus tranquilles. La carte fait dialoguer la cuisine marocaine traditionnelle et les produits de la mer, avec une vraie spécialité pour le poisson et les fruits de mer.",
      "Les habitués y reviennent pour le tajine d'agneau aux abricots — « exceptionnel » d'après les retours — et pour les plats de poisson qui s'accompagnent du très correct vin marocain de la maison. Le service est attentif, le patron passe vérifier qu'on est bien installé, et le rapport qualité/prix reste un argument fort.",
      "C'est l'adresse que les voyageurs de passage finissent par adopter — celle où l'on revient deux soirs dans la même semaine sans se lasser, parce qu'elle a cette qualité rare d'être à la fois fiable, conviviale et marine.",
    ],
  },
  {
    id: "89a3d7da-fc3e-4bcb-b71c-f1ac5e001ccd",
    pretitle: "Médina, face aux remparts de la Scala",
    title: "Il Mare — la vue océan depuis les remparts et les pâtes aux fruits de mer",
    hours: "Ouvert tous les jours, de 11h00 à 23h30 — jusqu'à minuit le week-end.",
    paragraphs: [
      "Il Mare a un atout que personne ne lui dispute : la vue. Au dernier étage d'un bâtiment plaqué contre les remparts de la Scala, le restaurant donne sur des kilomètres de plage de sable et la rumeur de l'Atlantique en arrière-plan. C'est pour cette vue qu'on monte les escaliers, et c'est cette vue qui justifie tout — y compris d'attendre une table à l'étage supérieur.",
      "La carte assume sa double identité italo-marocaine : pâtes aux fruits de mer, risottos, mais aussi tajines et grillades de poisson. « Mes pâtes aux fruits de mer étaient délicieuses, un peu chères, mais on paie pour la vue et ça les vaut », résume une cliente. La cuisine est honnête, le service exceptionnel — et l'ensemble fonctionne grâce à l'atmosphère.",
      "On y vient pour le coucher de soleil, on y prolonge avec un verre, on y dîne face à la mer en écoutant gronder l'océan. C'est l'adresse parfaite pour le repas « carte postale » d'un séjour à Essaouira.",
    ],
  },
  {
    id: "1dc2e2cb-30d9-4431-b9df-bc31f660e508",
    pretitle: "Plage, Boulevard Mohammed V",
    title: "Restaurant Ocean Vagabond — le café-resto de plage où le chef voyage de Saint-Pierre en sushis",
    hours: "Du lundi au vendredi, de 9h00 à 22h30 — samedi et dimanche, de 9h00 à 18h00.",
    paragraphs: [
      "Pieds dans le sable, vue dégagée sur les îles de Mogador et l'Atlantique : Ocean Vagabond est l'archétype du restaurant de plage d'Essaouira, posé sur une terrasse où passent les chameaux et les chevaux. On y vient pour respirer, déjeuner après le surf, prolonger l'après-midi face au coucher de soleil — la lumière fait tout le travail.",
      "La carte du chef Mouad Rherbaoui El Malki se lit comme une carte géographique. « Il surfe entre la papillote de Saint-Pierre au lait de coco et un exceptionnel magret de canard à la mangue confite », annonce la maison — la promesse est tenue, avec un voyage qui passe par la France (terrine campagnarde, foie gras mi-cuit), l'Asie (sushis maison), l'Espagne (tapas), et bien sûr Essaouira, avec les crustacés et le poisson du jour sur ardoise.",
      "« Endroit magique, vraie romance maroco-européenne dans l'assiette, service chaleureux qui vous fait sentir bienvenu », écrit un client venu y déjeuner cinq jours d'affilée après le yoga du matin. C'est exactement ce qu'on attend d'une adresse de plage : qu'elle soit fiable, généreuse, et qu'elle donne envie d'y revenir le lendemain.",
    ],
  },
  {
    id: "ee3e78fd-46d9-4828-9006-c4e8c9f11cda",
    pretitle: "Plage, vue océan",
    title: "Zahra's Grill — le menu fruits de mer généreux dans un décor de riad",
    hours: "Ouvert tous les jours, de 13h00 à 21h30.",
    paragraphs: [
      "Zahra's Grill joue la carte méditerranéenne au feu de bois, dans un décor de riad chic ouvert sur l'océan. C'est l'adresse des dîners qu'on partage : on commande un « set fruits de mer » à plusieurs, on découpe, on plonge le pain, on goûte chaque préparation — c'est la grande tablée familiale version Essaouira.",
      "« Le set seafood à un prix très raisonnable, décor de riad, équipe très amicale — l'un de nos meilleurs repas au Maroc », écrit un voyageur. Le plateau de fruits de mer pour quatre est unanimement recommandé, les « Ocean packages » incluent souvent vin et dessert (le fameux flan), et la qualité de la cuisson tient la promesse marine.",
      "C'est l'adresse qu'on choisit pour un dîner à plusieurs, sans calcul, avec l'assurance d'un repas généreux face à l'Atlantique. À réserver à l'avance : les habitués reviennent d'un soir sur l'autre, et la salle se remplit vite.",
    ],
  },
  {
    id: "7bedba68-4db5-49f5-ba2a-9fc27cc1be07",
    pretitle: "À 25 minutes au sud, à Ouassane (Sidi Kaouki)",
    title: "Tajine Octopus — chez Mustafa, qui pêche le matin ce qu'il vous sert le soir",
    hours: "Ouvert tous les jours, de 10h00 à 23h30 — réservation conseillée.",
    paragraphs: [
      "Si Essaouira est devenue l'évidence des fruits de mer marocains, Tajine Octopus est son secret bien gardé. Vingt-cinq minutes au sud, on quitte la ville, on descend vers Sidi Kaouki et l'on s'arrête à Ouassane, dans une petite maison où Mustafa et sa famille vous reçoivent comme chez eux. L'enseigne est honnête : on vient ici pour le poulpe — celui que Mustafa a pêché lui-même le matin même.",
      "« Mustafa a personnellement pêché le poulpe et les oursins que nous avons mangés, et il nous les a préparés frais. La nourriture était exceptionnelle, pleine de saveurs et de soin. Mais ce qui rend l'endroit vraiment unique, c'est l'âme de la maison », résume un client. Tous les avis convergent : le produit est ultra-frais, les épices sont précises, l'accueil est lumineux.",
      "On y vient en couple, en famille, entre amis — pour une vraie expérience marocaine de fruits de mer, loin des cartes touristiques, dans la chaleur d'une maison qui partage ce qu'elle a. C'est l'une des plus belles surprises de la côte autour d'Essaouira, et le genre d'adresse qu'on garde longtemps en mémoire.",
    ],
  },
  {
    id: "cdb1deaf-0c91-4def-b5ea-420087cbea38",
    pretitle: "Médina, 1 rue de Tanger",
    title: "Fishburger Essaouira — le poisson local glissé dans un bun, version street food",
    hours: "Ouvert tous les jours, de 11h30 à 23h30.",
    paragraphs: [
      "Pas envie d'un grand dîner ? Fishburger règle l'affaire en cinq minutes — et la qualité, elle, ne fait aucune concession. L'idée est simple : un filet de poisson local frais, parfaitement cuit, glissé dans un bun moelleux, avec frites maison, anneaux d'oignon ou guacamole selon l'humeur, et une limonade gingembre-menthe servie dans son petit verre.",
      "« Le poisson est cuit à la perfection, le service est rapide, tout est frais et bien préparé — c'est à essayer absolument », résument les habitués. « Tout le monde nous a partagé ses avis « waouh » sur ce restaurant de burger au poisson », écrit un autre. La file d'attente extérieure dit tout : on a affaire à un vrai phénomène local.",
      "C'est l'adresse parfaite pour le déjeuner sur le pouce entre deux visites de la médina, ou pour un dîner léger avant un coucher de soleil sur les remparts. Petits prix, paiement par carte accepté, ambiance jeune — un grand oui.",
    ],
  },
  {
    id: "c1fa56b4-c684-40b2-b9a3-ffef2c976fea",
    pretitle: "Médina, marché central",
    title: "Marché au Poisson de la Médina — l'expérience la plus authentique : on choisit, on cuisine",
    hours: "Ouvert tous les jours, de 8h00 à 20h00.",
    paragraphs: [
      "Pour qui veut comprendre Essaouira par son ventre, le passage par le marché au poisson de la médina est presque un rite. À deux pas de la place Moulay Hassan, sous les arcades, les étals exposent les arrivages du matin — sardines, daurades, calamars, poulpes, langoustines, parfois une langouste qui attend son acquéreur — pendant que les mouettes et les chats du quartier patientent à distance respectueuse.",
      "Le rituel est connu des habitués : on choisit son poisson, on négocie le prix au kilo, on demande à le faire grillé ou cuisiné « comme on aime » à l'un des petits comptoirs adjacents — et l'on s'installe sur place pour le déguster, à peine sorti du grill, avec une salade marocaine et du pain chaud. « Endroit très intéressant, gens très amicaux qui voulaient nous expliquer le marché. Je m'y suis sentie en sécurité, en tant que femme voyageant seule », rapporte une cliente.",
      "C'est l'expérience la plus directe que l'on puisse faire des produits de la mer à Essaouira : un repas à très bas prix, vraiment frais, partagé avec les locaux. À tester au moins une fois — c'est un souvenir que les grands restaurants ne remplaceront pas.",
    ],
  },
];

const FruitsDeMerEssaouira = () => (
  <BlogArticleTemplate
    entries={SEAFOOD}
    articlePath="/blog/manger-fruits-de-mer-essaouira"
    articleTitle="Manger des fruits de mer à Essaouira"
    articleDescription="Quinze adresses pour goûter à l'Atlantique, du port aux remparts — gastronomie marine, tables de médina, beach restaurants et l'incontournable marché au poisson."
    bookmarkSlug="manger-fruits-de-mer-essaouira"
    heroAlt="Manger des fruits de mer à Essaouira"
    heroTitleTop="Manger des fruits de mer"
    heroTitleBottom="à Essaouira"
    heroSubtitle="Quinze adresses pour goûter à l'Atlantique, du port aux remparts — gastronomie marine, tables de médina, beach restaurants et l'incontournable marché au poisson."
    intro="Essaouira a la mer dans les veines. On l'entend dès qu'on franchit les remparts, on la voit partout — dans les barques bleues alignées au port, dans les filets posés à sécher, dans le sel sur les murs blancs de la médina. Et l'on s'en aperçoit surtout dans l'assiette : ici, le poisson n'a jamais voyagé. Il a été pêché à l'aube, débarqué au pied de la Scala, et il arrive sur la table quelques heures plus tard, simplement grillé ou sublimé par un chef. Voici nos quinze adresses préférées pour vivre Essaouira par les fruits de mer — des plus légendaires aux plus secrètes, du dîner gastronomique au burger de poisson sur le pouce."
    datePublished="2026-06-20T08:00:00+01:00"
    dateModified="2026-06-20T08:00:00+01:00"
  />
);

export default FruitsDeMerEssaouira;
