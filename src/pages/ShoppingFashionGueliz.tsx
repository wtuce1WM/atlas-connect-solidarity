import BlogArticleTemplate, { type BlogArticleEntry } from "@/components/blog/BlogArticleTemplate";

// Texte immersif rédigé à partir des hooks, descriptions et horaires de chaque fiche.
const BOUTIQUES: BlogArticleEntry[] = [
  {
    id: "7924a190-679d-4981-a12a-b56c257cd680",
    pretitle: "Guéliz, Marrakech",
    title: "Lacoste Carre Eden — une adresse mode à Guéliz",
    hours: "du lundi au dimanche : 10:00 – 21:00",
    paragraphs: [
      "À Guéliz, Lacoste Carre Eden se reconnaît à sa signature : « Chaîne connue pour ses polos proposant des vêtements, accessoires, articles en cuir et tenues de sport. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "On vient ici pour ce mélange singulier qui fait l'identité mode de Marrakech : un sens du détail hérité de l'artisanat, des coupes pensées pour la lumière du Sud, et l'accueil chaleureux qu'on attend d'une vraie boutique de quartier. Une halte à intégrer à son parcours shopping à Guéliz.",
      "Horaires d'ouverture : du lundi au dimanche : 10:00 – 21:00.",
    ],
  },
  {
    id: "83d7e07e-128c-47a3-92c6-225a53e34b42",
    pretitle: "Guéliz, Marrakech",
    title: "33 rue Majorelle — une adresse mode à Guéliz",
    hours: "du lundi au dimanche : 09:00 – 19:00",
    paragraphs: [
      "À Guéliz, 33 rue Majorelle se reconnaît à sa signature : « Un nouveau concept de magasin à Marrakech pour la mode marocaine contemporaine et des articles pour la maison. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "Pour les mordus de shopping ou tout simplement les curieux, le 33 rue Majorelle est un incontournable. Ce concept-store regroupe plus d'une centaine de créateurs sur 2 étages, pour la plupart marocains. Ce lieu chic et design présente un portrait de la mode au Maroc plutôt original entre bijoux, mobiliers, tapis, accessoires, produits de soins, vêtements de créateurs... Une adresse facilement repérable face aux Jardins Majorelle, à découvrir absolument. Les collections et les stocks sont renouvelés régulièrement. La mode a désormais un chiffre fétiche, dites 33 ! Occupant 220 m² sur deux étages en face du Jardin Majorelle, le 33 rue Majorelle, est un concept de magasin à Marrakech qui vend d…",
      "Horaires d'ouverture : du lundi au dimanche : 09:00 – 19:00.",
    ],
  },
  {
    id: "9799f930-a2bf-439a-9100-30d04fd7783e",
    pretitle: "Guéliz, Marrakech",
    title: "33 rue Majorelle eShop — une adresse mode à Guéliz",
    hours: "du lundi au dimanche : 09:00 – 19:00",
    paragraphs: [
      "À Guéliz, 33 rue Majorelle eShop se reconnaît à sa signature : « Mode marocaine contemporaine & articles pour la maison. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "Quels sont les frais de livraison ? Selon le poids et le pays d’expédition de votre commande, les tarifs des livraisons varient. Ceux-ci sont calculés automatiquement lors du passage en caisse selon le contenu de votre panier d’achat. Les différents tarifs d’envois disponibles pour votre destination vous seront proposés. Vous aurez la possibilité de choisir celui qui vous convient le mieux. Toute commande passée du lundi au samedi sera expédiée au maximum dans les 48 heures après validation du paiement. Vous pouvez suivre votre « colis », dans votre espace client dès que votre commande est remise au transporteur. Votre numéro de colis vous sera aussi envoyé à l'adresse mail donnée lors de vo…",
      "Horaires d'ouverture : du lundi au dimanche : 09:00 – 19:00.",
    ],
  },
  {
    id: "6d6e122e-309f-4280-a5f2-c04857b51bf1",
    pretitle: "Guéliz, Marrakech",
    title: "André Le Chapelier — une adresse mode à Guéliz",
    hours: "du lundi au samedi : 10:30 – 19:00 · dimanche : fermé",
    paragraphs: [
      "À Guéliz, André Le Chapelier se reconnaît à sa signature : « Chapellerie artisanale d'exception à Guéliz — chapeaux fabriqués à la main en matières nobles. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "André Le Chapelier est une maison de chapellerie artisanale fondée à Marrakech par André, héritier d'une lignée de chapeliers français installé dans la ville ocre depuis les années 2000. L'atelier-boutique, situé dans l'immeuble Jaccard à Guéliz, conçoit et fabrique à la main des chapeaux d'exception mêlant savoir-faire européen traditionnel et esthétique contemporaine. Les créations sont réalisées en matières nobles — feutre de laine, velours, cachemire, paille — avec un souci de durabilité et d'élégance intemporelle. La boutique propose des collections été et hiver, du sur-mesure, ainsi qu'un univers complet autour du chapeau. “Chaque chapeau encadre un visage et révèle un récit. Bien plus…",
      "Horaires d'ouverture : du lundi au samedi : 10:30 – 19:00 · dimanche : fermé.",
    ],
  },
  {
    id: "2fc2565b-6271-4a15-948f-a330ec1dfdbf",
    pretitle: "Guéliz, Marrakech",
    title: "Atelier Musk Tissus et Couture — une adresse mode à Guéliz",
    hours: "du lundi au samedi : 08:30 – 18:30 · dimanche : fermé",
    paragraphs: [
      "À Guéliz, Atelier Musk Tissus et Couture se reconnaît à sa signature : « 𝗠𝗼𝗿𝗼𝗰𝗰𝗮𝗻 𝗛𝗮𝗻𝗱𝗺𝗮𝗱𝗲 𝗙𝗮𝘀𝗵𝗶𝗼𝗻 𝗕𝗿𝗮𝗻𝗱 🇲🇦 ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "On vient ici pour ce mélange singulier qui fait l'identité mode de Marrakech : un sens du détail hérité de l'artisanat, des coupes pensées pour la lumière du Sud, et l'accueil chaleureux qu'on attend d'une vraie boutique de quartier. Une halte à intégrer à son parcours shopping à Guéliz.",
      "Horaires d'ouverture : du lundi au samedi : 08:30 – 18:30 · dimanche : fermé.",
    ],
  },
  {
    id: "bf663fec-9c01-4fdf-8552-9efced14c2b2",
    pretitle: "Guéliz, Marrakech",
    title: "Gant Carre Eden — une adresse mode à Guéliz",
    hours: "du lundi au dimanche : 10:00 – 21:00",
    paragraphs: [
      "À Guéliz, Gant Carre Eden fait partie de ces boutiques mode qu'on repère vite quand on arpente le quartier — un nom qui revient dans les carnets d'adresses des amateurs de shopping marrakchi. Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "On vient ici pour ce mélange singulier qui fait l'identité mode de Marrakech : un sens du détail hérité de l'artisanat, des coupes pensées pour la lumière du Sud, et l'accueil chaleureux qu'on attend d'une vraie boutique de quartier. Une halte à intégrer à son parcours shopping à Guéliz.",
      "Horaires d'ouverture : du lundi au dimanche : 10:00 – 21:00.",
    ],
  },
  {
    id: "1fb71760-965d-4253-b267-1d05a8717734",
    pretitle: "Guéliz, Marrakech",
    title: "H&M — une adresse mode à Guéliz",
    hours: "Horaires non communiqués — privilégier un appel ou un message avant la visite.",
    paragraphs: [
      "À Guéliz, H&M fait partie de ces boutiques mode qu'on repère vite quand on arpente le quartier — un nom qui revient dans les carnets d'adresses des amateurs de shopping marrakchi. Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "Chaîne de magasins proposant des vêtements branchés, des maillots de bain, des accessoires et des chaussures.",
      "Horaires d'ouverture : Horaires non communiqués — privilégier un appel ou un message avant la visite..",
    ],
  },
  {
    id: "48bbda3a-1a4c-4ce1-832b-9b9337b8ab69",
    pretitle: "Guéliz, Marrakech",
    title: "Jnane Bleu Majorelle — une adresse mode à Guéliz",
    hours: "du lundi au dimanche : 09:00 – 19:00",
    paragraphs: [
      "À Guéliz, Jnane Bleu Majorelle se reconnaît à sa signature : « Un concept-store mode et artisanat contemporain à Marrakech. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "À deux pas du Jardin Majorelle et dans le quartier Guéliz, le concept-store Jnane Bleu Majorelle fait dialoguer création contemporaine et héritage marocain au sein de deux boutiques au style affirmé. C'est Moumen qui signe la vision élégante du concept-store : une sensibilité forgée dans la connaissance du savoir-faire local, portée par le goût du détail et le sens du design. Ici, les créations signatures puisent dans les traditions pour les réinterpréter avec un regard résolument moderne. Caftans aux coupes épurées, tuniques ou babouches revisitées, bijoux et accessoires… Chaque silhouette offre une lecture moderne du vestiaire marrakchi, sans rompre avec son héritage. Cette approche se pro…",
      "Horaires d'ouverture : du lundi au dimanche : 09:00 – 19:00.",
    ],
  },
  {
    id: "7d05266e-48b7-4452-9f08-510ab7471391",
    pretitle: "Guéliz, Marrakech",
    title: "La boutique du Jardin Majorelle — une adresse mode à Guéliz",
    hours: "du lundi au dimanche : 08:00 – 18:30",
    paragraphs: [
      "À Guéliz, La boutique du Jardin Majorelle fait partie de ces boutiques mode qu'on repère vite quand on arpente le quartier — un nom qui revient dans les carnets d'adresses des amateurs de shopping marrakchi. Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "Située au cœur du Jardin Majorelle, la Boutique s’inscrit dans le respect de la plus pure tradition du savoir-faire artisanal du Maroc, reflétant ainsi sa culture ancestrale, les influences amazighes et l’art islamique. Œuvres des meilleurs artisans marocains, les produits de la Boutique répondent aux plus hautes exigences de qualité des matériaux et de finition tout en privilégiant la noblesse du travail manuel. La Boutique rend également un hommage affirmé à Yves Saint Laurent par l’utilisation de la couleur et de motifs qu’il affectionnait : fleurs, serpent… La Boutique rend également un hommage affirmé à Yves Saint Laurent par l’utilisation de la couleur. Par ailleurs, la Boutique compte…",
      "Horaires d'ouverture : du lundi au dimanche : 08:00 – 18:30.",
    ],
  },
  {
    id: "6717dd5b-f755-467d-9cf9-84d63c172b57",
    pretitle: "Guéliz, Marrakech",
    title: "Lalla Marrakech — une adresse mode à Guéliz",
    hours: "du lundi au samedi : 10:00 – 17:00 · dimanche : fermé",
    paragraphs: [
      "À Guéliz, Lalla Marrakech fait partie de ces boutiques mode qu'on repère vite quand on arpente le quartier — un nom qui revient dans les carnets d'adresses des amateurs de shopping marrakchi. Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "La boutique de la créatrice Laetitia Trouillet est un véritable écrin de couleurs et de textures, un sanctuaire dédié à l'artisanat marocain. La créatrice parisienne travaille le cuir souple, le daim orné de pompons et les tissus aux couleurs chatoyantes pour créer des cabas, des pochettes et des sacs bandoulière aux lignes sculpturales. Chaque pièce, à la fois bohème et raffinée, est le genre de sac que l'on emporte partout, pour un déjeuner au Jardin Majorelle ou un week-end à Ibiza.",
      "Horaires d'ouverture : du lundi au samedi : 10:00 – 17:00 · dimanche : fermé.",
    ],
  },
  {
    id: "5023a77b-f92f-4869-baec-91919b2b6da7",
    pretitle: "Guéliz, Marrakech",
    title: "Les Marrisiennes — une adresse mode à Guéliz",
    hours: "du lundi au samedi : 10:30 – 19:30 · dimanche : fermé",
    paragraphs: [
      "À Guéliz, Les Marrisiennes se reconnaît à sa signature : « Vêtements et accessoires éthiques. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "On vient ici pour ce mélange singulier qui fait l'identité mode de Marrakech : un sens du détail hérité de l'artisanat, des coupes pensées pour la lumière du Sud, et l'accueil chaleureux qu'on attend d'une vraie boutique de quartier. Une halte à intégrer à son parcours shopping à Guéliz.",
      "Horaires d'ouverture : du lundi au samedi : 10:30 – 19:30 · dimanche : fermé.",
    ],
  },
  {
    id: "e0ba1306-7731-415c-8731-4168c5b263c8",
    pretitle: "Guéliz, Marrakech",
    title: "Maison ARTC — une adresse mode à Guéliz",
    hours: "du lundi au vendredi : 10:00 – 18:00 · du samedi au dimanche : fermé",
    paragraphs: [
      "À Guéliz, Maison ARTC se reconnaît à sa signature : « Une maison de couture culturelle aux pièces uniques. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "Dans une société qui tire profit de vos doutes, s'aimer soi-même est un acte de rébellion. — Caroline Caldwell Située à Marrakech, la Maison ARTC est une maison culturelle qui crée des pièces uniques et réalise des photographies. Durabilité, excellence artisanale et individualité sont au cœur de sa démarche, avec des vêtements entièrement faits main. Les valeurs et la créativité de la marque puisent leur inspiration dans l'héritage, la culture, l'individualité et l'authenticité. À propos du créateur Artsi Ifrach est un artiste marocain dont le travail englobe la création de mode, la photographie et le stylisme. Fondateur et directeur artistique de Maison ARTC, il est reconnu pour ses créatio…",
      "Horaires d'ouverture : du lundi au vendredi : 10:00 – 18:00 · du samedi au dimanche : fermé.",
    ],
  },
  {
    id: "17eed0b1-9bac-48bb-a09f-c61ffa484a07",
    pretitle: "Guéliz, Marrakech",
    title: "Marie Bastide Marrakech — une adresse mode à Guéliz",
    hours: "du lundi au samedi : 10:00 – 19:00 · dimanche : fermé",
    paragraphs: [
      "À Guéliz, Marie Bastide Marrakech se reconnaît à sa signature : « Boutique d'art et d'artisanat marocain d'exception à Guéliz. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "Depuis sa création en 2018, Marie Bastide Marrakech incarne la beauté et l'artisanat du Maroc à travers ses produits. Fière de ses racines marocaines, la marque s'engage à offrir des articles 100% locaux, reflétant l'authenticité et la richesse de la culture marocaine. Studio de design et boutique d'art à Guéliz proposant des créations originales inspirées du Maroc : photographies artistiques, illustrations, objets artisanaux, foulards en soie, bougies naturelles, arts de la table, papeterie et décoration. Entreprise familiale, indépendante et engagée dans la préservation de la production locale. LIVRAISON INTERNATIONALE Nous proposons la livraison dans le monde entier. Frais calculés automa…",
      "Horaires d'ouverture : du lundi au samedi : 10:00 – 19:00 · dimanche : fermé.",
    ],
  },
  {
    id: "9862c23c-7d94-4823-a694-3c7f36a98df2",
    pretitle: "Guéliz, Marrakech",
    title: "Marrakech Typic Store — une adresse mode à Guéliz",
    hours: "du lundi au samedi : 10:00 – 19:00 · dimanche : fermé",
    paragraphs: [
      "À Guéliz, Marrakech Typic Store se reconnaît à sa signature : « Créatrice de Mode féminine de pièces uniques avec une touche marocaine. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "Nous avons fondé Marrakech Typic Store avec un objectif : créer une boutique en ligne fiable, sans complications et de qualité. Notre passion pour l'excellente a toujours été et restera notre moteur. Nous savons que chaque produit compte et nous mettons tout en œuvre pour rendre votre expérience d'achat aussi agréable que possible. Voyez par vous-même !",
      "Horaires d'ouverture : du lundi au samedi : 10:00 – 19:00 · dimanche : fermé.",
    ],
  },
  {
    id: "f675535d-72f1-46dc-a45a-007a4691539a",
    pretitle: "Guéliz, Marrakech",
    title: "Moro Boutique — une adresse mode à Guéliz",
    hours: "du lundi au dimanche : 10:00 – 19:00",
    paragraphs: [
      "À Guéliz, Moro Boutique fait partie de ces boutiques mode qu'on repère vite quand on arpente le quartier — un nom qui revient dans les carnets d'adresses des amateurs de shopping marrakchi. Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "MORO Marrakech réunit une grande variété d'entreprises créatives : un studio de design gérant de nombreux ateliers avec des artisans locaux, un boutique-hôtel avec restaurant et une boutique proposant des expériences de shopping originales et immersives. Nous nous efforçons d'offrir à nos précieux clients une expérience d'achat unique, alliant l'essence de la tradition marocaine à la modernité. Dans notre établissement, nos clients ont l'opportunité de découvrir la richesse et la diversité de l'artisanat marocain, grâce à des échanges enrichissants avec nos propriétaires passionnés qui collaborent étroitement avec un large éventail d'artisans marocains. Vêtements MORO présente une ligne de v…",
      "Horaires d'ouverture : du lundi au dimanche : 10:00 – 19:00.",
    ],
  },
  {
    id: "f65e6afc-de2a-47b8-abce-23915b0cd15e",
    pretitle: "Guéliz, Marrakech",
    title: "Negafa La Maison Hora — une adresse mode à Guéliz",
    hours: "du lundi au dimanche : 09:00 – 22:00",
    paragraphs: [
      "À Guéliz, Negafa La Maison Hora se reconnaît à sa signature : « ⚜️ Organisation de mariage ⚜️ Vente et Location de caftans ⚜️ ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "On vient ici pour ce mélange singulier qui fait l'identité mode de Marrakech : un sens du détail hérité de l'artisanat, des coupes pensées pour la lumière du Sud, et l'accueil chaleureux qu'on attend d'une vraie boutique de quartier. Une halte à intégrer à son parcours shopping à Guéliz.",
      "Horaires d'ouverture : du lundi au dimanche : 09:00 – 22:00.",
    ],
  },
  {
    id: "8b993369-9532-43b9-87d5-9aaeb5892ce7",
    pretitle: "Guéliz, Marrakech",
    title: "Norya ayroN Gueliz — une adresse mode à Guéliz",
    hours: "du lundi au samedi : 10:30 – 18:30 · dimanche : fermé",
    paragraphs: [
      "À Guéliz, Norya ayroN Gueliz se reconnaît à sa signature : « Des essentiels intemporels signés Norya ayroN — mode fluide et élégante, entre Marrakech et le monde. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "Norya ayroN est une griffe de mode marocaine fondée par la créatrice franco-algérienne Norya Nemiche, basée à Marrakech. La maison propose des abayas, gandouras, kimonos et pièces prêt-à-porter aux matières fluides et au design épuré, pensées pour être portées au quotidien. Les collections allient l'élégance intemporelle à l'héritage artisanal africain. Présente dans les plus grands hôtels (La Mamounia, Four Seasons Rabat) et dans des boutiques multimarques en Europe (Milan, Paris, Lyon, Ibiza, Corse), la marque s'exporte à l'international tout en restant ancrée dans son terreau marocain. Deux boutiques à Marrakech : Guéliz (17 Rue Tariq Bnou Ziad) Médina (32 Souk, Rte Sidi Abdelaziz). L'his…",
      "Horaires d'ouverture : du lundi au samedi : 10:30 – 18:30 · dimanche : fermé.",
    ],
  },
  {
    id: "effa57d8-b030-4219-a98e-aca34cf1df41",
    pretitle: "Guéliz, Marrakech",
    title: "Norya ayroN Medina — une adresse mode à Guéliz",
    hours: "lundi : 10:30 – 18:00 · mardi : fermé · du mercredi au dimanche : 10:30 – 18:00",
    paragraphs: [
      "À Guéliz, Norya ayroN Medina se reconnaît à sa signature : « Des essentiels intemporels signés Norya ayroN — mode fluide et élégante, entre Marrakech et le monde. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "Norya ayroN est une griffe de mode marocaine fondée par la créatrice franco-algérienne Norya Nemiche, basée à Marrakech. La maison propose des abayas, gandouras, kimonos et pièces prêt-à-porter aux matières fluides et au design épuré, pensées pour être portées au quotidien. Les collections allient l'élégance intemporelle à l'héritage artisanal africain. Présente dans les plus grands hôtels (La Mamounia, Four Seasons Rabat) et dans des boutiques multimarques en Europe (Milan, Paris, Lyon, Ibiza, Corse), la marque s'exporte à l'international tout en restant ancrée dans son terreau marocain. Deux boutiques à Marrakech : Guéliz (17 Rue Tariq Bnou Ziad) Médina (32 Souk, Rte Sidi Abdelaziz). L'his…",
      "Horaires d'ouverture : lundi : 10:30 – 18:00 · mardi : fermé · du mercredi au dimanche : 10:30 – 18:00.",
    ],
  },
  {
    id: "e6f84990-c9d0-4117-9645-b93db40158e6",
    pretitle: "Guéliz, Marrakech",
    title: "Rkia Aït Blal Haute Couture — une adresse mode à Guéliz",
    hours: "du lundi au samedi : 10:00 – 13:00 puis 15:00 – 19:00 · dimanche : fermé",
    paragraphs: [
      "À Guéliz, Rkia Aït Blal Haute Couture se reconnaît à sa signature : « Un subtil mélange de robes occidentales d’époque et du caftan traditionnel marocain. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "Rkia Aït Blal, créatrice de mode… Rkia Aït Blal, créatrice de mode, a réussi à sublimer sa double culture (franco-marocaine) dans le caftan, joyau de la couture traditionnelle marocaine. Née à Ouarzazate, elle rejoint la France à l’âge de 6 ans. Très jeune, elle cultive ses talents de dessin et sa passion pour la couture. Après des études supérieures en Economie et Droit , elle reviendra très vite à ses premiers amours. En 1998, elle suivra une formation en arts plastiques à Paris, pour ensuite se spécialiser grâce à une formation de stylisme et modélisme au Maroc En 2003, elle lance sa première collection de caftans puis ouvre son atelier dans son pays natal, ainsi qu’un showroom à Paris. D…",
      "Horaires d'ouverture : du lundi au samedi : 10:00 – 13:00 puis 15:00 – 19:00 · dimanche : fermé.",
    ],
  },
  {
    id: "d8e6cda1-7a8c-4409-ba79-eb5facb6adbc",
    pretitle: "Guéliz, Marrakech",
    title: "Sidi Tailoring — une adresse mode à Guéliz",
    hours: "du lundi au samedi : 09:00 – 13:00 puis 14:00 – 19:00 · dimanche : fermé",
    paragraphs: [
      "À Guéliz, Sidi Tailoring se reconnaît à sa signature : « Le temple de la mode pour l’Homme, avec un espace de plus de 250 m2 en plein cœur de Marrakech. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "La maison Sidi Tailoring a été créée en octobre 2013 parChakir Belhaloumi, homme d’affaires et designer belgo-marocain. Après avoir travaillé avec plusieurs marques de haute couture à Bruxelles, il a décidé en 2012 de s’établir à Marrakech, pour faire de la ville ocre un centre africain de la haute couture. Sidi tailoring est le temple de la mode pour l’Homme, avec un espace de plus de 250 m2 en plein cœur de Marrakech, Sidi tailoring propose une large gamme de vêtements (costumes, chemises, vestes, manteaux, pantalons,...) et accessoires (cravates, écharpes, nœuds papillon, pochettes, ceintures,...) pour répondre à tous les styles. Au rez-de-chaussée, dans une ambiance feutrée, vous trouve…",
      "Horaires d'ouverture : du lundi au samedi : 09:00 – 13:00 puis 14:00 – 19:00 · dimanche : fermé.",
    ],
  },
  {
    id: "8538b17a-2508-4a29-b235-efca3e0c783a",
    pretitle: "Guéliz, Marrakech",
    title: "Sook Paris — une adresse mode à Guéliz",
    hours: "du lundi au dimanche : 10:00 – 19:00",
    paragraphs: [
      "À Guéliz, Sook Paris se reconnaît à sa signature : « Concept store à Guéliz — vêtements intemporels et accessoires mêlant style parisien et artisanat marocain. ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "L’effervescence de Paris, l’authenticité de Marrakech… Après 15 années passés dans la publicité et l’événementiel, nous avons trouvé notre équilibre dans la ville rose. En 2019, nous y avons ouvert notre boutique, un espace où nos inspirations prennent vie. Nos collections sont un mélange de style parisien et d’artisanat marocain, profondément influencé par la générosité et par les teintes de Marrakech, nous créons des vêtements intemporels, confortables et élégants, conçus avant tout pour vous faire rayonner. Nous privilégions les matières nobles et une production locale, car nous sommes convaincus que la mode peut être à la fois belle, raisonnable et respectueuse. Claire et Jonathan Maroua…",
      "Horaires d'ouverture : du lundi au dimanche : 10:00 – 19:00.",
    ],
  },
  {
    id: "763e1962-95da-4e25-b8a7-f02610f1200f",
    pretitle: "Guéliz, Marrakech",
    title: "Vévé Design Marrakech — une adresse mode à Guéliz",
    hours: "du lundi au samedi : 09:00 – 15:00 · dimanche : fermé",
    paragraphs: [
      "À Guéliz, Vévé Design Marrakech fait partie de ces boutiques mode qu'on repère vite quand on arpente le quartier — un nom qui revient dans les carnets d'adresses des amateurs de shopping marrakchi. Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "À propos de Veve Je me considère comme une battante et une grande rêveuse… une personne qui ne baisse jamais les bras face aux difficultés de la vie et qui persévère dans ses objectifs… passionnée et optimiste. Ma collection de vêtements et d’accessoires me ressemble, elle reflète mon exubérance, l’optimisme et la passion que j’insuffle à tout ce que je fais. J’adore mélanger les couleurs et les formes et, depuis mon enfance, j’ai toujours été passionnée par les accessoires, mais aussi par les vêtements en général. J’ai toujours aimé personnaliser les vêtements, en y ajoutant des détails précieux ou colorés, des franges, des clous, des broderies, des strass et des paillettes. Après avoir exe…",
      "Horaires d'ouverture : du lundi au samedi : 09:00 – 15:00 · dimanche : fermé.",
    ],
  },
  {
    id: "fbb0405d-a9c8-4c6b-870b-a0d8406b1dc0",
    pretitle: "Guéliz, Marrakech",
    title: "ZARA Marrakech — une adresse mode à Guéliz",
    hours: "du lundi au dimanche : 10:00 – 22:00",
    paragraphs: [
      "À Guéliz, ZARA Marrakech se reconnaît à sa signature : « Mode tendance à Marrakech 👗✨ : découvrez ZARA entre collections iconiques et style urbain international ! ». Le quartier Guéliz est devenu l'épicentre de la mode à Marrakech : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles se croisent à quelques rues les unes des autres. Cette boutique en fait partie, et mérite qu'on pousse sa porte.",
      "Présente au cœur de Marrakech, ZARA s’impose comme une référence incontournable pour les amateurs de mode contemporaine. Connue dans le monde entier pour ses collections inspirées des tendances internationales, la marque propose une expérience shopping moderne, accessible et toujours renouvelée. Les boutiques ZARA à Marrakech offrent un large choix de vêtements pour femmes, hommes et enfants, avec des collections régulièrement mises à jour. Chaque saison, la marque décline les dernières tendances vues sur les podiums en pièces prêtes à porter : robes élégantes, tailleurs structurés, basiques revisités, denim, accessoires et chaussures. Ce qui fait la force de ZARA, c’est sa capacité à propos…",
      "Horaires d'ouverture : du lundi au dimanche : 10:00 – 22:00.",
    ],
  },
];

