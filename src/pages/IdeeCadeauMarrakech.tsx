import BlogArticleTemplate, { type BlogArticleEntry } from "@/components/blog/BlogArticleTemplate";

// Texte généré à partir des hooks, descriptions, horaires et avis clients
// des établissements de Marrakech dont une vidéo porte le badge « Idée Cadeau ».
const IDEES_CADEAUX: BlogArticleEntry[] = [
  {
    id: "af896f57-d96d-47a1-a241-e0d4a45fe2a1",
    pretitle: "Marrakech — Medina",
    title: "91 Leather Store — le cadeau cuir à porter au quotidien",
    hours: "Ouvert tous les jours, 10:00–21:00.",
    paragraphs: [
      "Notre passion pour le cuir se reflète dans chaque produit que nous vous proposons ✨ À Marrakech, dans le quartier de Medina, l'adresse joue la carte de chaussures, bagagerie avec personnalité.",
      "« Si vous êtes fatigué de devoir négocier constamment dans la médina, rendez-vous simplement dans ce magasin du centre commercial. Demandez Mohammed – il est incroyablement serviable, prend son temps et donne d'excellents… », résume Alberto Taaban.",
    ],
  },
  {
    id: "28de4d8c-1ea8-4375-a3d7-14d6c37e5ac1",
    pretitle: "Marrakech — Route de l’Ourika",
    title: "Air Babouche — le cadeau qui chausse aussi bien à Marrakech qu'ailleurs",
    hours: "Ouvert 09:30–18:30 — fermé le dimanche",
    paragraphs: [
      "Un voyage entre tradition et modernité, des babouches uniques, faites main à Marrakech. À Marrakech, dans le quartier de Route de l’Ourika, l'adresse joue la carte de chaussures avec personnalité.",
      "Quand la babouche marocaine rencontre le design contemporain. L’idée d’Air Babouche prend forme lorsque son fondateur Adil Bouarbi redécouvre l’artisanat marocain dans les ateliers de la médina. Face à ce savoir-faire ancestral, une conviction se développe : la babouche marocaine doit s’inscrire dans son époque. Air Babouche naît ainsi avec une ambition claire : transformer une babouche traditionnelle en une babouche moderne en cuir, pensée pour un usage actuel, entre design, confort et identité culturelle. UNE VISION Air Babouche vise à faire évoluer la perception de la babouche marocaine au-delà de son usage traditionnel.",
      "« Excellente expérience ! Les chaussons sont magnifiques, faits de cuir de qualité et fabriqués avec grand soin. Le vendeur est très sympathique, patient et honnête sur les prix. On sent le savoir-faire artisanal marocain… », résume Khadim Kandji.",
    ],
  },
  {
    id: "ffa400b7-436b-4215-b01a-19cee4cecb91",
    pretitle: "Marrakech — Medina",
    title: "Ali Batrah — le cadeau d'une pièce à porter, signée Marrakech",
    hours: "Ouvert 10:00–20:00 — fermé le vendredi",
    paragraphs: [
      "Savoir-faire marocain 🇲🇦 Artisanat authentique. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de mode avec personnalité.",
      "« Ali a été très gentil, amical et serviable. Il nous a fourni de beaux vêtements traditionnels et la qualité était vraiment bonne. Il a une grande variété de tenues traditionnelles et des prix justes. Je recommande… », résume belasri kaoutar.",
    ],
  },
  {
    id: "ff80f49c-adbf-4977-981f-ec8d9a80986a",
    pretitle: "Marrakech — Hivernage",
    title: "Alwardeh Alshamieh Menara Mall — une idée cadeau repérée à Marrakech",
    hours: "Ouvert tous les jours, 10:00–22:00.",
    paragraphs: [
      "À Marrakech, dans le quartier de Hivernage, cette adresse s'est imposée comme l'une des bonnes pistes cadeau de la ville — repérée par notre équipe parce qu'une de ses vidéos figure dans la sélection « Idée Cadeau ».",
      "« Le centre commercial habituel à Marrakech. », confie Md Wakilur Rahman Eusufzai.",
    ],
  },
  {
    id: "f17c357f-8613-4503-a768-e7cbde0bcdcd",
    pretitle: "Marrakech — Medina",
    title: "Bacha Coffee — le cadeau gourmand à rapporter de Marrakech",
    hours: "Ouvert 10:00–18:00 — fermé le lundi",
    paragraphs: [
      "Parmi les plus beaux cafés historiques du monde, on trouve cette beauté endormie à Marrakech. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de café, salon de thé avec personnalité.",
      "Laissez-vous surprendre par notre vaste gamme de cafés aux Arômes Délicats où l'arabica se marie à des saveurs exquises. Des notes fruitées rafraîchissantes aux tonalités riches de chocolat, chaque café est méticuleusement préparé avec des essences naturelles pour sublimer les arômes et les saveurs des grains 100 % Arabica. Quel que soit le choix, il y en a pour tous les palais. Présentés dans d'élégants coffrets illustrés aux finitions soignées, chaque café de spécialité 100 % Arabica de notre collection Signature Nomad est un billet pour une destination à travers le monde. Succombez au charme d’un iconique Bacha Coffee, aussi éclatant à l’extérieur que le trésor qu’il renferme.",
      "« Le café vaut le détour et la longue attente. Assurez-vous d'être dans la file avant 9h30 pour être assis le matin. Nous sommes arrivés à 9h15, avons attendu dans la file jusqu'à 10h00. Le café était déjà rempli par tout… », confie Ellen Schepens.",
    ],
  },
  {
    id: "ed3376f0-5009-4d76-93ec-9d916cab6ad7",
    pretitle: "Marrakech — Medina",
    title: "Bazar El Bouanani — le cadeau souvenir, vraiment fait à Marrakech",
    hours: "Ouvert 09:00–00:00 — fermé le mercredi",
    paragraphs: [
      "Souvenirs de Marrakech en tous genres depuis 1959 🌴 Boutique en ligne. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de souvenir avec personnalité.",
      "Célébrons l'artisanat marocain à travers chaque pièce unique. Fondé en 1959 sur la place Jemaa el-Fna, le Bazar El Bouanani met à l'honneur les savoir-faire artisanaux traditionnels marocains. Nous proposons des produits authentiques et de qualité, élaborés selon des méthodes ancestrales, témoignant de notre engagement à préserver le patrimoine et l'excellence. Découvrez l'artisanat marocain authentique. Suivez le programme riche et varié du Bazar El Bouanani : ateliers d'artisans, événements culturels et lancements de produits exclusifs célèbrent le patrimoine marocain.",
      "« Meilleure boutique du marché ! Meilleurs prix, gens formidables !!! », résume Kennedy Puente.",
    ],
  },
  {
    id: "64ecdc1e-bfce-43f1-bc8c-9aeef728ac80",
    pretitle: "Marrakech — Gueliz",
    title: "Beauty Plaza — le cadeau qui se respire",
    hours: "Ouvert 10:00–21:00 — fermé le samedi",
    paragraphs: [
      "Boutique de parfums de luxe dédiée à l'art de la fragrance. Nous proposons une sélection raffinée de parfums rares. À Marrakech, dans le quartier de Gueliz, l'adresse joue la carte de parfumerie, cosmétiques avec personnalité.",
      "Une adresse à garder en tête au moment de choisir un cadeau à offrir, ou à se faire offrir, en rentrant de Marrakech.",
    ],
  },
  {
    id: "ab2964f7-18de-447c-b6e4-f82422cd56e7",
    pretitle: "Marrakech — Medina",
    title: "Beldi Boom — le cadeau bien-être inspiré du Maroc",
    hours: "Ouvert tous les jours, 09:00–21:00.",
    paragraphs: [
      "Soins naturels marocains 🇲🇦 Beauty • Body • Hair • Lifestyle Born in Marrakech. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de cosmétiques, beauté et hygiène avec personnalité.",
      "La marque cosmétique marocaine Beldi Boom a choisi Medina Mall Marrakech pour implanter sa boutique, affirmant ainsi sa volonté de s’inscrire dans un environnement dynamique, premium et à forte attractivité touristique. Medina Mall Marrakech est aujourd’hui l’un des centres commerciaux les plus fréquentés de la ville. Idéalement situé, à proximité des quartiers hôteliers, de la médina et des principaux axes routiers, le mall attire une clientèle variée composée de Marrakchis, de visiteurs nationaux et de touristes internationaux. Véritable lieu de vie, il combine shopping, restauration et loisirs dans un cadre moderne et élégant.",
      "« Expérience formidable ! J'ai reçu un soin de la peau gratuit car ils venaient d'ouvrir. Personnel très gentil et professionnel. Je suis vraiment reconnaissante pour l'excellent service. Ils parlent aussi anglais et… », résume Jeniffer R.",
    ],
  },
  {
    id: "641ab942-63a5-499e-999a-e09915b1d02f",
    pretitle: "Marrakech — Medina",
    title: "Boutique El Fenn — le cadeau cuir à porter au quotidien",
    hours: "Ouvert tous les jours, 11:00–22:00.",
    paragraphs: [
      "Objets d’art, design et artisanat marocain sélectionnés avec goût dans une atmosphère bohème chic À Marrakech, dans le quartier de Medina, l'adresse joue la carte de décoration, mode, chaussures, bagagerie avec personnalité.",
      "La Boutique El Fenn , située au cœur de l’hôtel emblématique El Fenn Marrakech , est bien plus qu’un simple espace de shopping : c’est un laboratoire de style , une curation de pièces uniques où l’art, l’artisanat et le design se rencontrent dans une harmonie subtile. Fidèle à l’esprit créatif et bohème de l’hôtel, la boutique propose une sélection raffinée d’objets soigneusement choisis pour leur authenticité, leur esthétique et leur qualité artisanale .",
      "« Une belle variété de vêtements et de produits. Il y a aussi un café et un restaurant sur le toit à l'étage », résume NMAS.",
    ],
  },
  {
    id: "dbf029c4-c683-452d-ae54-5647212436a0",
    pretitle: "Marrakech — Medina",
    title: "Capital of Perfume — une idée cadeau repérée à Marrakech",
    hours: "Horaires sur la fiche établissement.",
    paragraphs: [
      "À Marrakech, dans le quartier de Medina, cette adresse s'est imposée comme l'une des bonnes pistes cadeau de la ville — repérée par notre équipe parce qu'une de ses vidéos figure dans la sélection « Idée Cadeau ».",
      "« J'avais hâte de créer mon propre parfum à Marrakech et je suis ravi d'avoir trouvé cet excellent magasin. La sélection d'essences est exceptionnelle. J'ai probablement mis beaucoup trop de temps à me décider, mais la… », résume antonio narducci.",
    ],
  },
  {
    id: "40a6fff6-8b0e-4f46-8447-e0e6ef18372e",
    pretitle: "Marrakech — Medina",
    title: "Chez Zouhair — le cadeau qui se porte au poignet ou au cou",
    hours: "Ouvert 10:00–21:00 — fermé le lundi",
    paragraphs: [
      "Porter des bijoux est une façon de s'exprimer sans dire un mot. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de bijouterie avec personnalité.",
      "« Marrakech + Zouhair = ma nouvelle bague préférée. Cette saison signifie tout pour moi, et je cherchais un rappel que je pouvais regarder tous les jours. Zouhair avait la pièce parfaite pour moi : une qui respire la… », résume I Am Melissa.",
    ],
  },
  {
    id: "50d1d7e2-d72c-4c18-ace4-d1cc557eea0b",
    pretitle: "Marrakech — Tamesloht",
    title: "Coopérative Artisanale ART TISSAGE TAM — le cadeau qui se porte au poignet ou au cou",
    hours: "Ouvert tous les jours, 10:00–19:00.",
    paragraphs: [
      "Artisanat marocaine de luxe À Marrakech, dans le quartier de Tamesloht, l'adresse joue la carte de décoration, coopératives, tissage, broderie, poterie / céramique, bijouterie avec personnalité.",
      "« Produits magnifiques, prix fixes, vous trouverez ici tout pour la décoration d'intérieur. Et les produits sont fabriqués dans le village - peut-être même juste à côté, donc vous savez exactement qui vous soutenez avec… », résume Adrienn Fabók.",
    ],
  },
  {
    id: "1ce2a5de-2b06-4a28-929d-2f300e884a7d",
    pretitle: "Marrakech — Route de l’Ourika",
    title: "Cooperative Tilboura — le cadeau qui habille la maison au retour",
    hours: "Ouvert tous les jours, 09:30–18:30.",
    paragraphs: [
      "📦Articles faits main uniquement 🧑‍🎨 Personnalisation sur commande 🌍 Livraison internationale. À Marrakech, dans le quartier de Route de l’Ourika, l'adresse joue la carte de décoration avec personnalité.",
      "Une adresse à garder en tête au moment de choisir un cadeau à offrir, ou à se faire offrir, en rentrant de Marrakech.",
    ],
  },
  {
    id: "4bcc002a-6081-4940-bbb3-cecbd5d14568",
    pretitle: "Marrakech — Sidi Ghanem",
    title: "Elite & Chic Showroom — le cadeau qui se porte au poignet ou au cou",
    hours: "Ouvert 09:00–18:00 — fermé le dimanche",
    paragraphs: [
      "💍 Bijoux, vêtements, chaussures et décoration d'intérieur haut de gamme faits main. À Marrakech, dans le quartier de Sidi Ghanem, l'adresse joue la carte de décoration, mode, bijouterie, meubles avec personnalité.",
      "« J'ai acheté des bracelets et un sac et après avoir payé, j'ai demandé au caissier la permission de photographier 2 sacs car je voulais les offrir en cadeau à mon 'auto' (probablement un taxi). Le caissier m'a dit oui,… », confie G. T.",
    ],
  },
  {
    id: "3f243262-7bfd-4f27-9942-46ad98b705be",
    pretitle: "Marrakech — Route de l’Ourika",
    title: "Galerie de Céramique — le cadeau qui habille la maison au retour",
    hours: "Ouvert tous les jours, 09:30–20:00.",
    paragraphs: [
      "Nos produits sont faits à la main par nos artisans marocain 💕 À Marrakech, dans le quartier de Route de l’Ourika, l'adresse joue la carte de décoration avec personnalité.",
      "« Belle boutique avec une énorme sélection, prix corrects, il n'est pas nécessaire de marchander. », résume Claudia Van der Heiden.",
    ],
  },
  {
    id: "13ebf3b7-dedb-4940-8a01-3c2eac4234ec",
    pretitle: "Marrakech — Medina",
    title: "Galerie du Caftan — une idée cadeau repérée à Marrakech",
    hours: "Ouvert tous les jours, 10:00–23:00.",
    paragraphs: [
      "À Marrakech, dans le quartier de Medina, cette adresse s'est imposée comme l'une des bonnes pistes cadeau de la ville — repérée par notre équipe parce qu'une de ses vidéos figure dans la sélection « Idée Cadeau ».",
      "Bienvenue à la Galerie Caftan, le plus grand et le plus prestigieux showroom de caftans marocains à Marrakech. Située au cœur de la capitale culturelle du Maroc, notre boutique est fière d'incarner l'élégance, la tradition et le savoir-faire artisanal. À la Galerie Caftan, nous célébrons la beauté intemporelle de la mode marocaine en proposant une vaste sélection de caftans confectionnés avec soin. Des modèles traditionnels qui rendent hommage à notre héritage aux créations modernes et innovantes, notre collection s'adresse aux femmes en quête de luxe, de raffinement et d'authenticité.",
      "« Marwan est un type bien ! Bonne qualité Beau Il vend de bonnes choses à bon prix. », résume Bai Lee.",
    ],
  },
  {
    id: "da5770b4-a583-4e27-a4aa-51de147dc507",
    pretitle: "Marrakech — Gueliz",
    title: "Héritage Berbère Majorelle — le cadeau qui se respire",
    hours: "Ouvert tous les jours, 10:00–21:00.",
    paragraphs: [
      "Parfums d'exception et bougies artisanales inspirés du Maroc À Marrakech, dans le quartier de Gueliz, l'adresse joue la carte de parfumerie, décoration avec personnalité.",
      "Héritage Berbère est un concept store unique dédié à la beauté naturelle et aux rituels traditionnels marocains. Véritable vitrine du savoir-faire ancestral, cet espace élégant propose une immersion dans l’univers des cosmétiques naturels inspirés des traditions berbères. Fondée par une marque reconnue pour son engagement envers des produits authentiques et de qualité, Héritage Berbère met en avant des soins élaborés à partir d’ingrédients naturels issus du terroir marocain. On y retrouve notamment l’huile d’argan, les huiles essentielles, les plantes aromatiques et les extraits naturels utilisés depuis des siècles dans les rituels de beauté.",
      "« Service attentionné. Il y a deux sites, l'un est dans le quartier industriel. Vanille est subtile mais a aussi une présence. », résume J J.",
    ],
  },
  {
    id: "48bbda3a-1a4c-4ce1-832b-9b9337b8ab69",
    pretitle: "Marrakech — Gueliz",
    title: "Jnane Bleu Majorelle — le cadeau qui se porte au poignet ou au cou",
    hours: "Ouvert tous les jours, 09:00–19:00.",
    paragraphs: [
      "Un concept-store mode et artisanat contemporain à Marrakech. À Marrakech, dans le quartier de Gueliz, l'adresse joue la carte de mode, chaussures, décoration, bijouterie, bagagerie avec personnalité.",
      "À deux pas du Jardin Majorelle et dans le quartier Guéliz, le concept-store Jnane Bleu Majorelle fait dialoguer création contemporaine et héritage marocain au sein de deux boutiques au style affirmé. C'est Moumen qui signe la vision élégante du concept-store : une sensibilité forgée dans la connaissance du savoir-faire local, portée par le goût du détail et le sens du design. Ici, les créations signatures puisent dans les traditions pour les réinterpréter avec un regard résolument moderne. Caftans aux coupes épurées, tuniques ou babouches revisitées, bijoux et accessoires… Chaque silhouette offre une lecture moderne du vestiaire marrakchi, sans rompre avec son héritage.",
      "« Petit oasis à Marrakech ! », confie krasimira georgieva.",
    ],
  },
  {
    id: "50a71c7a-50d4-4b5b-a705-0ca4c37199ef",
    pretitle: "Marrakech — Medina",
    title: "Karim Bouriad Bazar — une idée cadeau repérée à Marrakech",
    hours: "Ouvert tous les jours, 09:00–20:00.",
    paragraphs: [
      "À Marrakech, dans le quartier de Medina, cette adresse s'est imposée comme l'une des bonnes pistes cadeau de la ville — repérée par notre équipe parce qu'une de ses vidéos figure dans la sélection « Idée Cadeau ».",
      "Notre Histoire Chez Karim Bouriad, nous vous invitons à un voyage au cœur de la vibrante tapisserie de la culture et de la mode marocaines. Nichés dans la ville enchanteresse de Marrakech, notre boutique et notre bazar sont un véritable phare de tradition, proposant une collection raffinée de caftans marocains et de vêtements traditionnels qui reflètent le riche patrimoine de notre cher pays. Des débuts modestes Personnalisation dynamique de matières premières de qualité grâce à une approche collaborative. Création efficace d'une sous-traitance distinctive et d'une gamme étendue de produits manufacturés.",
      "« Quel magasin formidable, j'ai été subjugué par les couleurs et les designs disponibles, chaque pièce étant si unique et bien travaillée, on peut vraiment apprécier la quantité de travail et de détails mis dans chacune… », résume Nermine Cherkaoui.",
    ],
  },
  {
    id: "05304d1f-7019-4545-8eae-e4568d7bf7a5",
    pretitle: "Marrakech — Medina",
    title: "Khmissa Marrakech — une idée cadeau repérée à Marrakech",
    hours: "Ouvert tous les jours, 10:00–21:00.",
    paragraphs: [
      "À Marrakech, dans le quartier de Medina, cette adresse s'est imposée comme l'une des bonnes pistes cadeau de la ville — repérée par notre équipe parce qu'une de ses vidéos figure dans la sélection « Idée Cadeau ».",
      "« Excellente qualité et service », confie Moundir Benzzaouia.",
    ],
  },
  {
    id: "7d05266e-48b7-4452-9f08-510ab7471391",
    pretitle: "Marrakech — Gueliz",
    title: "La boutique du Jardin Majorelle — une idée cadeau repérée à Marrakech",
    hours: "Ouvert tous les jours, 08:00–18:30.",
    paragraphs: [
      "À Marrakech, dans le quartier de Gueliz, cette adresse s'est imposée comme l'une des bonnes pistes cadeau de la ville — repérée par notre équipe parce qu'une de ses vidéos figure dans la sélection « Idée Cadeau ».",
      "Située au cœur du Jardin Majorelle, la Boutique s’inscrit dans le respect de la plus pure tradition du savoir-faire artisanal du Maroc, reflétant ainsi sa culture ancestrale, les influences amazighes et l’art islamique. Œuvres des meilleurs artisans marocains, les produits de la Boutique répondent aux plus hautes exigences de qualité des matériaux et de finition tout en privilégiant la noblesse du travail manuel. La Boutique rend également un hommage affirmé à Yves Saint Laurent par l’utilisation de la couleur et de motifs qu’il affectionnait : fleurs, serpent… La Boutique rend également un hommage affirmé à Yves Saint Laurent par l’utilisation de la couleur.",
      "Une adresse à garder en tête au moment de choisir un cadeau à offrir, ou à se faire offrir, en rentrant de Marrakech.",
    ],
  },
  {
    id: "6a3c51ce-a96e-49af-8f62-c83fe628a54a",
    pretitle: "Marrakech — Medina",
    title: "La Boutique Mamounia — le cadeau qui se respire",
    hours: "Horaires sur la fiche établissement.",
    paragraphs: [
      "L'art de vivre à la marocaine dans l'état pur — la boutique exclusive du palace La Mamounia à Marrakech. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de décoration, parfumerie, cosmétiques, jouets, librairie, maroquinerie, bagagerie avec personnalité.",
      "Nichée au coeur du palace mythique La Mamounia a Marrakech, La Boutique Mamounia est un écrin d'art de vivre et de raffinement a la marocaine. Elle présente une sélection pointue, chic, éclectique et exclusive qui mêle artisanat d exception, mode et design contemporain pour offrir une expérience unique a ses visiteurs. La Boutique Mamounia est idéale pour faire un cadeau prestige, se faire plaisir ou prolonger l'expérience unique du plus beau palace du monde. La boutique est egalement accessible en ligne via la e-boutique officielle.",
      "« J'adore cette boutique, l'une des meilleures que j'ai jamais visitées :-) », résume anass fouth.",
    ],
  },
  {
    id: "1d626730-9ea7-4e88-aeb3-3547e7169315",
    pretitle: "Marrakech — Medina",
    title: "La Cave à Huile — le cadeau du terroir marocain à glisser dans la valise",
    hours: "Ouvert tous les jours, 10:00–22:00.",
    paragraphs: [
      "Les meilleures huiles d’olive du Maroc ! À Marrakech, dans le quartier de Medina, l'adresse joue la carte de épicerie, cosmétiques avec personnalité.",
      "Au cœur de Marrakech, La Cave à Huile naît d’une idée simple : mettre en lumière la meilleure huile d’olive marocaine extra vierge. Nous travaillons avec des domaines familiaux, proches du moulin, et des terroirs identifiés. Chaque goutte d’huile d’olive, chaque gramme de safran est le fruit d’un savoir-faire ancestral et d’un amour profond pour notre terroir. Nous travaillons directement avec les coopératives locales, garantissant une rémunération juste aux producteurs et une qualité exceptionnelle à nos clients. La Cave à Huile, c’est l’authenticité marocaine dans chaque flacon. Notre promesse : fraîcheur, traçabilité et conseil. En boutique, vous dégustez.",
      "« Mina a été d'une grande aide pour choisir des cadeaux. L'assortiment d'huiles et de produits m'a vraiment agréablement surprise. », résume Amer Farge.",
    ],
  },
  {
    id: "0bc4a2ea-5a6f-4638-a980-72d00284efa0",
    pretitle: "Marrakech — Gueliz",
    title: "La Dragée D'or — le cadeau gourmand à rapporter de Marrakech",
    hours: "Ouvert tous les jours, 09:30–20:00.",
    paragraphs: [
      "Depuis 1997, l’histoire d’un artisan de douceurs continue à faire la joie des amateurs de grands chocolats. À Marrakech, dans le quartier de Gueliz, l'adresse joue la carte de pâtisserie avec personnalité.",
      "Depuis 1997, l’histoire d’un grand chocolatier se perpétue au coeur de Casablanca, Rabat, Fès et Marrakech et continue à faire la joie des amateurs de chocolats. Toujours en quête de plus belles créations, de saveurs surprenantes, La Dragée d’Or cultive l’art d’offrir et l’art de recevoir. Le chocolat, grâce à La Dragée d’Or, est entré dans toutes les fêtes marocaines et dans toutes les occasions. La Dragée d’Or poursuit son expansion nationale et vous annonce l’ouverture de son nouveau flagship sur ain diab.",
      "« J'ai passé une expérience tellement agréable dans cette boutique de chocolat. Les chocolats sont absolument délicieux, riches, frais et magnifiquement présentés. L'endroit lui-même est chaleureux et accueillant. Un… », résume Dohaa Assafrou.",
    ],
  },
  {
    id: "cba52b9c-95e7-46bf-87fe-7bd16428197e",
    pretitle: "Marrakech — Medina",
    title: "Layal Concept Store — le cadeau qui se respire",
    hours: "Ouvert tous les jours, 09:00–21:00.",
    paragraphs: [
      "Marque de maroquinerie et de créations originales | Based in Marrakech | Handmade créations | Limited Editions À Marrakech, dans le quartier de Medina, l'adresse joue la carte de bagagerie, mode, chaussures, parfumerie, bijouterie avec personnalité.",
      "« Une expérience incroyable avec Miriam. Elle m'a aidé à choisir des bagues et a aussi fait mon henné. Sa boutique propose de magnifiques vêtements et accessoires. », résume Fanta B.",
    ],
  },
  {
    id: "72aabf3b-7334-4aeb-b5e7-a3677c8025e0",
    pretitle: "Marrakech — Medina",
    title: "Le 110 Medina — le cadeau cuir à porter au quotidien",
    hours: "Horaires sur la fiche établissement.",
    paragraphs: [
      "Depuis le cœur animé du plus grand marché d'Afrique, nous perpétuons un héritage du cuir commencé en 1940. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de maroquinerie, bagagerie avec personnalité.",
      "« Très belle boutique d'articles en cuir avec des manteaux modernes, des sacs et bien plus encore. », résume Eriks Strals.",
    ],
  },
  {
    id: "68d45bf5-c9c5-444a-bbf3-f88533b8b798",
    pretitle: "Marrakech — Medina",
    title: "Le Jardin Secret — le cadeau gourmand à rapporter de Marrakech",
    hours: "Ouvert tous les jours, 09:30–19:30.",
    paragraphs: [
      "Jardin historique et havre de paix au cœur de la médina — Cafés, art et panorama sur l'Atlas. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de jardin botanique, monuments, musées avec personnalité.",
      "Le Jardin Secret de Marrakech est un véritable havre de paix au cœur de la médina, alliant histoire, architecture traditionnelle et beauté naturelle. Construit selon les principes des jardins islamiques et enrichi d'espaces exotiques, il offre une expérience immersive unique. Ses fontaines, ses bassins et ses allées soigneusement conçues reflètent l'art de l'aménagement des jardins de Marrakech à travers les siècles. Il abrite deux cafés — le Café Menzeh et le Café Sahrij — proposant thé à la menthe, plats frais, smoothies et douceurs maison, ainsi qu'un espace d'exposition d'art temporaire.",
      "« L'un des plus beaux endroits à visiter à Marrakech. J'y suis allé avec ma femme pour passer la soirée. Ça en valait vraiment la peine. Les billets d'entrée coûtent 100 MAD par personne. Une fois à l'intérieur, vous vous… », résume Adam Ameen.",
    ],
  },
  {
    id: "92c6dece-9b6d-4b2d-a4f8-59a8f8e26df1",
    pretitle: "Marrakech — Sidi Ghanem",
    title: "Les Dix Doigts Marrakech — le cadeau déco grand format pour la maison",
    hours: "Ouvert 09:30–18:30 — fermé le dimanche",
    paragraphs: [
      "Création, Design et Fabrication. Un temple du mobilier contemporain et de l’artisanat haut de gamme. À Marrakech, dans le quartier de Sidi Ghanem, l'adresse joue la carte de meubles, décoration avec personnalité.",
      "« Super découverte ! Je recommande sans aucune réserve. », confie Hiba Benkhattab.",
    ],
  },
  {
    id: "b7357628-f617-4fe4-afa8-8232b6c337d3",
    pretitle: "Marrakech — Medina",
    title: "Les Sens de Marrakech Riad Laârous — le cadeau qui se respire",
    hours: "Ouvert tous les jours, 10:00–20:00.",
    paragraphs: [
      "🌱 Produits cosmétiques & maison à ingrédients d’origine naturelle. Certifié ISO 22716. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de cosmétiques, beauté et hygiène, parfumerie avec personnalité.",
      "Une marque qui propose des composants efficaces et choisis pour leur innocuité, tout en restant fidèle à une démarche éthique valorisant le travail des artisans marocains. Les Sens de Marrakech vous propose plusieurs gammes de produits cosmétiques aux ingrédients d’origine naturelle. Parmi ces ingrédients figurent les éléments phares du Maroc : l’huile d’argan et l’huile de figues de barbarie qui sont reconnues pour leurs propriétés hydratantes et leur capacité à apporter confort et souplesse. Comme soin pour les peaux sèches et relâchées, notre produit best-seller la crème « Ages et merveilles » pour donner plus d’énergie aux peaux matures est à consommer sans modération.",
      "« Bonjour, je n'ai pas reçu d'e-mail de votre part. Je voudrais demander, pouvez-vous m'envoyer cette bouteille d'huile d'ambiance en Allemagne ? Merci », résume Vi co.",
    ],
  },
  {
    id: "6ac94eff-6a29-428d-b8bd-2f2db45c1ddb",
    pretitle: "Marrakech — Medina",
    title: "Maison Baboucha Vintage Store — le cadeau d'une pièce à porter, signée Marrakech",
    hours: "Ouvert tous les jours, 10:00–21:00.",
    paragraphs: [
      "Vêtements et accessoires vintage, de seconde main et neufs, sélectionnés avec soin… À Marrakech, dans le quartier de Medina, l'adresse joue la carte de mode avec personnalité.",
      "« Le propriétaire le plus cool et un super trésor caché à Marrakech ! J'aurais aimé pouvoir passer toute la journée à essayer des choses et à écouter la sélection de musique parfaite. Une expérience inoubliable », résume Shaeera Kalla.",
    ],
  },
  {
    id: "f841aa06-c298-4b7a-b3d3-71f6afb9b1dd",
    pretitle: "Marrakech — Medina",
    title: "Maison du Caftan — le cadeau d'une pièce à porter, signée Marrakech",
    hours: "Ouvert 09:00–20:00 — fermé le samedi, dimanche",
    paragraphs: [
      "L'élégance marocaine intemporelle caftans, takchitas et djellabas sur-mesure au cœur du souk de Marrakech. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de mode avec personnalité.",
      "Issu d'une alliance harmonieuse entre tradition et modernité, Maison du Caftan Marrakech tire son origine de la maison fondée par Haj Abdellah Benbrahim, répondant depuis 1981 aux attentes d'une clientèle toujours plus variée et sophistiquée. L'atelier, situé dans le souk de Marrakech, réunit une équipe d'artisans et de jeunes talents issus de l'école locale de design : cette fusion de savoir-faire constitue le fondement de sa philosophie, liant modernité et tradition.",
      "« 💖L'endroit idéal pour du cachemire de haute qualité 💖 J'ai acheté un très beau gilet bleu de la nouvelle collection d'hiver. Le directeur Omar m'a promis que la prochaine fois que je viendrai à Marrakech, il aurait… », résume Monika GOTZOVA.",
    ],
  },
  {
    id: "bfc76b95-740a-4abd-a7de-5fb7848a4049",
    pretitle: "Marrakech — Medina",
    title: "Maison Sucrée — le cadeau gourmand à rapporter de Marrakech",
    hours: "Ouvert tous les jours, 10:00–19:00.",
    paragraphs: [
      "Pâtisserie Marocaine. Cornes de Gazelle artisanales. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de pâtisserie avec personnalité.",
      "Situé au cœur de la médina de Marrakech, notre établissement est devenu un incontournable pour les amateurs de douceurs exquises et les visiteurs en quête d’authenticité et d’originalité. Venez nous rendre visite dès aujourd’hui et dégustez l’excellence de la pâtisserie marocaine revisitée. Nos cornes de gazelle revisitées sont créées avec passion et savoir-faire par nos artisans talentueux. Chaque bouchée est une explosion de saveurs, où la douceur de l’amande se mêle aux subtiles arômes traditionnels ou fruités. Le Cadeau Souvenir Idéal À la recherche du cadeau souvenir parfait de votre séjour à Marrakech? Nos cornes de gazelle artisanales sont un choix incontournable.",
      "« Entièrement végétalien et écologique ! J'étais tellement heureuse de passer devant cette petite boutique dans l'une des médinas. Le membre du personnel était extrêmement sympathique. Le cappuccino était ma préféré ! », résume Genie.",
    ],
  },
  {
    id: "77e9f1f4-7848-46b5-a8b0-e3d7e48da945",
    pretitle: "Marrakech — Medina",
    title: "Marie Bastide Medina — le cadeau cuir à porter au quotidien",
    hours: "Ouvert 10:00–19:00 — fermé le dimanche",
    paragraphs: [
      "Boutique d'art et d'artisanat marocain d'exception dans la Medina. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de décoration, mode, galeries d'art, bagagerie avec personnalité.",
      "Depuis sa création en 2018, Marie Bastide Marrakech incarne la beauté et l'artisanat du Maroc à travers ses produits. Fière de ses racines marocaines, la marque s'engage à offrir des articles 100% locaux, reflétant l'authenticité et la richesse de la culture marocaine. Studio de design et boutique d'art à Guéliz proposant des créations originales inspirées du Maroc : photographies artistiques, illustrations, objets artisanaux, foulards en soie, bougies naturelles, arts de la table, papeterie et décoration. Entreprise familiale, indépendante et engagée dans la préservation de la production locale. LIVRAISON INTERNATIONALE Nous proposons la livraison dans le monde entier.",
      "« Ce magasin a tellement de jolies choses, j'adore absolument la carte postale en bois d'ici », résume Liz Dang.",
    ],
  },
  {
    id: "5c1513d5-50b0-4d3f-b89c-795d457b6209",
    pretitle: "Marrakech — Medina",
    title: "Marrakech Mon Amour — le cadeau cuir à porter au quotidien",
    hours: "Ouvert tous les jours, 10:00–19:00.",
    paragraphs: [
      "Marque lifestyle made in Maroc, en boutique Place des Épices et en ligne. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de mode, bagagerie avec personnalité.",
      "Marrakech Mon Amour est une marque lifestyle née pendant la crise sanitaire, par amour pour Marrakech et ses artisans. La boutique propose des créations casuals et unisexes confectionnées localement dans des matières naturelles : t-shirts, hoodies, tote bags, pochettes, casquettes, chaussettes, maillots de bain, mugs et parfums. 100% made in Maroc, disponibles en boutique Place des Épices et en ligne avec livraison worldwide. Marque lifestyle made in Maroc — t-shirts, hoodies, tote bags et accessoires confectionnés par les artisans de Marrakech, en boutique Place des Épices et en ligne.",
      "« Boutique ravissante sur une petite place du souk. Les produits sont plus beaux les uns que les autres et la jeune fille qui y travaille est très compétente et d'une grande gentillesse ! Un endroit parfait pour acheter… », résume Claire F.",
    ],
  },
  {
    id: "27af0702-4115-4a6e-8244-76cc9b960530",
    pretitle: "Marrakech — Gueliz",
    title: "Natus Marrakech Gueliz — le cadeau du terroir marocain à glisser dans la valise",
    hours: "Ouvert tous les jours, 10:00–21:00.",
    paragraphs: [
      "Magasin à Gueliz de la marque n°1 de la cosmétique naturelle au Maroc. Soins à l'Huile d'Argan. À Marrakech, dans le quartier de Gueliz, l'adresse joue la carte de cosmétiques, parfumerie, épicerie, beauté et hygiène avec personnalité.",
      "Natus Marrakech propose une large gamme de soins naturels formulés à partir d'un ingrédient phare : l'Huile d'Argan. Riche en antioxydants, vitamines, minéraux et acides gras essentiels, elle offre des bienfaits exceptionnels : hydratation intense, nutrition profonde, revitalisation et action anti-âge. Fondée il y a 15 ans par Taouba Meqqadmi (ingénieure chimiste), la marque est N°1 de la cosmétique naturelle au Maroc. Gammes : visage, corps, cheveux, hammam, parfums, ambiance, hommes, enfants, solaire et gourmet. La Marque Natus Marrakech voit le jour pour la première fois il y a un peu plus de dix ans à Marrakech, au Maroc.",
      "« Merveilleuses senteurs orientales qui me rappellent un voyage coloré au Maroc. Cela vaut la peine d'essayer les gels douche, lotions, huiles corporelles - des arômes persistants et coûteux comme dans un bon spa marocain. », résume Krystyna I.",
    ],
  },
  {
    id: "21a66bd1-7a83-43e0-a198-11d1e0769b9f",
    pretitle: "Marrakech — Medina",
    title: "Natus Marrakech Medina Mall — le cadeau du terroir marocain à glisser dans la valise",
    hours: "Ouvert tous les jours, 10:00–21:00.",
    paragraphs: [
      "Magasin dans la médina de la marque n°1 de la cosmétique naturelle au Maroc. Soins à l'Huile d'Argan. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de cosmétiques, parfumerie, beauté et hygiène, épicerie avec personnalité.",
      "Natus Marrakech propose une large gamme de soins naturels formulés à partir d'un ingrédient phare : l'Huile d'Argan. Riche en antioxydants, vitamines, minéraux et acides gras essentiels, elle offre des bienfaits exceptionnels : hydratation intense, nutrition profonde, revitalisation et action anti-âge. Fondée il y a 15 ans par Taouba Meqqadmi (ingénieure chimiste), la marque est N°1 de la cosmétique naturelle au Maroc. Gammes : visage, corps, cheveux, hammam, parfums, ambiance, hommes, enfants, solaire et gourmet. La Marque Natus Marrakech voit le jour pour la première fois il y a un peu plus de dix ans à Marrakech, au Maroc.",
      "« Produits locaux incroyables, j'adore ça, Shaima était tellement professionnelle, merci beaucoup 😍 », résume mariam mariam.",
    ],
  },
  {
    id: "8b993369-9532-43b9-87d5-9aaeb5892ce7",
    pretitle: "Marrakech — Gueliz",
    title: "Norya ayroN Gueliz — le cadeau qui se porte au poignet ou au cou",
    hours: "Ouvert 10:30–18:30 — fermé le dimanche",
    paragraphs: [
      "Des essentiels intemporels signés Norya ayroN — mode fluide et élégante, entre Marrakech et le monde. À Marrakech, dans le quartier de Gueliz, l'adresse joue la carte de mode, bijouterie avec personnalité.",
      "Norya ayroN est une griffe de mode marocaine fondée par la créatrice franco-algérienne Norya Nemiche, basée à Marrakech. La maison propose des abayas, gandouras, kimonos et pièces prêt-à-porter aux matières fluides et au design épuré, pensées pour être portées au quotidien. Les collections allient l'élégance intemporelle à l'héritage artisanal africain. Présente dans les plus grands hôtels (La Mamounia, Four Seasons Rabat) et dans des boutiques multimarques en Europe (Milan, Paris, Lyon, Ibiza, Corse), la marque s'exporte à l'international tout en restant ancrée dans son terreau marocain. Deux boutiques à Marrakech : Guéliz (17 Rue Tariq Bnou Ziad) Médina (32 Souk, Rte Sidi Abdelaziz).",
      "« Charmante boutique avec des robes encore plus charmantes, j'ai 3 robes Foukia et j'adore les porter. Chaque fois que je les porte, je reçois des compliments de parfaits inconnus ici à Amsterdam. Vous pouvez commander en… », résume Johanna Gilstrap.",
    ],
  },
  {
    id: "effa57d8-b030-4219-a98e-aca34cf1df41",
    pretitle: "Marrakech — Medina",
    title: "Norya ayroN Medina — le cadeau qui se porte au poignet ou au cou",
    hours: "Ouvert 10:30–18:00 — fermé le mardi",
    paragraphs: [
      "Des essentiels intemporels signés Norya ayroN — mode fluide et élégante, entre Marrakech et le monde. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de mode, bijouterie avec personnalité.",
      "Norya ayroN est une griffe de mode marocaine fondée par la créatrice franco-algérienne Norya Nemiche, basée à Marrakech. La maison propose des abayas, gandouras, kimonos et pièces prêt-à-porter aux matières fluides et au design épuré, pensées pour être portées au quotidien. Les collections allient l'élégance intemporelle à l'héritage artisanal africain. Présente dans les plus grands hôtels (La Mamounia, Four Seasons Rabat) et dans des boutiques multimarques en Europe (Milan, Paris, Lyon, Ibiza, Corse), la marque s'exporte à l'international tout en restant ancrée dans son terreau marocain. Deux boutiques à Marrakech : Guéliz (17 Rue Tariq Bnou Ziad) Médina (32 Souk, Rte Sidi Abdelaziz).",
      "« Nichée dans le restaurant époustouflant de style oasis, Le Jardin, se trouve la merveilleuse boutique remplie de caftans colorés en édition limitée, de modèles 'pour tout le monde' créés avec passion par Norya Ayron,… », résume Livia.",
    ],
  },
  {
    id: "9bb18653-33f6-44f3-87d5-030f14f39be1",
    pretitle: "Marrakech — Medina",
    title: "Patisserie Belkabir Medina — le cadeau gourmand à rapporter de Marrakech",
    hours: "Ouvert tous les jours, 09:00–22:30.",
    paragraphs: [
      "🌸 Plus de 100 ans et 4 générations 🍰 Première pâtisserie de la Médina À Marrakech, dans le quartier de Medina, l'adresse joue la carte de pâtisserie avec personnalité.",
      "« Nous avons eu une expérience des plus merveilleuses avec le monsieur qui vendait des sucreries — vraiment inoubliable. Sa gentillesse et son accueil chaleureux ont rendu le moment encore plus spécial. Non seulement le… », confie Geudo Bitacoras.",
    ],
  },
  {
    id: "e51c3176-742b-4cf2-a3d6-0d4674f2cf4a",
    pretitle: "Marrakech — Medina",
    title: "Patisserie Corne de Gazelle Chez Brahim — le cadeau gourmand à rapporter de Marrakech",
    hours: "Ouvert tous les jours, 09:00–22:00.",
    paragraphs: [
      "Pâtisserie, Restaurant, Snack et Café. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de pâtisserie, café, street food, restaurant avec personnalité.",
      "« Nous avons découvert cette petite pâtisserie à Marrakech aujourd'hui, tenue par la merveilleuse Fatima — et honnêtement, ses pâtisseries étaient la meilleure chose que nous ayons mangée dans toute la ville. Elles se… », confie Weronika Urbańczyk.",
    ],
  },
  {
    id: "6937b23b-96c5-4241-bb10-187120ab9158",
    pretitle: "Marrakech — Medina",
    title: "Raqas — le cadeau cuir à porter au quotidien",
    hours: "Ouvert 09:00–19:00 — fermé le dimanche",
    paragraphs: [
      "Marque de mode et d'accessoires en commerce équitable créée par des artisans de Marrakech. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de mode, bagagerie, chaussures avec personnalité.",
      "« Qualité incroyable et motifs uniques réunis en un seul endroit pour hommes et femmes. J'ai acheté deux chemises d'été. Merveilleuse expérience d'achat. », résume John Tatum.",
    ],
  },
  {
    id: "8538b17a-2508-4a29-b235-efca3e0c783a",
    pretitle: "Marrakech — Gueliz",
    title: "Sook Paris — le cadeau qui se porte au poignet ou au cou",
    hours: "Ouvert tous les jours, 10:00–19:00.",
    paragraphs: [
      "Concept store à Guéliz — vêtements intemporels et accessoires mêlant style parisien et artisanat marocain. À Marrakech, dans le quartier de Gueliz, l'adresse joue la carte de mode, décoration, bagagerie, bijouterie avec personnalité.",
      "L’effervescence de Paris, l’authenticité de Marrakech… Après 15 années passés dans la publicité et l’événementiel, nous avons trouvé notre équilibre dans la ville rose. En 2019, nous y avons ouvert notre boutique, un espace où nos inspirations prennent vie. Nos collections sont un mélange de style parisien et d’artisanat marocain, profondément influencé par la générosité et par les teintes de Marrakech, nous créons des vêtements intemporels, confortables et élégants, conçus avant tout pour vous faire rayonner. Nous privilégions les matières nobles et une production locale, car nous sommes convaincus que la mode peut être à la fois belle, raisonnable et respectueuse.",
      "« Je suis tombé sur ce magasin par hasard. Tellement de belles choses et uniques par rapport à ce que j'avais vu dans d'autres magasins et marchés. J'ai acheté un porte-clés et leur t-shirt unisexe \"Marrakech Mon Amour\".… », résume Bronte C.",
    ],
  },
  {
    id: "4e19dfb4-3a68-44ed-9476-f8d733aa90cc",
    pretitle: "Marrakech — Medina",
    title: "Tamegroute Pottery — le cadeau artisanal directement sorti de l'atelier",
    hours: "Ouvert tous les jours, 10:00–19:30.",
    paragraphs: [
      "Poterie spécialisé dans la céramique traditionnelle verte de Tamegroute, dans la vallée du Draa. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de décoration avec personnalité.",
      "Tamegroute Pottery est un atelier de poterie spécialisé dans la céramique traditionnelle verte de Tamegroute, dans la vallée du Draa. Cet artisanat ancestral, transmis de père en fils, produit le seul émail vert du Maroc, hérité de la tradition de Fès mais caractérisé par sa couleur hétérogène unique. Les potiers travaillent l'argile de la vallée du Draa selon des méthodes artisanales, de la matière brute jusqu'à la fabrication des objets : chandeliers, vases, bols et objets décoratifs. L'enseigne dispose également d'un showroom à Marrakech.",
      "« Céramiques de première qualité. Tout est fait à la main et super unique. Nous avons rencontré les fabricants de poterie et appris comment elle est fabriquée dans le désert », résume Sabrina Beraja.",
    ],
  },
  {
    id: "066d94c7-ed3a-4306-bfbf-abd3a208df7f",
    pretitle: "Marrakech — Medina",
    title: "Terra Mano — le cadeau artisanal directement sorti de l'atelier",
    hours: "Ouvert tous les jours, 10:00–21:00.",
    paragraphs: [
      "Céramiques et poteries artisanales, où chaque pièce raconte une histoire unique ✨ À Marrakech, dans le quartier de Medina, l'adresse joue la carte de décoration avec personnalité.",
      "« Quelle belle visite dans ce magasin. Miriam a été d'une grande aide et a expliqué les différents articles en argile rouge et en argile blanche. Nous avons acheté un brûle-parfum, des tasses à thé et un magnifique vase.… », résume Heather Phipps.",
    ],
  },
  {
    id: "38326de6-83a1-438e-884c-c655cf781371",
    pretitle: "Marrakech — Medina",
    title: "We'are Concept Store — le cadeau qui se respire",
    hours: "Ouvert tous les jours, 09:30–19:00.",
    paragraphs: [
      "🧑‍🎨 Marque de mode marocaine (créateurs, artisans, décoration…) 🇲🇦 Fabriqué à la main au Maroc. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de mode, décoration, bagagerie, chaussures, galeries d'art, opticien, parfumerie avec personnalité.",
      "« J'adore l'endroit. Le personnel est très poli et sympathique, je le recommande absolument si vous voulez visiter. », résume Sami Aït Fares.",
    ],
  },
  {
    id: "2aae5cdc-0c6c-4a42-a526-f2d89279adb4",
    pretitle: "Marrakech — Medina",
    title: "Yasalam Medina — le cadeau qui habille la maison au retour",
    hours: "Ouvert 10:00–19:00 — fermé le dimanche",
    paragraphs: [
      "Boutique d'affiches qui œuvre pour rendre l'art accessible à tous. À Marrakech, dans le quartier de Medina, l'adresse joue la carte de galeries d'art, décoration avec personnalité.",
      "YASALAM réunit une équipe passionnée d'artistes arabes et numériques. Forts d'un sens aigu de la créativité et d'une profonde connaissance de la richesse culturelle de la région, nous concevons, imaginons et réalisons des projets artistiques sur mesure. Nos relations privilégiées avec des artistes du monde arabe nous permettent de mettre en lumière leurs talents et de donner vie à leurs visions. Fondée à Marrakech en 2024 par Oussama Laftimi et Abdellah Aboulhamid, tous deux issus des milieux artistiques et entrepreneuriaux, YASALAM s'appuie sur une équipe pluridisciplinaire qui œuvre pour rendre l'art accessible à tous, quel que soit le budget.",
      "« Charmante boutique avec des impressions et des cartes postales uniques réalisées par des artistes locaux. La femme qui tenait la boutique était exceptionnellement gentille et nous a même proposé un arrangement… », résume Ella Stratman.",
    ],
  },
  {
    id: "62375ede-df15-430e-a36a-0e8ea6892069",
    pretitle: "Marrakech — Gueliz",
    title: "Yasalam Store — le cadeau qui habille la maison au retour",
    hours: "Ouvert 10:00–19:00 — fermé le dimanche",
    paragraphs: [
      "YASALAM s'appuie sur une équipe pluridisciplinaire qui œuvre pour rendre l'art accessible à tous. À Marrakech, dans le quartier de Gueliz, l'adresse joue la carte de galeries d'art, décoration avec personnalité.",
      "YASALAM réunit une équipe passionnée d'artistes arabes et numériques. Forts d'un sens aigu de la créativité et d'une profonde connaissance de la richesse culturelle de la région, nous concevons, imaginons et réalisons des projets artistiques sur mesure. Nos relations privilégiées avec des artistes du monde arabe nous permettent de mettre en lumière leurs talents et de donner vie à leurs visions. Fondée à Marrakech en 2024 par Oussama Laftimi et Abdellah Aboulhamid, tous deux issus des milieux artistiques et entrepreneuriaux, YASALAM s'appuie sur une équipe pluridisciplinaire qui œuvre pour rendre l'art accessible à tous, quel que soit le budget.",
      "« Super boutique avec de belles œuvres d'art. Service aimable et serviable. Nous avons acheté des articles qui pouvaient être expédiés en Australie à des prix raisonnables. », résume Victoria Weaver.",
    ],
  },
];

