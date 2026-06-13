import BlogArticleTemplate, { type BlogArticleEntry } from "@/components/blog/BlogArticleTemplate";

// Texte immersif rédigé à partir des hooks, descriptions, services, badges,
// vidéos, avis clients et horaires de chaque fiche du désert d'Agafay.
const ENTRIES: BlogArticleEntry[] = [
  {
    id: "e05a7ece-e417-4d65-b8a4-17a3ea4f96b3", // Stellar Agafay Desert Camp
    extraIds: [
      "95d46f3b-9bc3-4d9b-be03-2214c09c7bee", // Restaurant Stellar Agafay
      "9e515ed3-a9d3-4ee5-9a30-ea4714d0196b", // Piscine Stellar Agafay
    ],
    pretitle: "Agafay — campement signature",
    title: "Stellar Agafay Desert Camp — paisibles excursions ou aventures palpitantes à 50 min de Marrakech",
    hours: "Camp ouvert toute l'année, restaurant et piscine accessibles sur place — réservation conseillée.",
    paragraphs: [
      "« Paisibles excursions ou aventures palpitantes à travers les dunes du désert d'Agafay, à 50 min. de Marrakech. » Le hook de Stellar Agafay Desert Camp annonce la couleur : ici, on choisit son rythme — dîner sous les étoiles, balade en quad ou plongée dans la piscine face aux dunes.",
      "Le camp combine trois adresses qui se complètent : les tentes-lodges du Stellar Agafay Desert Camp pour passer la nuit dans le silence du désert, le Restaurant Stellar Agafay qui propose « une expérience culinaire panoramique au cœur du désert d'Agafay », et la Piscine Stellar Agafay « entourée par le vaste désert d'Agafay et les montagnes de l'Atlas » pour les déjeuners au soleil et les afterworks au coucher du soleil.",
      "Côté prestations, on retient en priorité : hébergement sous tente lodge, restauration sur place, piscine à débordement face aux dunes, excursions à dos de chameau, quad et 4x4, soirées avec musique gnaoua. Logistique : navette depuis Marrakech, parking, accueil multilingue, événements privatisables.",
      "Horaires & accueil : camp ouvert toute l'année, restaurant et piscine accessibles sur place, accès au camp en 4x4 ou navette dédiée — réservation obligatoire.",
    ],
  },
  {
    id: "e9f65691-eac1-42aa-aa59-82351614c9a1", // Alkamar Camp Agafay
    extraIds: [
      "6c0c1303-5248-4485-b67c-25aa7581e58c", // Restaurant Alkamar
      "bba04ab7-192b-46e5-9f39-813e7645e4c0", // Piscine Alkamar
    ],
    pretitle: "Agafay — éco-lodge contemporain",
    title: "Alkamar Camp Agafay — un havre de tranquillité et de luxe niché dans un paysage désertique captivant",
    hours: "Eco-lodge ouvert toute l'année, restaurant et salon piscine accessibles — réservation conseillée.",
    paragraphs: [
      "« Un havre de tranquillité et de luxe niché dans un paysage désertique captivant. » Alkamar Camp Agafay marie restaurant, salon piscine et lodges au design soigné, avec une vue qui semble se prolonger jusqu'aux contreforts de l'Atlas.",
      "Les lodges, sanctuaires loin de l'agitation urbaine, ouvrent sur la beauté éthérée d'Agafay. Le Restaurant Alkamar emmène les sens dans un voyage culinaire qui capture l'essence du Maroc — tajines mijotés, couscous généreux, accords d'épices des souks de Marrakech. Et la Piscine Alkamar, bordée de chaises longues, devient le repaire idéal des longs après-midis : on s'y rafraîchit, on s'y allonge, le désert s'étend devant soi et le temps semble s'arrêter.",
      "Côté prestations : lodges design, restauration sur place, piscine, salon, activités du camp (excursions à pied, à chameau ou en quad), événements privatisables.",
      "Horaires & accueil : éco-lodge ouvert toute l'année, restaurant et salon piscine accessibles sur place — réservation conseillée.",
    ],
  },
  {
    id: "13c84bd6-e2ab-4ec5-9b3c-c806ef9b6e95", // La Pause Marrakech
    pretitle: "Agafay — l'oasis désertique pionnière",
    title: "La Pause Marrakech — un oasis désertique à couper le souffle au creux des dunes d'Agafay",
    hours: "Camp ouvert toute l'année — accès en 4x4, restauration et nuitée sur réservation.",
    paragraphs: [
      "« Niché au creux des terres arides des dunes d'Agafay, se trouve un oasis désertique à couper le souffle. » La Pause est l'une des adresses fondatrices d'Agafay, citée comme campings et bivouacs et écolodge — un lieu sans électricité ni Wi-Fi, voulu comme une véritable parenthèse.",
      "On y vient pour déjeuner sous les tentes berbères, partager un dîner aux chandelles, dormir dans une khaïma confortable et s'essayer aux activités du désert : randonnée à pied, à dos de chameau, à dos d'âne, course de vélo, partie de pétanque ou de boules dans les rocailles. Le tout dans le silence des dunes, à 45 minutes de la médina.",
      "Côté prestations : restauration berbère, bivouac en khaïma, activités douces (chameau, âne, vélo, marche), événements privatisables, esprit slow et déconnexion totale.",
      "Horaires & accueil : camp ouvert toute l'année, accès en 4x4 — restauration et nuitée sur réservation.",
    ],
  },
  {
    id: "ecfa897c-5200-4050-8f77-1b11a6f145eb", // Caravan Agafay
    pretitle: "Agafay — campement créatif",
    title: "Caravan Agafay — un espace de liberté créative au cœur du désert",
    hours: "Camp ouvert toute l'année — nuitée et restauration sur réservation.",
    paragraphs: [
      "« Un espace de liberté créative, oasis de découverte se niche au cœur du désert d'Agafay. » Caravan Agafay réunit hôtel et campings et bivouacs dans une même adresse, pensée pour ceux qui veulent passer plus d'une nuit dans le désert sans renoncer au confort.",
      "Les tentes-suites mêlent inspirations beldi et touches contemporaines, autour d'une piscine ouverte sur les dunes. La table met à l'honneur la cuisine du désert, et les soirées s'étirent autour du feu, sous un ciel étoilé qui justifie à lui seul le voyage.",
      "Côté prestations : tentes-lodges, piscine, restauration sur place, dîners sous les étoiles, soirées musicales, activités du désert.",
      "Horaires & accueil : camp ouvert toute l'année, accès depuis Marrakech en moins d'une heure — nuitée et restauration sur réservation.",
    ],
  },
  {
    id: "ce5cfdfc-4f16-45d0-b54a-3b2116e76d0a", // Terre des Etoiles
    pretitle: "Agafay — l'éco-lodge autonome",
    title: "Terre des Étoiles — une oasis dans le désert de Marrakech, premier campement et éco-lodge autonome du Maroc",
    hours: "Eco-lodge ouvert toute l'année — séjour et activités sur réservation.",
    paragraphs: [
      "« Une oasis dans le désert de Marrakech. Le premier campement et Eco Lodge autonome du Maroc. » Terre des Étoiles assume sa singularité : autonomie énergétique, gestion responsable de l'eau, low-impact assumé jusque dans le moindre détail.",
      "Le lodge propose des nuitées en tentes berbères et en lodges, une cuisine de produits locaux, et un programme d'activités en lien direct avec le désert : observation des étoiles, marches contemplatives, balades à chameau, ateliers nature.",
      "Côté prestations : éco-lodge autonome, restauration sur place, activités douces dans le désert, événements privatisables, engagement éco-responsable revendiqué.",
      "Horaires & accueil : éco-lodge ouvert toute l'année — séjour et activités sur réservation.",
    ],
  },
  {
    id: "f386b62b-d20e-4cea-86e6-460a802ed1b9", // The Ranch Marrakech
    pretitle: "Agafay — bien-être et nature",
    title: "The Ranch Marrakech — un lieu pensé pour le bien-être, la nature et le partage",
    hours: "Hôtel ouvert toute l'année — séjours, journées et activités sur réservation.",
    paragraphs: [
      "« Un lieu pensé pour le bien-être, la nature et le partage. » The Ranch Marrakech décline une autre facette d'Agafay : celle d'un véritable ranch face aux dunes, où l'on vient pour la pension ranch, les soins, les chevaux et la vie au grand air.",
      "On y dort dans des chambres et lodges au confort soigné, on y partage des tables d'hôtes généreuses, et on y rythme ses journées au pas des chevaux : balades, leçons d'équitation, randonnées dans le désert. Les espaces extérieurs invitent à la détente, du yoga matinal au coucher de soleil sur les dunes.",
      "Côté prestations : hébergement, restauration sur place, activités équestres, soins et bien-être, événements privatisables.",
      "Horaires & accueil : hôtel ouvert toute l'année — séjours, journées et activités sur réservation.",
    ],
  },
  {
    id: "a7704bfc-667d-4306-b998-665b3c79f26c", // Olivar
    pretitle: "Agafay — la table contemplative",
    title: "Olivar — un lieu d'échange et de partage avec vue imprenable sur les dunes rocheuses d'Agafay",
    hours: "Restaurant — déjeuners et dîners sur réservation.",
    paragraphs: [
      "« Un lieu d'échange et de partage, avec une vue imprenable sur le paysage irréel des dunes rocheuses d'Agafay. » Olivar pose une table simple et soignée face aux étendues minérales du désert — l'une de ces adresses où l'on prolonge l'apéritif et l'on s'attarde au dessert.",
      "Carte courte et saisonnière, produits locaux, service détendu : Olivar fait le pari de la qualité plutôt que du spectacle, ce qui ne l'empêche pas de cultiver l'un des plus beaux panoramas du plateau d'Agafay.",
      "Côté prestations : restauration sur place, vue sur les dunes, événements privatisables.",
      "Horaires & accueil : restaurant ouvert pour déjeuners et dîners — réservation conseillée.",
    ],
  },
  {
    id: "218d124b-7267-45d0-8d2a-7069b2d9e3fd", // Le Soukoune
    pretitle: "Agafay — restaurant d'exception",
    title: "Le Soukoune — un restaurant d'exception pour vos déjeuners et dîners dans le désert d'Agafay",
    hours: "Restaurant — déjeuners et dîners sur réservation.",
    paragraphs: [
      "« Un restaurant d'exception pour vos déjeuners et dîners dans le désert d'Agafay. » Le Soukoune fait partie de cette nouvelle génération de tables qui ont fait du plateau d'Agafay une véritable destination gastronomique de Marrakech.",
      "Décor soigné, cuisine méditerranéenne et marocaine relevée d'inspirations contemporaines, vues panoramiques : on y vient pour une parenthèse hors de la ville, en groupe d'amis, en couple ou pour un événement privé.",
      "Côté prestations : restauration sur place, espaces intérieurs et extérieurs, événements privatisables.",
      "Horaires & accueil : déjeuners et dîners — réservation conseillée.",
    ],
  },
  {
    id: "99f8a3a2-e230-4b7b-9e03-5c5b25e2f310", // Agafay Cayenne Experience
    pretitle: "Agafay — adrénaline tout-terrain",
    title: "Agafay Cayenne Experience — Porsche Cayenne V6 et V8 Turbo dans les pistes secrètes d'Agafay",
    hours: "Excursions à la demande, sur réservation.",
    paragraphs: [
      "« Agafay Cayenne Experience — Expérience Porsche tout-terrain. » Deux machines off-road d'exception attendent les amateurs de conduite : un Cayenne V6 atmosphérique 3,2 L de 300 chevaux pour une accélération progressive et prévisible, et un Cayenne V8 biturbo 4,5 L de 500 chevaux et 700 Nm de couple pour des poussées franches et continues.",
      "Vous conduisez. Vous maîtrisez. Vous choisissez jusqu'où aller : les véhicules sont dotés de suspensions tout-terrain réglées pour les pistes d'Agafay, d'une protection intégrale du châssis et du soubassement, et d'une transmission intégrale permanente. Échappements ouverts, sonorité affirmée, pistes secrètes : une signature unique sur le plateau.",
      "Côté prestations : excursions en 4x4 d'exception, accompagnement professionnel, départ depuis Agafay.",
      "Horaires & accueil : excursions à la demande, sur réservation.",
    ],
  },
  {
    id: "86b4ae16-d41b-435f-8e34-4d2b8e8594d4", // Camel Ride Marrakech
    pretitle: "Agafay — l'incontournable balade",
    title: "Camel Ride Marrakech — la meilleure expérience de balade à dos de chameau à Marrakech",
    hours: "Sorties matin et coucher du soleil, sur réservation.",
    paragraphs: [
      "« La meilleure expérience de balade à dos de chameau à Marrakech. » Camel Ride Marrakech opère directement depuis Agafay et propose la balade emblématique du désert : monter sur le chameau, suivre le pas régulier de la caravane, traverser les ondulations minérales du plateau.",
      "Selon les formules, la balade se prolonge par un thé sous tente berbère, un déjeuner ou un dîner dans un campement, ou se cale sur un coucher de soleil — quand les pierres prennent leur teinte orangée et que le silence se fait total.",
      "Côté prestations : excursions à dos de chameau, accompagnement, formules courtes ou demi-journée, départ depuis Agafay.",
      "Horaires & accueil : sorties matin et coucher du soleil, sur réservation.",
    ],
  },
  {
    id: "1f41d62d-e89b-4083-a5db-c0bed1740cc2", // E-Bike Marrakech
    pretitle: "Agafay — silencieux et électrique",
    title: "E-Bike Marrakech — explorer les pistes d'Agafay à vélo électrique tout-terrain",
    hours: "Sorties à la demande, sur réservation.",
    paragraphs: [
      "Pour ceux qui veulent vivre Agafay autrement que sur quatre roues ou à dos de chameau, E-Bike Marrakech propose l'option la plus silencieuse : vélo électrique tout-terrain, pour avaler les pistes sans effort tout en gardant le plaisir de sentir le vent et le crissement des cailloux.",
      "L'expérience est encadrée, adaptée à plusieurs niveaux, et permet d'accéder à des coins du plateau peu fréquentés — l'occasion idéale d'apercevoir la faune locale, de croiser des bergers et de profiter pleinement du panorama.",
      "Côté prestations : location de vélos électriques tout-terrain, sorties guidées, formules courtes et demi-journée.",
      "Horaires & accueil : sorties à la demande, sur réservation.",
    ],
  },
  {
    id: "abf53497-e19a-42ad-9508-baf6f21a0d2d", // Rak Adventure (montgolfière)
    pretitle: "Agafay — vu du ciel",
    title: "Rak Adventure — survoler Agafay et la Palmeraie en montgolfière ou en ULM",
    hours: "Vols à l'aube, sur réservation.",
    paragraphs: [
      "Pour boucler la boucle, il fallait une vue d'oiseau. Rak Adventure propose des vols en montgolfière au lever du jour au-dessus de la Palmeraie et du plateau d'Agafay : sports mécaniques et dans les airs réunis, pour saisir d'un seul regard l'immensité minérale qui sépare Marrakech de l'Atlas.",
      "Décollage avant l'aube, ascension douce, lumière qui colore les dunes une à une, atterrissage suivi d'un petit-déjeuner traditionnel : c'est l'expérience à offrir ou à s'offrir, celle qui résume Agafay en un seul matin.",
      "Côté prestations : vols en montgolfière (et options ULM), accompagnement par équipe spécialisée, transferts depuis Marrakech, petit-déjeuner inclus.",
      "Horaires & accueil : vols à l'aube — réservation obligatoire, fenêtres météo strictes.",
    ],
  },
];