const ShoppingFashionGueliz = () => (
  <BlogArticleTemplate
    entries={BOUTIQUES}
    articlePath="/blog/shopping-fashion-gueliz"
    articleTitle="Shopping fashion à Guéliz, Marrakech"
    articleDescription="Vingt-trois boutiques mode à Guéliz : créateurs marocains, concept-stores, marques internationales et adresses confidentielles dans l'épicentre fashion de Marrakech."
    bookmarkSlug="shopping-fashion-gueliz"
    heroAlt="Shopping fashion à Guéliz, Marrakech"
    heroTitleTop="Shopping fashion"
    heroTitleBottom="à Guéliz, Marrakech"
    heroSubtitle="Vingt-trois boutiques mode à Guéliz : créateurs marocains, concept-stores, marques internationales et adresses confidentielles dans l'épicentre fashion de Marrakech."
    intro="Guéliz, c'est le quartier où Marrakech se réinvente côté mode. À quelques rues de la médina, l'avenue Mohammed V, la rue de la Liberté et les abords du Jardin Majorelle concentrent une scène fashion d'une densité étonnante : créateurs marocains qui réinventent le caftan, concept-stores pointus, maisons de couture culturelles, marques internationales et adresses confidentielles connues des seuls initiés. Voici nos vingt-trois boutiques préférées pour faire le tour du shopping à Guéliz."
    datePublished="2026-06-13T08:00:00+01:00"
  />
);

export default ShoppingFashionGueliz;