const IdeeCadeauMarrakech = () => (
  <BlogArticleTemplate
    entries={IDEES_CADEAUX}
    articlePath="/blog/idee-cadeau-marrakech"
    articleTitle="Trouver une bonne idée cadeau à Marrakech"
    articleDescription="Notre sélection de 47 adresses à Marrakech pour rapporter un cadeau qui a du sens — toutes repérées parce qu'une de leurs vidéos figure dans la sélection « Idée Cadeau »."
    bookmarkSlug="idee-cadeau-marrakech"
    heroAlt="Idées cadeaux à Marrakech"
    heroTitleTop="Trouver une bonne idée cadeau"
    heroTitleBottom="à Marrakech"
    heroSubtitle="Notre sélection de 47 adresses à Marrakech, du palais historique au showroom de créateur, pour rapporter un cadeau qui a du sens."
    intro="Trouver le bon cadeau à Marrakech, c'est facile en apparence — les souks débordent — mais terriblement difficile en pratique : entre les imitations, les prix flottants et les milliers d'échoppes, on finit souvent par rapporter un objet qu'on n'aime déjà plus à l'aéroport. Voici les adresses qui jouent dans une autre catégorie, sélectionnées par notre équipe parce qu'au moins une de leurs vidéos est explicitement consacrée à l'idée cadeau. Boutiques de palais, ateliers d'artisans, concept stores contemporains, pâtissiers, parfumeurs et créateurs de mode : voici nos pistes préférées pour repartir de Marrakech avec un présent qu'on est fier d'offrir."
    datePublished="2026-06-22T08:00:00+01:00"
    dateModified="2026-06-22T08:00:00+01:00"
  />
);

export default IdeeCadeauMarrakech;