import { createContext, useContext, useState, ReactNode } from "react";

 type Language = "en" | "fr" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
   isRTL: boolean;
}

const translations = {
  en: {
    // Header
    "nav.services": "Services",
    "nav.jobs": "Jobs",
    "nav.about": "About",
    "nav.contact": "Contact",
    "nav.signIn": "Sign In",
    "nav.joinNow": "Join Now",
    
    // Hero
    "hero.title": "ONE WORLD",
    "hero.titleSuffix": "Morocco",
    "hero.subtitle": "Connecting communities through work & services",
    "hero.searchPlaceholder": "Search for jobs, services, or skills...",
    "hero.searchButton": "Search",
    "hero.scrollText": "Explore Services",
    "hero.tags.artisans": "Artisans",
    "hero.tags.homeServices": "Home Services",
    "hero.tags.teaching": "Teaching",
    "hero.tags.healthcare": "Healthcare",
    "hero.tags.construction": "Construction",
    
    // Services Section
    "services.title": "Explore",
    "services.titleServices": "Services",
    "services.titleAnd": "&",
    "services.titleJobs": "Jobs",
    "services.description": "Browse through categories to find skilled professionals or discover opportunities to share your talents with your community.",
    "services.providers": "providers",
    
    // Service Categories
    "category.construction": "Construction",
    "category.construction.desc": "Builders, masons, and construction workers",
    "category.healthcare": "Healthcare",
    "category.healthcare.desc": "Nurses, caregivers, and health aides",
    "category.education": "Education",
    "category.education.desc": "Tutors, teachers, and mentors",
    "category.artisans": "Artisans",
    "category.artisans.desc": "Traditional crafts and handmade goods",
    "category.repairs": "Repairs",
    "category.repairs.desc": "Plumbing, electrical, and appliances",
    "category.transport": "Transport",
    "category.transport.desc": "Delivery and moving services",
    "category.agriculture": "Agriculture",
    "category.agriculture.desc": "Farming and garden services",
    "category.catering": "Catering",
    "category.catering.desc": "Cooks and food preparation",
    "category.photography": "Photography",
    "category.photography.desc": "Events and portrait photography",
    "category.beauty": "Beauty",
    "category.beauty.desc": "Hair, makeup, and wellness",
    "category.cleaning": "Cleaning",
    "category.cleaning.desc": "Home and office cleaning",
    "category.business": "Business",
    "category.business.desc": "Admin and office support",
    
    // Stats
    "stats.providers": "Service Providers",
    "stats.cities": "Cities Covered",
    "stats.jobs": "Jobs Completed",
    "stats.satisfaction": "Satisfaction Rate",
    
    // Footer
     // Hotel Search
     "hotel.title": "Find",
     "hotel.titleHighlight": "Hotel Booking Links",
     "hotel.description": "Search for any hotel to find booking links across multiple platforms including Booking.com, Expedia, Hotels.com, and more.",
     "hotel.namePlaceholder": "Hotel name (e.g., Four Seasons Marrakech)",
     "hotel.locationPlaceholder": "Location (optional)",
     "hotel.searchButton": "Search Hotels",
     "hotel.error": "Error",
     "hotel.nameRequired": "Please enter a hotel name",
     "hotel.searchFailed": "Failed to search for hotel. Please try again.",
     "hotel.foundOn": "Found on",
     "hotel.platforms": "platforms",
     "hotel.noResults": "No booking links found for this hotel. Try a more specific name or check the spelling.",
 
     // Google Hotel Reviews
     "googleReviews.title": "Discover Hotels with",
     "googleReviews.titleHighlight": "Google Reviews",
     "googleReviews.description": "Search for hotels by location and see authentic Google Reviews to help you make the best choice.",
     "googleReviews.locationLabel": "Location",
     "googleReviews.locationPlaceholder": "e.g., Marrakech, Paris, Bangkok",
     "googleReviews.checkIn": "Check-in",
     "googleReviews.checkOut": "Check-out",
     "googleReviews.adults": "Adults",
     "googleReviews.searchButton": "Search Hotels",
     "googleReviews.error": "Error",
     "googleReviews.locationRequired": "Please enter a location",
     "googleReviews.searchFailed": "Failed to search for hotels. Please try again.",
     "googleReviews.reviewsCount": "reviews",
     "googleReviews.perNight": "night",
     "googleReviews.total": "total",
     "googleReviews.guestReviews": "Guest Reviews",
     "googleReviews.hotelResponse": "Response from hotel:",
     "googleReviews.noResults": "No hotels found for this location. Try a different search.",
 
     // Directory Search
     "directory.title": "WTUCE",
     "directory.titleHighlight": "Business Directory",
     "directory.description": "Find trusted businesses affiliated with the WTUCE charter. Search by service, category or location.",
     "directory.searchPlaceholder": "Search services, categories...",
     "directory.cityPlaceholder": "City (e.g., Marrakech)",
     "directory.searchButton": "Search",
     "directory.error": "Error",
     "directory.searchFailed": "Search failed. Please try again.",
     "directory.resultsFound": "results found",
     "directory.visitWebsite": "Visit website",

     // Footer
    "footer.description": "Empowering Moroccan communities through accessible work opportunities and trusted services.",
    "footer.services": "Services",
    "footer.findServices": "Find Services",
    "footer.postJob": "Post a Job",
    "footer.becomeProvider": "Become a Provider",
    "footer.businessSolutions": "Business Solutions",
    "footer.company": "Liens",
    "footer.aboutUs": "About Us",
    "footer.ourMission": "Our Mission",
    "footer.affiliates": "Affiliates",
    "footer.press": "Press",
    "footer.staff": "Staff",
    "footer.contact": "Contact",
    "footer.location": "Marrakech, Morocco",
    "footer.rights": "All rights reserved.",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms of Service",
    "footer.cookies": "Cookie Policy",
    "footer.blog": "Blog",
    // Blog
    "blog.title": "Blog",
    "blog.subtitle": "News, guides and insights about Morocco",
    "blog.noPosts": "No articles published yet.",
    "blog.notFound": "Article not found.",
    "blog.backToList": "Back to blog",
    "blog.viewOnMap": "View on the map",
    "blog.seo.title": "Blog – Articles & Travel Guides",
    "blog.seo.description": "Articles, guides and insights about Morocco by ONE WORLD MOROCCO.",
    "blog.dynamic": "dynamic",
    "blog.readMore": "Read the article",
    "blog.minRead": "min read",
    "blog.share": "Share",
    "blog.similarArticles": "Similar articles",
    "blog.ourAddresses": "Our addresses to discover",
  },
  fr: {
    // Header
    "nav.services": "Services",
    "nav.jobs": "Emplois",
    "nav.about": "À propos",
    "nav.contact": "Contact",
    "nav.signIn": "Connexion",
    "nav.joinNow": "Ajoutez votre entreprise",
    
    // Hero
    "hero.title": "ONE WORLD",
    "hero.titleSuffix": "Maroc",
    "hero.subtitle": "Connecter les communautés par le travail et les services",
    "hero.searchPlaceholder": "Rechercher des emplois, services ou compétences...",
    "hero.searchButton": "Rechercher",
    "hero.scrollText": "Explorer les services",
    "hero.tags.artisans": "Artisans",
    "hero.tags.homeServices": "Services à domicile",
    "hero.tags.teaching": "Enseignement",
    "hero.tags.healthcare": "Santé",
    "hero.tags.construction": "Construction",
    
    // Services Section
    "services.title": "Explorez",
    "services.titleServices": "Services",
    "services.titleAnd": "&",
    "services.titleJobs": "Emplois",
    "services.description": "Parcourez les catégories pour trouver des professionnels qualifiés ou découvrez des opportunités pour partager vos talents avec votre communauté.",
    "services.providers": "prestataires",
    
    // Service Categories
    "category.construction": "Construction",
    "category.construction.desc": "Maçons, ouvriers et constructeurs",
    "category.healthcare": "Santé",
    "category.healthcare.desc": "Infirmiers, aides-soignants et auxiliaires",
    "category.education": "Éducation",
    "category.education.desc": "Tuteurs, enseignants et mentors",
    "category.artisans": "Artisans",
    "category.artisans.desc": "Artisanat traditionnel et produits faits main",
    "category.repairs": "Réparations",
    "category.repairs.desc": "Plomberie, électricité et appareils",
    "category.transport": "Transport",
    "category.transport.desc": "Livraison et déménagement",
    "category.agriculture": "Agriculture",
    "category.agriculture.desc": "Services agricoles et jardinage",
    "category.catering": "Restauration",
    "category.catering.desc": "Cuisiniers et préparation alimentaire",
    "category.photography": "Photographie",
    "category.photography.desc": "Événements et portraits",
    "category.beauty": "Beauté",
    "category.beauty.desc": "Coiffure, maquillage et bien-être",
    "category.cleaning": "Nettoyage",
    "category.cleaning.desc": "Ménage maison et bureaux",
    "category.business": "Affaires",
    "category.business.desc": "Support administratif et bureau",
    
    // Stats
    "stats.providers": "Prestataires",
    "stats.cities": "Villes couvertes",
    "stats.jobs": "Travaux réalisés",
    "stats.satisfaction": "Taux de satisfaction",
    
    // Footer
     // Hotel Search
     "hotel.title": "Trouvez",
     "hotel.titleHighlight": "Liens de Réservation d'Hôtel",
     "hotel.description": "Recherchez n'importe quel hôtel pour trouver des liens de réservation sur plusieurs plateformes, notamment Booking.com, Expedia, Hotels.com, et plus.",
     "hotel.namePlaceholder": "Nom de l'hôtel (ex: Four Seasons Marrakech)",
     "hotel.locationPlaceholder": "Lieu (optionnel)",
     "hotel.searchButton": "Rechercher",
     "hotel.error": "Erreur",
     "hotel.nameRequired": "Veuillez entrer un nom d'hôtel",
     "hotel.searchFailed": "Échec de la recherche d'hôtel. Veuillez réessayer.",
     "hotel.foundOn": "Trouvé sur",
     "hotel.platforms": "plateformes",
     "hotel.noResults": "Aucun lien de réservation trouvé pour cet hôtel. Essayez un nom plus spécifique ou vérifiez l'orthographe.",
 
     // Google Hotel Reviews
     "googleReviews.title": "Découvrez les hôtels avec",
     "googleReviews.titleHighlight": "les avis Google",
     "googleReviews.description": "Recherchez des hôtels par lieu et consultez les avis Google authentiques pour vous aider à faire le meilleur choix.",
     "googleReviews.locationLabel": "Lieu",
     "googleReviews.locationPlaceholder": "ex: Marrakech, Paris, Bangkok",
     "googleReviews.checkIn": "Arrivée",
     "googleReviews.checkOut": "Départ",
     "googleReviews.adults": "Adultes",
     "googleReviews.searchButton": "Rechercher",
     "googleReviews.error": "Erreur",
     "googleReviews.locationRequired": "Veuillez entrer un lieu",
     "googleReviews.searchFailed": "Échec de la recherche d'hôtels. Veuillez réessayer.",
     "googleReviews.reviewsCount": "avis",
     "googleReviews.perNight": "nuit",
     "googleReviews.total": "total",
     "googleReviews.guestReviews": "Avis des clients",
     "googleReviews.hotelResponse": "Réponse de l'hôtel:",
     "googleReviews.noResults": "Aucun hôtel trouvé pour ce lieu. Essayez une autre recherche.",
 
     // Directory Search
     "directory.title": "Annuaire",
     "directory.titleHighlight": "WTUCE",
     "directory.description": "Trouvez des entreprises de confiance affiliées à la charte WTUCE. Recherchez par service, catégorie ou lieu.",
     "directory.searchPlaceholder": "Rechercher services, catégories...",
     "directory.cityPlaceholder": "Ville (ex: Marrakech)",
     "directory.searchButton": "Rechercher",
     "directory.error": "Erreur",
     "directory.searchFailed": "La recherche a échoué. Veuillez réessayer.",
     "directory.resultsFound": "résultats trouvés",
     "directory.visitWebsite": "Visiter le site",

     // Footer
    "footer.description": "Autonomiser les communautés marocaines grâce à des opportunités de travail accessibles et des services de confiance.",
    "footer.services": "Services",
    "footer.findServices": "Trouver des services",
    "footer.postJob": "Publier une offre",
    "footer.becomeProvider": "Devenir prestataire",
    "footer.businessSolutions": "Solutions entreprises",
    "footer.company": "Liens",
    "footer.aboutUs": "À propos",
    "footer.ourMission": "Notre mission",
    "footer.affiliates": "Affiliés",
    "footer.press": "Presse",
    "footer.staff": "Staff",
    "footer.contact": "Contact",
    "footer.location": "Marrakech, Maroc",
    "footer.rights": "Tous droits réservés.",
    "footer.privacy": "Politique de confidentialité",
    "footer.terms": "Conditions d'utilisation",
    "footer.cookies": "Politique des cookies",
    "footer.blog": "Blog",
    // Blog
    "blog.title": "Blog",
    "blog.subtitle": "Actualités, guides et découvertes sur le Maroc",
    "blog.noPosts": "Aucun article publié pour le moment.",
    "blog.notFound": "Article introuvable.",
    "blog.backToList": "Retour au blog",
    "blog.viewOnMap": "Voir sur la carte",
    "blog.seo.title": "Blog – Actualités et guides",
    "blog.seo.description": "Articles, guides et actualités sur le Maroc par ONE WORLD MOROCCO.",
    "blog.dynamic": "dynamique",
    "blog.readMore": "Lire l'article",
    "blog.minRead": "min de lecture",
    "blog.share": "Partager",
    "blog.similarArticles": "Articles similaires",
    "blog.ourAddresses": "Nos adresses à découvrir",
  },
   ar: {
     // Header
     "nav.services": "الخدمات",
     "nav.jobs": "الوظائف",
     "nav.about": "من نحن",
     "nav.contact": "اتصل بنا",
     "nav.signIn": "تسجيل الدخول",
     "nav.joinNow": "انضم الآن",
     
     // Hero
     "hero.title": "ONE WORLD",
     "hero.titleSuffix": "المغرب",
     "hero.subtitle": "ربط المجتمعات من خلال العمل والخدمات",
     "hero.searchPlaceholder": "ابحث عن وظائف، خدمات، أو مهارات...",
     "hero.searchButton": "بحث",
     "hero.scrollText": "استكشف الخدمات",
     "hero.tags.artisans": "حرفيون",
     "hero.tags.homeServices": "خدمات منزلية",
     "hero.tags.teaching": "تعليم",
     "hero.tags.healthcare": "رعاية صحية",
     "hero.tags.construction": "بناء",
     
     // Services Section
     "services.title": "استكشف",
     "services.titleServices": "الخدمات",
     "services.titleAnd": "و",
     "services.titleJobs": "الوظائف",
     "services.description": "تصفح الفئات للعثور على محترفين مهرة أو اكتشف فرصًا لمشاركة مواهبك مع مجتمعك.",
     "services.providers": "مقدمي الخدمات",
     
     // Service Categories
     "category.construction": "البناء",
     "category.construction.desc": "بناؤون وعمال البناء",
     "category.healthcare": "الرعاية الصحية",
     "category.healthcare.desc": "ممرضون ومقدمو الرعاية",
     "category.education": "التعليم",
     "category.education.desc": "معلمون ومدرسون خصوصيون",
     "category.artisans": "الحرفيون",
     "category.artisans.desc": "الحرف التقليدية والمنتجات اليدوية",
     "category.repairs": "الإصلاحات",
     "category.repairs.desc": "سباكة، كهرباء، وأجهزة",
     "category.transport": "النقل",
     "category.transport.desc": "خدمات التوصيل والنقل",
     "category.agriculture": "الزراعة",
     "category.agriculture.desc": "خدمات الزراعة والحدائق",
     "category.catering": "التموين",
     "category.catering.desc": "طباخون وإعداد الطعام",
     "category.photography": "التصوير",
     "category.photography.desc": "تصوير المناسبات والبورتريه",
     "category.beauty": "الجمال",
     "category.beauty.desc": "تصفيف الشعر والمكياج والعناية",
     "category.cleaning": "التنظيف",
     "category.cleaning.desc": "تنظيف المنازل والمكاتب",
     "category.business": "الأعمال",
     "category.business.desc": "دعم إداري ومكتبي",
     
     // Stats
     "stats.providers": "مقدمو الخدمات",
     "stats.cities": "مدن مغطاة",
     "stats.jobs": "أعمال منجزة",
     "stats.satisfaction": "نسبة الرضا",
     
     // Hotel Search
     "hotel.title": "ابحث عن",
     "hotel.titleHighlight": "روابط حجز الفنادق",
     "hotel.description": "ابحث عن أي فندق للعثور على روابط الحجز عبر منصات متعددة بما في ذلك Booking.com وExpedia وHotels.com والمزيد.",
     "hotel.namePlaceholder": "اسم الفندق (مثال: فور سيزونز مراكش)",
     "hotel.locationPlaceholder": "الموقع (اختياري)",
     "hotel.searchButton": "بحث الفنادق",
     "hotel.error": "خطأ",
     "hotel.nameRequired": "يرجى إدخال اسم الفندق",
     "hotel.searchFailed": "فشل البحث عن الفندق. يرجى المحاولة مرة أخرى.",
     "hotel.foundOn": "موجود على",
     "hotel.platforms": "منصات",
     "hotel.noResults": "لم يتم العثور على روابط حجز لهذا الفندق. جرب اسمًا أكثر تحديدًا أو تحقق من الإملاء.",
 
     // Google Hotel Reviews
     "googleReviews.title": "اكتشف الفنادق مع",
     "googleReviews.titleHighlight": "تقييمات Google",
     "googleReviews.description": "ابحث عن الفنادق حسب الموقع واطلع على تقييمات Google الحقيقية لمساعدتك في اتخاذ أفضل قرار.",
     "googleReviews.locationLabel": "الموقع",
     "googleReviews.locationPlaceholder": "مثال: مراكش، باريس، بانكوك",
     "googleReviews.checkIn": "تسجيل الوصول",
     "googleReviews.checkOut": "تسجيل المغادرة",
     "googleReviews.adults": "البالغون",
     "googleReviews.searchButton": "بحث",
     "googleReviews.error": "خطأ",
     "googleReviews.locationRequired": "يرجى إدخال موقع",
     "googleReviews.searchFailed": "فشل البحث عن الفنادق. يرجى المحاولة مرة أخرى.",
     "googleReviews.reviewsCount": "تقييم",
     "googleReviews.perNight": "ليلة",
     "googleReviews.total": "الإجمالي",
     "googleReviews.guestReviews": "تقييمات الضيوف",
     "googleReviews.hotelResponse": "رد الفندق:",
     "googleReviews.noResults": "لم يتم العثور على فنادق في هذا الموقع. جرب بحثًا مختلفًا.",
 
     // Directory Search
     "directory.title": "دليل",
     "directory.titleHighlight": "WTUCE",
     "directory.description": "ابحث عن الشركات الموثوقة المنتسبة لميثاق WTUCE. ابحث حسب الخدمة أو الفئة أو الموقع.",
     "directory.searchPlaceholder": "ابحث عن خدمات، فئات...",
     "directory.cityPlaceholder": "المدينة (مثال: مراكش)",
     "directory.searchButton": "بحث",
     "directory.error": "خطأ",
     "directory.searchFailed": "فشل البحث. يرجى المحاولة مرة أخرى.",
     "directory.resultsFound": "نتائج موجودة",
     "directory.visitWebsite": "زيارة الموقع",

     // Footer
     "footer.description": "تمكين المجتمعات المغربية من خلال فرص العمل المتاحة والخدمات الموثوقة.",
     "footer.services": "الخدمات",
     "footer.findServices": "البحث عن خدمات",
     "footer.postJob": "نشر وظيفة",
     "footer.becomeProvider": "كن مقدم خدمة",
     "footer.businessSolutions": "حلول الأعمال",
     "footer.company": "Liens",
     "footer.aboutUs": "من نحن",
     "footer.ourMission": "مهمتنا",
     "footer.affiliates": "الشركاء",
     "footer.press": "الصحافة",
     "footer.staff": "الموظفون",
     "footer.contact": "اتصل بنا",
     "footer.location": "الدار البيضاء، المغرب",
     "footer.rights": "جميع الحقوق محفوظة.",
     "footer.privacy": "سياسة الخصوصية",
     "footer.terms": "شروط الخدمة",
     "footer.cookies": "سياسة ملفات تعريف الارتباط",
     "footer.blog": "مدونة",
     // Blog
     "blog.title": "المدونة",
     "blog.subtitle": "أخبار وأدلة واكتشافات عن المغرب",
     "blog.noPosts": "لم يتم نشر أي مقال بعد.",
     "blog.notFound": "المقال غير موجود.",
     "blog.backToList": "العودة إلى المدونة",
     "blog.viewOnMap": "عرض على الخريطة",
     "blog.seo.title": "المدونة – مقالات وأدلة سياحية",
     "blog.seo.description": "مقالات وأدلة واكتشافات عن المغرب بقلم ONE WORLD MOROCCO.",
     "blog.dynamic": "ديناميكي",
     "blog.readMore": "اقرأ المقال",
     "blog.minRead": "دقيقة قراءة",
     "blog.share": "مشاركة",
     "blog.similarArticles": "مقالات مشابهة",
     "blog.ourAddresses": "عناويننا للاكتشاف",
   },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
   const [language, setLanguage] = useState<Language>("fr");

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

   const isRTL = language === "ar";
 
  return (
     <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