const AgafayDream = () => (
  <BlogArticleTemplate
    entries={ENTRIES}
    articlePath="/blog/agafay-dream"
    articleTitle="Agafay Dream"
    articleDescription="Douze adresses pour vivre le désert d'Agafay à 45 minutes de Marrakech — éco-lodges, camps de luxe, tables panoramiques, excursions Porsche, chameau, e-bike et survol en montgolfière."
    bookmarkSlug="agafay-dream"
    heroAlt="Agafay Dream — désert d'Agafay, à 45 minutes de Marrakech"
    heroTitleTop="Agafay"
    heroTitleBottom="Dream"
    heroSubtitle="Le désert minéral aux portes de Marrakech — éco-lodges, camps de luxe, tables panoramiques et aventures à dos de chameau, en Porsche, en e-bike ou en montgolfière."
    intro="À 45 minutes au sud-ouest de Marrakech, le plateau d'Agafay déroule un désert minéral spectaculaire — ni dunes ni sable doré, mais des collines rocheuses sculptées par le vent et bordées, par temps clair, par les sommets enneigés de l'Atlas. Devenu en quelques années l'un des terrains de jeu les plus convoités des voyageurs en quête de silence, Agafay réunit aujourd'hui des camps de luxe, des éco-lodges pionniers, des tables d'exception et toute une palette d'expériences — du chameau à la Porsche Cayenne, en passant par l'e-bike et la montgolfière. Voici notre sélection « Agafay Dream »."
    datePublished="2026-06-13T12:00:00+01:00"
  />
);

export default AgafayDream;
