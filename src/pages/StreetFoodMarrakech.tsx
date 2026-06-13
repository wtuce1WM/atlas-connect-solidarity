import BlogArticleTemplate, { type BlogArticleEntry } from "@/components/blog/BlogArticleTemplate";

// Texte immersif rédigé à partir des descriptions, hooks et horaires de chaque fiche.
const STREETFOOD: BlogArticleEntry[] = [
{
    id: "6f48e2fa-bf01-4ce4-a51c-0e986ce17e18",
    pretitle: "Gueliz — Marrakech",
    title: "Asian Crousty — ⭐️Le Meilleur 💚Tasty Crousty💚 de Marrakech📍Thaïllement bon 🥢",
    hours: "Horaires : se renseigner sur la fiche.",
    paragraphs: [
      "À Gueliz, Asian Crousty se reconnaît à sa signature : « ⭐️Le Meilleur 💚Tasty Crousty💚 de Marrakech📍Thaïllement bon 🥢 ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Asian Crousty pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "76e172c1-17d1-4743-90f6-061c3d324213",
    pretitle: "Medina — Marrakech",
    title: "BlackChich — Un restaurant rooftop afro-berbère niché au cœur de la Médina de Marrakech.",
    hours: "Ouvert tous les jours, 12:00-22:00.",
    paragraphs: [
      "À Medina, BlackChich se reconnaît à sa signature : « Un restaurant rooftop afro-berbère niché au cœur de la Médina de Marrakech. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "Plus qu'un simple restaurant, BlackChich c'est une invitation à la découverte. Entrez dans un monde vibrant où les saveurs audacieuses, la fusion culturelle et la vue sur le toit terrasse s'unissent pour créer une découverte unique en plein cœur de Marrakech. BLACKCHICH Le restaurant BlackChich propose un délicieux mélange de saveurs berbères et africaines et offre un voyage culinaire unique au cœur de la vibrante médina de Marrakech. C'est ce mélange que nous appelons fusion.",
    ],
  },
  {
    id: "139f360c-ea0a-4091-82c4-6c8f0ebbf33c",
    pretitle: "Hay Al Massar — Marrakech",
    title: "Bocadillo Factory — une halte street food à découvrir",
    hours: "Ouvert tous les jours, 11:30-01:00.",
    paragraphs: [
      "À Hay Al Massar, Bocadillo Factory fait partie de ces enseignes qu'on repère vite quand on arpente la ville à la recherche d'un bon plan rapide. Une halte gourmande à intégrer à son parcours street food.",
      "On vient chez Bocadillo Factory pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "82efc81f-23e7-4840-8093-3cfea8c26602",
    pretitle: "Hivernage — Marrakech",
    title: "Bollywood Cafe — une halte street food à découvrir",
    hours: "Ouvert tous les jours, 10:00-23:00.",
    paragraphs: [
      "À Hivernage, Bollywood Cafe fait partie de ces enseignes qu'on repère vite quand on arpente la ville à la recherche d'un bon plan rapide. Une halte gourmande à intégrer à son parcours street food.",
      "On vient chez Bollywood Cafe pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "c78dbf30-251a-4a55-b1d4-b5036647782f",
    pretitle: "Medina — Marrakech",
    title: "Burger ‘n Shake Marrakech — Nous sommes les maîtres du burger.🍔 📍Marrakech, Jamaa el-Fna, à côté de la station Shell.🇲…",
    hours: "Ouvert tous les jours, 11:00-03:00.",
    paragraphs: [
      "À Medina, Burger ‘n Shake Marrakech se reconnaît à sa signature : « Nous sommes les maîtres du burger.🍔 📍Marrakech, Jamaa el-Fna, à côté de la station Shell.🇲🇦 ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Burger ‘n Shake Marrakech pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "022967ef-d83a-48fb-bf3b-4eb7d379a7e7",
    pretitle: "Hivernage — Marrakech",
    title: "Burger King Menara Mall — La maison du Whopper 🍔",
    hours: "Ouvert tous les jours, 11:00-01:00.",
    paragraphs: [
      "À Hivernage, Burger King Menara Mall se reconnaît à sa signature : « La maison du Whopper 🍔 ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Burger King Menara Mall pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "757d7147-8b65-4fcf-86c1-f4d39bce11a5",
    pretitle: "Gueliz — Marrakech",
    title: "Café Blue Ribbon Marrakech — Café et brunch farm-to-table depuis leur propre ferme en permaculture.",
    hours: "Horaires : lun. 09:00-21:00 · mar. 09:00-21:00 · mer. 09:00-21:00 · jeu. 09:00-21:00 · ven. 09:00-21:00 · sam. 09:00-21:00 · dim. 09:00-16:00.",
    paragraphs: [
      "À Gueliz, Café Blue Ribbon Marrakech se reconnaît à sa signature : « Café et brunch farm-to-table depuis leur propre ferme en permaculture. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "Café-boulangerie artisanale au cœur de Guéliz, Marrakech. Blue Ribbon propose une cuisine durable « farm-to-table » avec des ingrédients issus de leur propre ferme en permaculture (Sanctuary Slimane). Au menu : petits-déjeuners gourmands (bagels, granola bowls, french toast shokupan), salades de saison, sandwichs artisanaux, pâtisseries fraîches du jour (carrot cake, cookies, muffins, donuts) et café de spécialité 100% arabica. Ambiance chaleureuse et colorée avec auvent rayé bleu et blanc. Service sur place, à emporter et livraison. Issu de sources durables, fraîchement cuit et parfaitement brassé au cœur de Marrakech.",
    ],
  },
  {
    id: "34e172d1-ceef-4607-8a60-18e491954353",
    pretitle: "Marrakech",
    title: "Crep'K — une halte street food à découvrir",
    hours: "Ouvert tous les jours, 12:00-00:00.",
    paragraphs: [
      "Quelque part dans Marrakech, Crep'K fait partie de ces enseignes qu'on repère vite quand on arpente la ville à la recherche d'un bon plan rapide. Une halte gourmande à intégrer à son parcours street food.",
      "On vient chez Crep'K pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "cfd825db-2481-4294-be2d-55cf1c8264b5",
    pretitle: "Massira — Marrakech",
    title: "Dar lkfta Bsmen — Le spécialiste du kefta bsmen à Marrakech. Livraison disponible.",
    hours: "Ouvert tous les jours, 12:00-02:00.",
    paragraphs: [
      "À Massira, Dar lkfta Bsmen se reconnaît à sa signature : « Le spécialiste du kefta bsmen à Marrakech. Livraison disponible. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Dar lkfta Bsmen pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "ec5063ab-2c83-4cb3-b4b1-b0fd423bac87",
    pretitle: "Sidi Ghanem — Marrakech",
    title: "Date Shawarma — une halte street food à découvrir",
    hours: "Horaires : se renseigner sur la fiche.",
    paragraphs: [
      "À Sidi Ghanem, Date Shawarma fait partie de ces enseignes qu'on repère vite quand on arpente la ville à la recherche d'un bon plan rapide. Une halte gourmande à intégrer à son parcours street food.",
      "On vient chez Date Shawarma pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "fb5a87ee-4daf-4d67-91f5-d6758663ef83",
    pretitle: "Hay Al Massar — Marrakech",
    title: "El Madfouna El Filalia — La Madfouna Filalia, la pizza berbère, symbole de la cuisine traditionnelle et de l’authen…",
    hours: "Horaires : lun. 11:00-22:30 · mar. 11:00-22:30 · mer. 11:00-22:30 · jeu. 11:00-22:30 · ven. Fermé · sam. 11:00-22:30 · dim. 11:00-22:30.",
    paragraphs: [
      "À Hay Al Massar, El Madfouna El Filalia se reconnaît à sa signature : « La Madfouna Filalia, la pizza berbère, symbole de la cuisine traditionnelle et de l’authenticité marocaine. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez El Madfouna El Filalia pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "3e31def3-c4e6-4ecc-a59f-5acd0d934ce4",
    pretitle: "Gueliz — Marrakech",
    title: "Entrecôte Baguette Marrakech — Brasserie Urbaine 🥩 Entrecôte/Frites & sa sauce emblématique.",
    hours: "Ouvert tous les jours, 12:30-01:45.",
    paragraphs: [
      "À Gueliz, Entrecôte Baguette Marrakech se reconnaît à sa signature : « Brasserie Urbaine 🥩 Entrecôte/Frites & sa sauce emblématique. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Entrecôte Baguette Marrakech pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "95465066-8e46-4256-adff-fe41f25eee61",
    pretitle: "Medina — Marrakech",
    title: "Fluffy Café Restaurant  — 🍳 Délicieux petit-déjeuners 🥗 Plats savoureux et équilibrés 🍰 Gâteaux signature ☕ Ambiance…",
    hours: "Ouvert tous les jours, 10:00-23:00.",
    paragraphs: [
      "À Medina, Fluffy Café Restaurant  se reconnaît à sa signature : « 🍳 Délicieux petit-déjeuners 🥗 Plats savoureux et équilibrés 🍰 Gâteaux signature ☕ Ambiance chaleureuse et conviviale ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "Une adresse incontournable pour les amateurs de bonne cuisine (marocaine,international), ambiance chaleureuse. Situé dans un cadre moderne et confortable, notre restaurant propose une cuisine savoureuse qui mêle authenticité et créativité, préparée avec des ingrédients frais et soigneusement sélectionnés. Que vous veniez pour un brunch, un déjeuner, un dîner ou simplement pour passer un bon moment, notre équipe vous accueille avec le sourire et un service attentionné. Chez nous, chaque plat est pensé pour offrir une expérience gourmande et conviviale. Fluffy, une belle surprise qui vaut le détour.",
    ],
  },
  {
    id: "3e6b2d17-4f84-4572-a50b-9d47e8e75476",
    pretitle: "Medina — Marrakech",
    title: "Ftor Beldi Chez Abderrahmane — Une vraie pépite de la streetfood à tester si tu passes à Marrakech ✨",
    hours: "Ouvert tous les jours, 06:30-13:00.",
    paragraphs: [
      "À Medina, Ftor Beldi Chez Abderrahmane se reconnaît à sa signature : « Une vraie pépite de la streetfood à tester si tu passes à Marrakech ✨ ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Ftor Beldi Chez Abderrahmane pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "fc9d2c6f-2112-431f-ac2e-ab5d7796ed2c",
    pretitle: "Marrakech",
    title: "Green & Bnin — une halte street food à découvrir",
    hours: "Ouvert tous les jours, 12:30-02:00.",
    paragraphs: [
      "Quelque part dans Marrakech, Green & Bnin fait partie de ces enseignes qu'on repère vite quand on arpente la ville à la recherche d'un bon plan rapide. Une halte gourmande à intégrer à son parcours street food.",
      "Green&Bnin, cest la passion des bowls sains, gourmand et modernes. Nous croyons que manger sain peut etre délicieux et rapide. Rejoignez notre famaille et savourez le meilleur de la nature dans chaque plat.",
    ],
  },
  {
    id: "8ff0fcc6-742c-48ba-aa07-97d4884ede4f",
    pretitle: "Gueliz — Marrakech",
    title: "Ice Mama Gueliz — Des glaces maison, gourmandes et créées avec des produits frais, un incontournable pour le…",
    hours: "Horaires : lun. 11:30-21:00 · mar. 11:30-21:00 · mer. 11:30-21:00 · jeu. 11:30-21:00 · ven. 11:30-21:00 · sam. 11:30-21:00 · dim. Fermé.",
    paragraphs: [
      "À Gueliz, Ice Mama Gueliz se reconnaît à sa signature : « Des glaces maison, gourmandes et créées avec des produits frais, un incontournable pour les amateurs de bonnes glaces. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "Situé dans la galerie de la Liberté à laquelle on accède par la rue du même nom, Ice Mama est un glacier artisanal. Glaces ou sorbets variés, entremets individuels ou encore desserts gourmands, tout est fait maison et sans produits industriels ! Difficile de ne pas craquer, d’autant plus qu’on peut manger sa glace sur place ou bien l’emporter.",
    ],
  },
  {
    id: "cfdfd164-7a5b-475a-9790-2d39820cf5e7",
    pretitle: "Gueliz — Marrakech",
    title: "Ice Mama Medina — Des glaces maison, gourmandes et créées avec des produits frais, un incontournable pour le…",
    hours: "Horaires : lun. 09:00-21:00 · mar. Fermé · mer. 09:00-21:00 · jeu. 09:00-21:00 · ven. 09:00-21:00 · sam. 09:00-21:00 · dim. 09:00-21:00.",
    paragraphs: [
      "À Gueliz, Ice Mama Medina se reconnaît à sa signature : « Des glaces maison, gourmandes et créées avec des produits frais, un incontournable pour les amateurs de bonnes glaces. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "Situé dans la galerie de la Liberté à laquelle on accède par la rue du même nom, Ice Mama est un glacier artisanal. Glaces ou sorbets variés, entremets individuels ou encore desserts gourmands, tout est fait maison et sans produits industriels ! Difficile de ne pas craquer, d’autant plus qu’on peut manger sa glace sur place ou bien l’emporter.",
    ],
  },
  {
    id: "6b2c6834-aac4-4831-851b-ba9f513827e0",
    pretitle: "Gueliz — Marrakech",
    title: "Kech Burger — Burgers gurmets faits maison . Livraison à Marrakech. Desserts, sodas, smoothies & mocktai…",
    hours: "Ouvert tous les jours, 00:00-06:00 / 12:00-00:00.",
    paragraphs: [
      "À Gueliz, Kech Burger se reconnaît à sa signature : « Burgers gurmets faits maison . Livraison à Marrakech. Desserts, sodas, smoothies & mocktails. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "Restaurant de burgers gourmets faits maison à Marrakech avec service de livraison. Kech Burger propose des burgers artisanaux préparés avec des ingrédients frais et de qualité, des desserts maison (tiramisu, crème brûlée, moelleux au chocolat, mousse au chocolat), des smoothies vitaminés, des mocktails, des jus de fruits frais et des boissons. Livraison disponible dans les quartiers Guéliz, Semlalia, Daoudiate, Médina, Hivernage, Palmeraie et Mhamid (zone aéroport). Commande en ligne via le site web.",
    ],
  },
  {
    id: "390946fe-293b-4575-8041-7654cfd9e37a",
    pretitle: "Medina — Marrakech",
    title: "KFC Marrakech — Chaîne de restaurants connue pour ses buckets de poulet frit.",
    hours: "Ouvert tous les jours, 11:00-00:00.",
    paragraphs: [
      "À Medina, KFC Marrakech se reconnaît à sa signature : « Chaîne de restaurants connue pour ses buckets de poulet frit. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez KFC Marrakech pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "068633cd-55ce-4c3e-88be-92ded53b9c7d",
    pretitle: "Medina — Marrakech",
    title: "Krepchy — Une table cachée dans la Kasbah 🌿 Tajines raffinés, crêpes créatives, vibes marocaines 🕌",
    hours: "Ouvert tous les jours, 08:00-01:30.",
    paragraphs: [
      "À Medina, Krepchy se reconnaît à sa signature : « Une table cachée dans la Kasbah 🌿 Tajines raffinés, crêpes créatives, vibes marocaines 🕌 ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Krepchy pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "f8324186-0b51-46c7-aa93-13a382e1bc1c",
    pretitle: "Semlalia — Marrakech",
    title: "L'Atelier Merguez Véritable — une halte street food à découvrir",
    hours: "Ouvert tous les jours, 10:30-02:30.",
    paragraphs: [
      "À Semlalia, L'Atelier Merguez Véritable fait partie de ces enseignes qu'on repère vite quand on arpente la ville à la recherche d'un bon plan rapide. Une halte gourmande à intégrer à son parcours street food.",
      "On vient chez L'Atelier Merguez Véritable pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "f20c7c3f-c064-463e-826f-ce484adbadf2",
    pretitle: "Gueliz — Marrakech",
    title: "La Fantasia — Envie d'Italie à Marrakech ? La Fantasia, au cœur de Guéliz, vous régale avec ses délicieu…",
    hours: "Ouvert tous les jours, 12:00-21:45.",
    paragraphs: [
      "À Gueliz, La Fantasia se reconnaît à sa signature : « Envie d'Italie à Marrakech ? La Fantasia, au cœur de Guéliz, vous régale avec ses délicieuses pizzas et pâtes fraîches. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "Idéalement situé dans le quartier effervescent de Guéliz, le restaurant La Fantasia est une véritable petite enclave italienne au cœur de Marrakech. Loin du tumulte de la médina, cette adresse incontournable attire aussi bien les résidents locaux que les voyageurs en quête de saveurs méditerranéennes authentiques. Dès l'entrée, vous serez séduit par son atmosphère chaleureuse et conviviale, rappelant l'esprit des trattorias traditionnelles où il fait bon se retrouver en famille ou entre amis pour partager un délicieux moment gourmand. La carte de La Fantasia est une véritable déclaration d'amour à la gastronomie italienne.",
    ],
  },
  {
    id: "4d7a576c-0533-401b-bec0-a3dee3d99dc5",
    pretitle: "Gueliz — Marrakech",
    title: "Machawi Lkefta Bsmen — Les meilleurs de kefta bsmen à Marrakech.",
    hours: "Ouvert tous les jours, 12:00-03:00.",
    paragraphs: [
      "À Gueliz, Machawi Lkefta Bsmen se reconnaît à sa signature : « Les meilleurs de kefta bsmen à Marrakech. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Machawi Lkefta Bsmen pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "1f124d51-0378-4da2-92b7-eb9b574f97d1",
    pretitle: "Hivernage — Marrakech",
    title: "Marrakech Prime Burger — 🍔 Premium burgers in Marrakech 🔥 Smash • Loaded • Handmade",
    hours: "Ouvert tous les jours, 12:00-06:00.",
    paragraphs: [
      "À Hivernage, Marrakech Prime Burger se reconnaît à sa signature : « 🍔 Premium burgers in Marrakech 🔥 Smash • Loaded • Handmade ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Marrakech Prime Burger pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "c0231e03-d679-44ec-8543-0f3ae50f011c",
    pretitle: "Medina — Marrakech",
    title: "Medina Burger — Tradition marocaine & innovation occidentale. Une fusion inédite de saveurs avant-gardiste…",
    hours: "Ouvert tous les jours, 12:00-01:00.",
    paragraphs: [
      "À Medina, Medina Burger se reconnaît à sa signature : « Tradition marocaine & innovation occidentale. Une fusion inédite de saveurs avant-gardistes. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "Medina Burger est un restaurant contemporain situé au premier étage du centre commercial Medina Mall à Marrakech. Il propose une fusion de smash burgers américains traditionnels et de créations marocaines innovantes, toutes préparées avec des ingrédients frais et locaux. L'atmosphère dynamique du restaurant est sublimée par des fresques colorées et un décor raffiné, reflétant un mélange de design moderne et d'artisanat marocain. Parmi les spécialités de la carte, on retrouve le burger au poulet tartare et le cheeseburger aux champignons, accompagnés de frites maison croustillantes.",
    ],
  },
  {
    id: "e51c3176-742b-4cf2-a3d6-0d4674f2cf4a",
    pretitle: "Medina — Marrakech",
    title: "Patisserie Corne de Gazelle Chez Brahim — Pâtisserie, Restaurant, Snack et Café.",
    hours: "Ouvert tous les jours, 09:00-22:00.",
    paragraphs: [
      "À Medina, Patisserie Corne de Gazelle Chez Brahim se reconnaît à sa signature : « Pâtisserie, Restaurant, Snack et Café. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Patisserie Corne de Gazelle Chez Brahim pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "0fdd9c35-7782-4604-af8f-12f8ba3825bd",
    pretitle: "Gueliz — Marrakech",
    title: "Pop & Top Carré Eden — Découvrez le plaisir authentique du Bubble Tea et succombez à la délicatesse des Lukumades…",
    hours: "Ouvert tous les jours, 11:00-00:00.",
    paragraphs: [
      "À Gueliz, Pop & Top Carré Eden se reconnaît à sa signature : « Découvrez le plaisir authentique du Bubble Tea et succombez à la délicatesse des Lukumades chez Pop & Top. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "Découvrez le plaisir authentique du Bubble Tea et succombez à la délicatesse des Lukumades chez Pop & Top ! Plongez dans une explosion de saveurs rafraîchissantes et sucrées du Bubble Tea. Trouvez l’équilibre parfait entre thés de qualité et saveurs exquise. Pop & Top est votre destination pour une expérience Bubble Tea gourmande unique à Marrakech, à Bouskoura et à Rabat ! Venez déguster le meilleur Bubble Tea chez Pop & Top, à combiner avec une boite de lukumades gourmands pour une expérience haute en saveurs! Thé au lait Thé aux fruits pétillants Granité glacé 8 nappages de lukumades Plusieurs toppings Plusieurs fourrages",
    ],
  },
  {
    id: "5c9043bc-d30d-4149-85b6-1aa76740e577",
    pretitle: "Gueliz — Marrakech",
    title: "Poulet Braisé Marrakech — 🔥 Le vrai poulet braisé à Marrakech.",
    hours: "Ouvert tous les jours, 07:00-04:00.",
    paragraphs: [
      "À Gueliz, Poulet Braisé Marrakech se reconnaît à sa signature : « 🔥 Le vrai poulet braisé à Marrakech. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "Envie d’un poulet savoureux, tendre et parfaitement braisé ? Poulet Braisé t’ouvre ses portes tous les jours de la semaine, de 7h du matin à 4h du matin, pour satisfaire toutes tes envies, du petit-déj tardif au dîner nocturne ! Ce qui fait la différence : Poulet cuit à la braise, au goût authentique Sauce verte originale venue tout droit de France Carte variée avec plats végétariens Desserts faits maison Cocktails maison rafraîchissants Formule étudiant ultra avantageuse : 6 plats au choix + boisson + accompagnement → 55 dirhams seulemen Une enseigne de référence : 40 restaurants en France Première franchise à l’international Un espace chaleureux et spacieux : Salle conviviale à l’étage 126…",
    ],
  },
  {
    id: "0849f730-c5dd-4ab2-841b-581d9d6a2975",
    pretitle: "Medina — Marrakech",
    title: "Sandwich Chez Hicham — Des sandwichs minute à 15 dirhams, préparés sous nos yeux : viande, légumes et épices maro…",
    hours: "Ouvert tous les jours, 10:00-23:00.",
    paragraphs: [
      "À Medina, Sandwich Chez Hicham se reconnaît à sa signature : « Des sandwichs minute à 15 dirhams, préparés sous nos yeux : viande, légumes et épices marocaines. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Sandwich Chez Hicham pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "e74562e8-5cd9-41f5-9da6-79d7519ae6ee",
    pretitle: "Hay Charaf — Marrakech",
    title: "Shawarma Bashaa Bik — une halte street food à découvrir",
    hours: "Ouvert tous les jours, 12:00-03:00.",
    paragraphs: [
      "À Hay Charaf, Shawarma Bashaa Bik fait partie de ces enseignes qu'on repère vite quand on arpente la ville à la recherche d'un bon plan rapide. Une halte gourmande à intégrer à son parcours street food.",
      "On vient chez Shawarma Bashaa Bik pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "c09903e3-5aed-4202-990a-948cfce37bb9",
    pretitle: "Gueliz — Marrakech",
    title: "Smash Burger — une halte street food à découvrir",
    hours: "Ouvert tous les jours, 12:00-02:00.",
    paragraphs: [
      "À Gueliz, Smash Burger fait partie de ces enseignes qu'on repère vite quand on arpente la ville à la recherche d'un bon plan rapide. Une halte gourmande à intégrer à son parcours street food.",
      "On vient chez Smash Burger pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "e5444237-cfc6-4f98-9967-7f54a557545a",
    pretitle: "Marrakech",
    title: "SMOK’YBILL — Le bonheur ne s'achète pas… dégustez-le chez SMOK’YBILL.",
    hours: "Horaires : lun. Fermé · mar. 18:00-23:00 · mer. 18:00-23:00 · jeu. 18:00-23:00 · ven. 18:00-23:00 · sam. 18:00-23:00 · dim. 18:00-23:00.",
    paragraphs: [
      "Quelque part dans Marrakech, SMOK’YBILL se reconnaît à sa signature : « Le bonheur ne s'achète pas… dégustez-le chez SMOK’YBILL. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez SMOK’YBILL pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "8032edb1-7b40-4643-8bc4-b2f07ca8df4f",
    pretitle: "Medina — Marrakech",
    title: "Snack Jad — une halte street food à découvrir",
    hours: "Ouvert tous les jours, 11:00-23:00.",
    paragraphs: [
      "À Medina, Snack Jad fait partie de ces enseignes qu'on repère vite quand on arpente la ville à la recherche d'un bon plan rapide. Une halte gourmande à intégrer à son parcours street food.",
      "On vient chez Snack Jad pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "5298a5f4-8792-4936-b304-2889e2fc4302",
    pretitle: "Targa — Marrakech",
    title: "Snack Mega Dinde — Restaurant de volaille",
    hours: "Ouvert tous les jours, 12:00-01:00.",
    paragraphs: [
      "À Targa, Snack Mega Dinde se reconnaît à sa signature : « Restaurant de volaille ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "On vient chez Snack Mega Dinde pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "a8705788-43ad-42a3-b2ec-c3dadac93991",
    pretitle: "Medina — Marrakech",
    title: "Snack Toubkal — une halte street food à découvrir",
    hours: "Ouvert tous les jours, 07:00-23:30.",
    paragraphs: [
      "À Medina, Snack Toubkal fait partie de ces enseignes qu'on repère vite quand on arpente la ville à la recherche d'un bon plan rapide. Une halte gourmande à intégrer à son parcours street food.",
      "On vient chez Snack Toubkal pour ce que la street food marocaine sait faire de mieux : un service rapide, une cuisine généreuse, des saveurs marquées. À tester pour comprendre pourquoi le bouche-à-oreille marrakchi cite cette adresse.",
    ],
  },
  {
    id: "b47906fb-2f26-4501-be1a-df212ab6e5d1",
    pretitle: "Gueliz — Marrakech",
    title: "The GoodBun — La promesse d'un burger simple et classique, imaginé et cuisiné avec passion et amour.",
    hours: "Horaires : lun. 12:00-04:00 · mar. 12:00-04:00 · mer. Fermé · jeu. 12:00-04:00 · ven. 12:00-04:00 · sam. 12:00-04:00 · dim. 12:00-04:00.",
    paragraphs: [
      "À Gueliz, The GoodBun se reconnaît à sa signature : « La promesse d'un burger simple et classique, imaginé et cuisiné avec passion et amour. ». Une adresse à glisser dans son carnet d'arpenteur de la street food marrakchie.",
      "THE GOODBUN est la promesse d'un burger simple et classique, imaginé et cuisiné avec passion et amour. Le mot d'ordre est la qualité. La viande est minutieusement sélectionnée, le bun est moelleux à souhait et les frites croquantes à en tomber par terre ! Sans oublier leur délicieuse sauce dont le Chef garde précieusement la recette.",
    ],
  }
];

const StreetFoodMarrakech = () => (
  <BlogArticleTemplate
    entries={STREETFOOD}
    articlePath="/blog/street-food-marrakech"
    articleTitle="Le meilleur de la Street Food à Marrakech"
    articleDescription="Trente-six adresses incontournables pour goûter la street food à Marrakech — du sandwich minute aux burgers gourmets, des kefta bsmen aux glaces maison, du shawarma au rooftop afro-berbère."
    bookmarkSlug="street-food-marrakech"
    heroAlt="Street Food à Marrakech"
    heroTitleTop="Le meilleur de la"
    heroTitleBottom="Street Food à Marrakech"
    heroSubtitle="Trente-six adresses pour arpenter Marrakech la fourchette à la main — du sandwich servi sous vos yeux à 15 dirhams aux burgers premium de l'Hivernage, en passant par les madfouna berbères et les glaces maison de Guéliz."
    intro="Marrakech se mange autant qu'elle se visite. Entre la médina, Guéliz, l'Hivernage et les quartiers populaires, la ville aligne une street food qui ne ressemble à aucune autre : héritière directe de la cuisine berbère et arabe, mais aussi terrain d'expérimentation pour une nouvelle génération de jeunes restaurateurs qui réinventent le burger, le shawarma, la glace ou le bubble tea. Voici notre sélection des trente-six adresses qui racontent — sandwich après sandwich — la vitalité gourmande de la ville ocre."
    datePublished="2026-06-13T10:00:00+01:00"
  />
);

export default StreetFoodMarrakech;
